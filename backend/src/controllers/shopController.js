const { pool } = require('../config/db');

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function getShops(req, res) {
  try {
    const date = req.query.date || today();
    const [shops] = await pool.query('SELECT * FROM shops ORDER BY name ASC');
    const [logs] = await pool.query('SELECT * FROM shop_logs WHERE date = ?', [date]);
    const [attendance] = await pool.query(
      `SELECT a.shop_id, u.name AS user_name, a.check_in_at, a.check_out_at
       FROM attendance a JOIN users u ON a.user_id = u.id
       WHERE a.date = ? AND a.check_out_at IS NULL`,
      [date]
    );

    const logMap = {};
    logs.forEach(l => { logMap[l.shop_id] = l; });
    const checkedIn = {};
    attendance.forEach(a => {
      if (!checkedIn[a.shop_id]) checkedIn[a.shop_id] = [];
      checkedIn[a.shop_id].push({ name: a.user_name, since: a.check_in_at });
    });

    const result = shops.map(s => ({
      ...s,
      log: logMap[s.id] || null,
      is_open: logMap[s.id]?.is_open || 0,
      checked_in_staff: checkedIn[s.id] || [],
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function createShop(req, res) {
  const { name, default_open_time, default_close_time } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Name required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO shops (name, default_open_time, default_close_time) VALUES (?, ?, ?)',
      [name.trim(), default_open_time || '09:00', default_close_time || '22:00']
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateShop(req, res) {
  const { name, default_open_time, default_close_time } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Name required' });
  try {
    await pool.query(
      'UPDATE shops SET name = ?, default_open_time = ?, default_close_time = ? WHERE id = ?',
      [name.trim(), default_open_time || '09:00', default_close_time || '22:00', req.params.id]
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function deleteShop(req, res) {
  try {
    await pool.query('DELETE FROM shops WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function overrideShop(req, res) {
  const { is_open, reason } = req.body;
  const date = today();
  const now = new Date().toISOString();
  try {
    await pool.query(
      `INSERT INTO shop_logs (shop_id, date, is_open, opened_at, closed_at, is_manual_override, override_by, override_reason)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(shop_id, date) DO UPDATE SET
         is_open = excluded.is_open,
         opened_at = CASE WHEN excluded.is_open = 1 THEN excluded.opened_at ELSE opened_at END,
         closed_at = CASE WHEN excluded.is_open = 0 THEN excluded.closed_at ELSE closed_at END,
         is_manual_override = 1, override_by = excluded.override_by, override_reason = excluded.override_reason`,
      [req.params.id, date, is_open ? 1 : 0,
       is_open ? now : null, !is_open ? now : null,
       req.user.id, reason || null]
    );
    res.json({ message: 'Shop status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getLogs(req, res) {
  const date = req.query.date || today();
  try {
    const [shops] = await pool.query('SELECT * FROM shops ORDER BY name ASC');
    const [logs] = await pool.query('SELECT sl.*, u.name AS override_by_name FROM shop_logs sl LEFT JOIN users u ON sl.override_by = u.id WHERE sl.date = ?', [date]);
    const [att] = await pool.query(
      `SELECT a.*, u.name AS user_name FROM attendance a JOIN users u ON a.user_id = u.id WHERE a.date = ?`,
      [date]
    );
    const logMap = {};
    logs.forEach(l => { logMap[l.shop_id] = l; });
    const attMap = {};
    att.forEach(a => {
      if (!attMap[a.shop_id]) attMap[a.shop_id] = [];
      attMap[a.shop_id].push(a);
    });
    res.json(shops.map(s => ({ ...s, log: logMap[s.id] || null, attendance: attMap[s.id] || [] })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { getShops, createShop, updateShop, deleteShop, overrideShop, getLogs };
