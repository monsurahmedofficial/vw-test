const { pool } = require('../config/db');

const ALLOWED_KEYS = [
  'stage_1_name', 'stage_2_name', 'stage_3_name',
  'reminder_task_hours_before', 'reminder_stuck_hours',
  'reminder_overdue_interval_hours', 'reminder_announcement_ack_hours',
  'reminder_announcement_repeat_hours',
];

const DEFAULTS = {
  stage_1_name: 'Pending', stage_2_name: 'On-Process', stage_3_name: 'Completed',
  reminder_task_hours_before: '4', reminder_stuck_hours: '3',
  reminder_overdue_interval_hours: '6', reminder_announcement_ack_hours: '2',
  reminder_announcement_repeat_hours: '4',
};

async function getSettings(req, res) {
  try {
    const [rows] = await pool.query('SELECT key, value FROM settings');
    const result = { ...DEFAULTS };
    rows.forEach((r) => { result[r.key] = r.value; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateSettings(req, res) {
  try {
    for (const key of ALLOWED_KEYS) {
      if (req.body[key] !== undefined && String(req.body[key]).trim()) {
        await pool.query('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(req.body[key]).trim()]);
      }
    }
    res.json({ message: 'Settings saved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { getSettings, updateSettings };
