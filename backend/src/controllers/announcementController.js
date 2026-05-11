const { pool } = require('../config/db');

const NOW = process.env.USE_SQLITE === 'true' ? "datetime('now')" : 'NOW()';

async function getAnnouncements(req, res) {
  try {
    const isStaff = req.user.role === 'staff';
    let sql = `
      SELECT a.*, u.name AS author_name,
        (SELECT COUNT(*) FROM announcement_acknowledgements aa WHERE aa.announcement_id = a.id) AS ack_count,
        (SELECT COUNT(*) FROM users WHERE role = 'staff' AND is_active = 1) AS staff_count,
        (SELECT acknowledged_at FROM announcement_acknowledgements aa WHERE aa.announcement_id = a.id AND aa.user_id = ?) AS my_ack
      FROM announcements a
      JOIN users u ON a.created_by = u.id
      WHERE (a.expires_at IS NULL OR a.expires_at > ${NOW})
      ORDER BY a.created_at DESC
    `;
    const [rows] = await pool.query(sql, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function createAnnouncement(req, res) {
  const { title, body, expires_at, requires_ack } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: 'Title required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO announcements (title, body, created_by, expires_at, requires_ack) VALUES (?, ?, ?, ?, ?)',
      [title.trim(), body || null, req.user.id, expires_at || null, requires_ack !== false ? 1 : 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateAnnouncement(req, res) {
  const { title, body, expires_at, requires_ack } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: 'Title required' });
  try {
    await pool.query(
      'UPDATE announcements SET title = ?, body = ?, expires_at = ?, requires_ack = ? WHERE id = ?',
      [title.trim(), body || null, expires_at || null, requires_ack !== false ? 1 : 0, req.params.id]
    );
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function deleteAnnouncement(req, res) {
  try {
    await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function acknowledge(req, res) {
  try {
    await pool.query(
      'INSERT OR IGNORE INTO announcement_acknowledgements (announcement_id, user_id) VALUES (?, ?)',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Acknowledged' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function getAckStatus(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.role, aa.acknowledged_at
       FROM users u
       LEFT JOIN announcement_acknowledgements aa ON aa.user_id = u.id AND aa.announcement_id = ?
       WHERE u.role = 'staff' AND u.is_active = 1
       ORDER BY u.name ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, acknowledge, getAckStatus };
