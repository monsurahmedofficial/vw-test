const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function listUsers(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, mobile, email, role, is_active, created_at FROM users ORDER BY role, name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function createUser(req, res) {
  const { name, mobile, email, password, role } = req.body;
  if (!name || !mobile || !password) {
    return res.status(400).json({ message: 'Name, mobile, and password required' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, mobile, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [name, mobile, email || null, hash, role || 'staff']
    );
    res.status(201).json({ id: result.insertId, message: 'User created' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Mobile number already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { name, email, role, is_active, password } = req.body;
  try {
    const updates = [];
    const vals = [];
    if (name) { updates.push('name = ?'); vals.push(name); }
    if (email !== undefined) { updates.push('email = ?'); vals.push(email); }
    if (role) { updates.push('role = ?'); vals.push(role); }
    if (is_active !== undefined) { updates.push('is_active = ?'); vals.push(is_active); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      vals.push(hash);
    }
    if (!updates.length) return res.status(400).json({ message: 'Nothing to update' });
    vals.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, vals);
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function getUserStats(req, res) {
  const { id } = req.params;
  const isSQLite = process.env.USE_SQLITE === 'true';
  const NOW = isSQLite ? "datetime('now')" : 'NOW()';
  try {
    const [stats] = await pool.query(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status != 'done' AND deadline < ${NOW} THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN status NOT IN ('done') AND deadline >= ${NOW} THEN 1 ELSE 0 END) AS pending
       FROM tasks WHERE assigned_to = ?`,
      [id]
    );
    res.json(stats[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { listUsers, createUser, updateUser, getUserStats };
