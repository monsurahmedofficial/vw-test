const cron = require('node-cron');
const { pool } = require('../config/db');
const emailService = require('./emailService');

const isSQLite = process.env.USE_SQLITE === 'true';
const isPostgres = !isSQLite && !!process.env.DATABASE_URL;
const NOW = isSQLite ? "datetime('now')" : 'NOW()';
const addHours = (h) => isSQLite
  ? `datetime('now', '+${h} hours')`
  : isPostgres
    ? `NOW() + INTERVAL '${h} hours'`
    : `DATE_ADD(NOW(), INTERVAL ${h} HOUR)`;
const subHours = (h) => isSQLite
  ? `datetime('now', '-${h} hours')`
  : isPostgres
    ? `NOW() - INTERVAL '${h} hours'`
    : `DATE_SUB(NOW(), INTERVAL ${h} HOUR)`;

async function getRules() {
  const [rows] = await pool.query('SELECT key, value FROM settings');
  const map = {};
  rows.forEach(r => { map[r.key] = r.value; });
  return {
    taskHoursBefore: parseFloat(map.reminder_task_hours_before || '4'),
    stuckHours: parseFloat(map.reminder_stuck_hours || '3'),
    overdueIntervalHours: parseFloat(map.reminder_overdue_interval_hours || '6'),
    ackHours: parseFloat(map.reminder_announcement_ack_hours || '2'),
    ackRepeatHours: parseFloat(map.reminder_announcement_repeat_hours || '4'),
  };
}

function startReminderCron() {
  cron.schedule('0 * * * *', async () => {
    console.log('🔔 Running reminder check...');
    try {
      const rules = await getRules();

      // Task reminders — approaching deadline
      const [notStarted] = await pool.query(`
        SELECT t.id, t.title, t.deadline, t.reminder_count, u.email, u.name
        FROM tasks t JOIN users u ON t.assigned_to = u.id
        WHERE t.status = 'todo'
          AND t.deadline IS NOT NULL
          AND t.deadline > ${NOW}
          AND t.deadline <= ${addHours(rules.taskHoursBefore)}
          AND (t.last_reminder_at IS NULL OR t.last_reminder_at < ${subHours(2)})
          AND u.email IS NOT NULL
      `);
      for (const task of notStarted) {
        await emailService.sendReminder(task.email, task.name, task.title, 'todo', task.deadline);
        await pool.query(`UPDATE tasks SET reminder_count = reminder_count + 1, last_reminder_at = ${NOW} WHERE id = ?`, [task.id]);
      }

      // Stuck tasks
      const [stuck] = await pool.query(`
        SELECT t.id, t.title, t.deadline, t.updated_at, u.email, u.name
        FROM tasks t JOIN users u ON t.assigned_to = u.id
        WHERE t.status = 'doing'
          AND t.updated_at < ${subHours(rules.stuckHours)}
          AND (t.last_reminder_at IS NULL OR t.last_reminder_at < ${subHours(rules.stuckHours)})
          AND u.email IS NOT NULL
      `);
      for (const task of stuck) {
        await emailService.sendReminder(task.email, task.name, task.title, 'doing', task.deadline);
        await pool.query(`UPDATE tasks SET reminder_count = reminder_count + 1, last_reminder_at = ${NOW} WHERE id = ?`, [task.id]);
      }

      // Overdue tasks
      const [overdue] = await pool.query(`
        SELECT t.id, t.title, t.deadline, u.email, u.name
        FROM tasks t JOIN users u ON t.assigned_to = u.id
        WHERE t.status NOT IN ('done')
          AND t.deadline IS NOT NULL
          AND t.deadline < ${NOW}
          AND (t.last_reminder_at IS NULL OR t.last_reminder_at < ${subHours(rules.overdueIntervalHours)})
          AND u.email IS NOT NULL
      `);
      for (const task of overdue) {
        await emailService.sendOverdueAlert(task.email, task.name, task.title, task.deadline);
        await pool.query(`UPDATE tasks SET reminder_count = reminder_count + 1, last_reminder_at = ${NOW} WHERE id = ?`, [task.id]);
      }

      // Announcement acknowledgement reminders
      const [unacked] = await pool.query(`
        SELECT a.id AS ann_id, a.title, u.id AS user_id, u.email, u.name
        FROM announcements a
        JOIN users u ON u.role = 'staff' AND u.is_active = 1
        LEFT JOIN announcement_acknowledgements aa ON aa.announcement_id = a.id AND aa.user_id = u.id
        WHERE a.requires_ack = 1
          AND (a.expires_at IS NULL OR a.expires_at > ${NOW})
          AND aa.id IS NULL
          AND a.created_at < ${subHours(rules.ackHours)}
          AND u.email IS NOT NULL
      `);
      for (const item of unacked) {
        try {
          await emailService.sendAnnouncementReminder(item.email, item.name, item.title);
        } catch {}
      }

      const total = notStarted.length + stuck.length + overdue.length + unacked.length;
      if (total > 0) console.log(`📧 Sent ${total} reminder(s)`);
    } catch (err) {
      console.error('Reminder cron error:', err.message);
    }
  });
  console.log('⏰ Reminder service started');
}

module.exports = { startReminderCron };
