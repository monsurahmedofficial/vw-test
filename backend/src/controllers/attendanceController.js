const { pool } = require('../config/db');

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function getTodayStatus(req, res) {
  const date = today();
  try {
    const [rows] = await pool.query(
      'SELECT a.*, s.name AS shop_name FROM attendance a JOIN shops s ON a.shop_id = s.id WHERE a.user_id = ? AND a.date = ?',
      [req.user.id, date]
    );
    // Return active check-in (no checkout yet) or last record
    const active = rows.find(r => !r.check_out_at) || rows[rows.length - 1] || null;
    res.json({ record: active, date });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function checkIn(req, res) {
  const { shop_id, open_shop } = req.body;
  if (!shop_id) return res.status(400).json({ message: 'Shop required' });
  const date = today();
  const now = new Date().toISOString();
  try {
    // Only one active check-in at a time
    const [existing] = await pool.query(
      'SELECT id FROM attendance WHERE user_id = ? AND date = ? AND check_out_at IS NULL',
      [req.user.id, date]
    );
    if (existing.length > 0) return res.status(400).json({ message: 'Already checked in' });

    // Check if user has a roster assignment for today → auto open shop
    const [rosterRows] = await pool.query(
      'SELECT * FROM rosters WHERE user_id = ? AND date = ? AND shop_id = ?',
      [req.user.id, date, shop_id]
    );
    const hasRosterForShop = rosterRows.length > 0;

    // Auto open shop if rostered for this shop, or if explicitly requested
    const shouldOpenShop = open_shop || hasRosterForShop;

    const [result] = await pool.query(
      'INSERT INTO attendance (user_id, shop_id, date, check_in_at, opened_shop) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, shop_id, date, now, shouldOpenShop ? 1 : 0]
    );

    if (shouldOpenShop) {
      await pool.query(
        `INSERT INTO shop_logs (shop_id, date, is_open, opened_at) VALUES (?, ?, 1, ?)
         ON CONFLICT(shop_id, date) DO UPDATE SET is_open = 1, opened_at = excluded.opened_at`,
        [shop_id, date, now]
      );
    }

    res.status(201).json({
      id: result.insertId,
      message: 'Checked in',
      roster_matched: hasRosterForShop,
      shop_opened: shouldOpenShop
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function checkOut(req, res) {
  const { close_shop } = req.body;
  const date = today();
  const now = new Date().toISOString();
  try {
    const [rows] = await pool.query(
      'SELECT * FROM attendance WHERE user_id = ? AND date = ? AND check_out_at IS NULL',
      [req.user.id, date]
    );
    if (!rows.length) return res.status(400).json({ message: 'No active check-in' });

    const record = rows[0];
    await pool.query(
      'UPDATE attendance SET check_out_at = ?, closed_shop = ? WHERE id = ?',
      [now, close_shop ? 1 : 0, record.id]
    );

    if (close_shop) {
      await pool.query(
        `INSERT INTO shop_logs (shop_id, date, is_open, closed_at) VALUES (?, ?, 0, ?)
         ON CONFLICT(shop_id, date) DO UPDATE SET is_open = 0, closed_at = excluded.closed_at`,
        [record.shop_id, date, now]
      );
    }

    res.json({ message: 'Checked out' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function getAttendanceBoard(req, res) {
  const date = req.query.date || today();
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.name AS user_name, u.role, s.name AS shop_name
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       JOIN shops s ON a.shop_id = s.id
       WHERE a.date = ?
       ORDER BY a.check_in_at ASC`,
      [date]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { getTodayStatus, checkIn, checkOut, getAttendanceBoard };
