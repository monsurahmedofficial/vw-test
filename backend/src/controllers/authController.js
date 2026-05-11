const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { ensureRolesSchema } = require('./roleController');

async function getRolePermissions(role) {
  try {
    await ensureRolesSchema();
    const [rows] = await pool.query('SELECT permissions FROM roles WHERE key = ?', [role]);
    if (!rows.length) return {};
    return JSON.parse(rows[0].permissions || '{}');
  } catch {
    return {};
  }
}

async function login(req, res) {
  const { mobile, password } = req.body;
  if (!mobile || !password) {
    return res.status(400).json({ message: 'Mobile and password required' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE mobile = ? AND is_active = 1',
      [mobile]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const permissions = await getRolePermissions(user.role);
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, permissions },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user.id, name: user.name, mobile: user.mobile, role: user.role, email: user.email, permissions },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function me(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, mobile, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    const user = rows[0];
    res.json({ ...user, permissions: await getRolePermissions(user.role) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function changePassword(req, res) {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password || new_password.length < 6) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  try {
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!(await bcrypt.compare(current_password, rows[0].password_hash))) {
      return res.status(401).json({ message: 'Current password incorrect' });
    }
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { login, me, changePassword };
