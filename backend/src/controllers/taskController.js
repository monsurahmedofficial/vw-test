const { pool } = require('../config/db');
const emailService = require('../services/emailService');
const { uploadFile } = require('../services/storageService');

const isSQLite = process.env.USE_SQLITE === 'true';
const NOW = isSQLite ? "datetime('now')" : 'NOW()';
// SQLite doesn't support SUM(bool_expr); use SUM(CASE WHEN ... THEN 1 ELSE 0 END)
function sumIf(expr) {
  return `SUM(CASE WHEN ${expr} THEN 1 ELSE 0 END)`;
}

const VALID_STATUSES = ['todo', 'doing', 'done'];

function getNextRepeatDeadline(repeatDays) {
  if (!repeatDays) return null;
  const days = repeatDays.split(',').map(Number).filter(n => !isNaN(n));
  if (!days.length) return null;
  const now = new Date();
  for (let i = 1; i <= 7; i++) {
    const next = new Date(now);
    next.setDate(now.getDate() + i);
    if (days.includes(next.getDay())) {
      next.setHours(9, 0, 0, 0);
      return next.toISOString().slice(0, 19).replace('T', ' ');
    }
  }
  return null;
}

async function getTasks(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    const { status, assigned_to } = req.query;

    let sql = `
      SELECT t.*,
        u1.name AS assignee_name, u1.mobile AS assignee_mobile,
        u2.name AS assigner_name,
        tt.name AS template_name,
        (SELECT image_path FROM task_updates tu WHERE tu.task_id = t.id AND tu.image_path IS NOT NULL ORDER BY tu.created_at DESC LIMIT 1) AS latest_proof
      FROM tasks t
      JOIN users u1 ON t.assigned_to = u1.id
      JOIN users u2 ON t.assigned_by = u2.id
      LEFT JOIN task_templates tt ON t.template_id = tt.id
      WHERE 1=1
    `;
    const params = [];

    if (!isAdmin) {
      sql += ' AND t.assigned_to = ?';
      params.push(req.user.id);
    } else if (assigned_to) {
      sql += ' AND t.assigned_to = ?';
      params.push(assigned_to);
    }

    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY t.deadline ASC, t.created_at DESC';

    const [tasks] = await pool.query(sql, params);
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getTask(req, res) {
  try {
    const [tasks] = await pool.query(
      `SELECT t.*,
        u1.name AS assignee_name, u1.mobile AS assignee_mobile, u1.email AS assignee_email,
        u2.name AS assigner_name,
        tt.name AS template_name
       FROM tasks t
       JOIN users u1 ON t.assigned_to = u1.id
       JOIN users u2 ON t.assigned_by = u2.id
       LEFT JOIN task_templates tt ON t.template_id = tt.id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (!tasks[0]) return res.status(404).json({ message: 'Task not found' });

    const task = tasks[0];
    if (req.user.role !== 'admin' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [updates] = await pool.query(
      `SELECT tu.*, u.name AS user_name FROM task_updates tu
       JOIN users u ON tu.user_id = u.id
       WHERE tu.task_id = ? ORDER BY tu.created_at ASC`,
      [req.params.id]
    );

    res.json({ ...task, updates });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function createTask(req, res) {
  const { title, description, template_id, assigned_to, deadline, proof_required, category, is_repeat, repeat_days } = req.body;
  if (!title || !assigned_to) {
    return res.status(400).json({ message: 'Title and assignee required' });
  }
  if (is_repeat && (!repeat_days || repeat_days.trim() === '')) {
    return res.status(400).json({ message: 'Select at least one repeat day' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO tasks (title, description, template_id, assigned_to, assigned_by, deadline, proof_required, category, is_repeat, repeat_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || null, template_id || null, assigned_to, req.user.id,
       deadline || null, proof_required ? 1 : 0, category || null, is_repeat ? 1 : 0, is_repeat ? repeat_days : null]
    );

    await pool.query(
      `INSERT INTO task_updates (task_id, user_id, note, new_status) VALUES (?, ?, ?, 'todo')`,
      [result.insertId, req.user.id, 'Task created']
    );

    const [userRows] = await pool.query('SELECT name, email FROM users WHERE id = ?', [assigned_to]);
    const assignee = userRows[0];
    if (assignee?.email) {
      emailService.sendTaskAssigned(assignee.email, assignee.name, title, deadline).catch(console.error);
    }

    res.status(201).json({ id: result.insertId, message: 'Task created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateTaskStatus(req, res) {
  const { id } = req.params;
  const { status, note } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const [tasks] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    const task = tasks[0];
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role !== 'admin' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (task.proof_required && status === 'done' && !req.file) {
      return res.status(400).json({ message: 'Proof photo required to complete this task' });
    }

    const imagePath = req.file ? await uploadFile(req.file) : null;

    await pool.query('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);
    await pool.query(
      `INSERT INTO task_updates (task_id, user_id, note, image_path, old_status, new_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, note || null, imagePath, task.status, status]
    );

    // Auto-spawn next instance for repeat tasks
    if (status === 'done' && task.is_repeat && task.repeat_days) {
      const nextDeadline = getNextRepeatDeadline(task.repeat_days);
      const [newTask] = await pool.query(
        `INSERT INTO tasks (title, description, assigned_to, assigned_by, deadline, proof_required, category, is_repeat, repeat_days)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [task.title, task.description || null, task.assigned_to, task.assigned_by,
         nextDeadline, task.proof_required, task.category || null, task.repeat_days]
      );
      await pool.query(
        `INSERT INTO task_updates (task_id, user_id, note, new_status) VALUES (?, ?, ?, 'todo')`,
        [newTask.insertId, req.user.id, 'Auto-created from repeat task']
      );
    }

    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function addUpdate(req, res) {
  const { id } = req.params;
  const { note } = req.body;

  try {
    const [tasks] = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);
    const task = tasks[0];
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role !== 'admin' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const imagePath = req.file ? await uploadFile(req.file) : null;

    if (!note && !imagePath) {
      return res.status(400).json({ message: 'Note or image required' });
    }

    await pool.query(
      `INSERT INTO task_updates (task_id, user_id, note, image_path, old_status, new_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, note || null, imagePath, task.status, task.status]
    );

    res.json({ message: 'Update added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function deleteTask(req, res) {
  try {
    await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function getDashboardStats(req, res) {
  try {
    const [overall] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        ${sumIf("status = 'todo'")} AS todo,
        ${sumIf("status = 'doing'")} AS doing,
        ${sumIf("status = 'done'")} AS done,
        ${sumIf(`status != 'done' AND deadline IS NOT NULL AND deadline < ${NOW}`)} AS overdue
      FROM tasks
    `);

    const [byStaff] = await pool.query(`
      SELECT u.id, u.name,
        COUNT(t.id) AS total,
        ${sumIf("t.status = 'done'")} AS completed,
        ${sumIf(`t.status != 'done' AND t.deadline IS NOT NULL AND t.deadline < ${NOW}`)} AS overdue
      FROM users u
      LEFT JOIN tasks t ON t.assigned_to = u.id
      WHERE u.role = 'staff'
      GROUP BY u.id, u.name
      ORDER BY completed DESC
    `);

    const [recent] = await pool.query(`
      SELECT t.id, t.title, t.status, t.deadline,
        u.name AS assignee_name
      FROM tasks t
      JOIN users u ON t.assigned_to = u.id
      ORDER BY t.updated_at DESC LIMIT 10
    `);

    const [activeTasks] = await pool.query(`
      SELECT t.id, t.title, t.status, t.deadline, t.category,
        u.name AS assignee_name,
        CASE
          WHEN t.deadline IS NOT NULL AND t.deadline < ${NOW} THEN 1
          ELSE 0
        END AS is_overdue
      FROM tasks t
      JOIN users u ON t.assigned_to = u.id
      WHERE t.status != 'done'
      ORDER BY is_overdue DESC, t.deadline ASC NULLS LAST
      LIMIT 50
    `);

    res.json({ overall: overall[0], byStaff, recent, activeTasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { getTasks, getTask, createTask, updateTaskStatus, addUpdate, deleteTask, getDashboardStats };
