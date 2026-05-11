const { pool } = require('../config/db');

async function listTemplates(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, u.name AS created_by_name
       FROM task_templates t
       LEFT JOIN users u ON t.created_by = u.id
       ORDER BY t.name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function createTemplate(req, res) {
  const { name, description, proof_required, default_deadline_hours } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });
  try {
    const [result] = await pool.query(
      `INSERT INTO task_templates (name, description, proof_required, default_deadline_hours, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [name, description || null, proof_required ? 1 : 0, default_deadline_hours || 24, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Template created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateTemplate(req, res) {
  const { id } = req.params;
  const { name, description, proof_required, default_deadline_hours } = req.body;
  try {
    await pool.query(
      `UPDATE task_templates SET name = ?, description = ?, proof_required = ?, default_deadline_hours = ? WHERE id = ?`,
      [name, description || null, proof_required ? 1 : 0, default_deadline_hours || 24, id]
    );
    res.json({ message: 'Template updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function deleteTemplate(req, res) {
  try {
    await pool.query('DELETE FROM task_templates WHERE id = ?', [req.params.id]);
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { listTemplates, createTemplate, updateTemplate, deleteTemplate };
