const { pool } = require('../config/db');

function toDateString(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function dateFromString(dateStr) {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(dateStr, days) {
  const date = dateFromString(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString(date);
}

function datesBetween(start, endExclusive) {
  const dates = [];
  for (let date = start; date < endExclusive; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

function weekdayOf(dateStr) {
  return dateFromString(dateStr).getUTCDay();
}

async function ensureRosterSchema() {
  try {
    await pool.query("ALTER TABLE rosters ADD COLUMN source TEXT DEFAULT 'manual'");
  } catch {
    try { await pool.query("ALTER TABLE rosters ADD COLUMN source VARCHAR(20) DEFAULT 'manual'"); } catch {}
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roster_default_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        weekday INTEGER NOT NULL,
        shop_id INTEGER NOT NULL,
        shift_start TEXT DEFAULT '09:00',
        shift_end TEXT DEFAULT '22:00',
        is_active INTEGER DEFAULT 1,
        created_by INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, weekday)
      )
    `);
  } catch {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS roster_default_patterns (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          weekday TINYINT NOT NULL,
          shop_id INT NOT NULL,
          shift_start TIME DEFAULT '09:00',
          shift_end TIME DEFAULT '22:00',
          is_active BOOLEAN DEFAULT TRUE,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_weekday (user_id, weekday)
        )
      `);
    } catch {}
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roster_default_skips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        created_by INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, date)
      )
    `);
  } catch {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS roster_default_skips (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          date DATE NOT NULL,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_skip_date (user_id, date)
        )
      `);
    } catch {}
  }
}

async function applyDefaultsForRange(startDate, endDateExclusive, createdBy) {
  await ensureRosterSchema();
  const [patterns] = await pool.query(
    `SELECT p.*, s.default_open_time, s.default_close_time
     FROM roster_default_patterns p
     JOIN users u ON p.user_id = u.id
     JOIN shops s ON p.shop_id = s.id
     WHERE p.is_active = 1 AND u.is_active = 1`
  );

  for (const date of datesBetween(startDate, endDateExclusive)) {
    const weekday = weekdayOf(date);
    const matches = patterns.filter((pattern) => Number(pattern.weekday) === weekday);
    for (const pattern of matches) {
      const [skips] = await pool.query(
        'SELECT id FROM roster_default_skips WHERE user_id = ? AND date = ?',
        [pattern.user_id, date]
      );
      if (skips.length > 0) continue;

      const [existing] = await pool.query(
        'SELECT id, source FROM rosters WHERE user_id = ? AND date = ?',
        [pattern.user_id, date]
      );
      if (existing.length > 0 && existing[0].source !== 'default') continue;

      if (existing.length > 0) {
        await pool.query(
          'UPDATE rosters SET shop_id=?, shift_start=?, shift_end=?, notes=?, updated_at=? WHERE id=?',
          [
            pattern.shop_id,
            pattern.shift_start || pattern.default_open_time || '09:00',
            pattern.shift_end || pattern.default_close_time || '22:00',
            'Default roster pattern',
            new Date().toISOString(),
            existing[0].id,
          ]
        );
        continue;
      }

      await pool.query(
        'INSERT INTO rosters (user_id, shop_id, date, shift_start, shift_end, notes, source, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          pattern.user_id,
          pattern.shop_id,
          date,
          pattern.shift_start || pattern.default_open_time || '09:00',
          pattern.shift_end || pattern.default_close_time || '22:00',
          'Default roster pattern',
          'default',
          createdBy || pattern.created_by || null,
        ]
      );
    }
  }
}

// GET /api/rosters?week_start=YYYY-MM-DD or ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
async function getRosters(req, res) {
  const { week_start, start_date, end_date, shop_id, user_id } = req.query;
  try {
    const rangeStart = start_date || week_start;
    const rangeEnd = end_date || (week_start ? addDays(week_start, 7) : null);

    if (rangeStart && rangeEnd) {
      await applyDefaultsForRange(rangeStart, rangeEnd, req.user.id);
    } else {
      await ensureRosterSchema();
    }

    let sql = `
      SELECT r.*, u.name AS user_name, u.role AS user_role, s.name AS shop_name
      FROM rosters r
      JOIN users u ON r.user_id = u.id
      JOIN shops s ON r.shop_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (rangeStart && rangeEnd) {
      // Calculate week end in UTC calendar days so timezone does not shift dates.
      sql += ' AND r.date >= ? AND r.date < ?';
      params.push(rangeStart, rangeEnd);
    }
    if (shop_id) { sql += ' AND r.shop_id = ?'; params.push(shop_id); }
    if (user_id) { sql += ' AND r.user_id = ?'; params.push(user_id); }
    sql += ' ORDER BY r.date ASC, r.shift_start ASC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/rosters/today - for a specific user's today assignment
async function getTodayRoster(req, res) {
  const date = new Date().toISOString().slice(0, 10);
  try {
    await applyDefaultsForRange(date, addDays(date, 1), req.user.id);
    const [rows] = await pool.query(
      `SELECT r.*, s.name AS shop_name
       FROM rosters r JOIN shops s ON r.shop_id = s.id
       WHERE r.user_id = ? AND r.date = ?
       LIMIT 1`,
      [req.user.id, date]
    );
    res.json({ roster: rows[0] || null, date });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// POST /api/rosters
async function createRoster(req, res) {
  const { user_id, shop_id, date, shift_start, shift_end, notes } = req.body;
  if (!user_id || !shop_id || !date) {
    return res.status(400).json({ message: 'user_id, shop_id, and date are required' });
  }
  try {
    await ensureRosterSchema();
    // Auto-pull shift times from shop defaults if not provided
    let start = shift_start, end = shift_end;
    if (!start || !end) {
      const [shopRows] = await pool.query(
        'SELECT default_open_time, default_close_time FROM shops WHERE id = ?', [shop_id]
      );
      if (shopRows.length) {
        start = start || shopRows[0].default_open_time;
        end   = end   || shopRows[0].default_close_time;
      }
    }

    // Upsert: one entry per user per date (replace if exists)
    const [existing] = await pool.query(
      'SELECT id FROM rosters WHERE user_id = ? AND date = ?',
      [user_id, date]
    );
    await pool.query('DELETE FROM roster_default_skips WHERE user_id = ? AND date = ?', [user_id, date]);

    if (existing.length > 0) {
      const now = new Date().toISOString();
      await pool.query(
        'UPDATE rosters SET shop_id=?, shift_start=?, shift_end=?, notes=?, source=?, updated_at=? WHERE user_id=? AND date=?',
        [shop_id, start, end, notes || null, 'manual', now, user_id, date]
      );
      return res.json({ message: 'Roster updated', id: existing[0].id });
    }
    const [result] = await pool.query(
      'INSERT INTO rosters (user_id, shop_id, date, shift_start, shift_end, notes, source, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, shop_id, date, start, end, notes || null, 'manual', req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Roster created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/rosters/defaults?user_id=
async function getDefaults(req, res) {
  const { user_id } = req.query;
  try {
    await ensureRosterSchema();
    let sql = `
      SELECT p.*, u.name AS user_name, s.name AS shop_name
      FROM roster_default_patterns p
      JOIN users u ON p.user_id = u.id
      JOIN shops s ON p.shop_id = s.id
      WHERE p.is_active = 1
    `;
    const params = [];
    if (user_id) { sql += ' AND p.user_id = ?'; params.push(user_id); }
    sql += ' ORDER BY p.user_id ASC, p.weekday ASC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// POST /api/rosters/defaults
async function saveDefaultPattern(req, res) {
  const { user_id, shop_id, weekdays, shift_start, shift_end, apply_start, apply_end } = req.body;
  if (!user_id || !shop_id || !Array.isArray(weekdays) || weekdays.length === 0) {
    return res.status(400).json({ message: 'user_id, shop_id, and weekdays are required' });
  }

  const normalizedWeekdays = [...new Set(weekdays.map(Number))]
    .filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6);
  if (normalizedWeekdays.length === 0) {
    return res.status(400).json({ message: 'Select at least one valid weekday' });
  }

  try {
    await ensureRosterSchema();

    let start = shift_start, end = shift_end;
    if (!start || !end) {
      const [shopRows] = await pool.query(
        'SELECT default_open_time, default_close_time FROM shops WHERE id = ?', [shop_id]
      );
      if (shopRows.length) {
        start = start || shopRows[0].default_open_time || '09:00';
        end = end || shopRows[0].default_close_time || '22:00';
      }
    }

    for (const weekday of normalizedWeekdays) {
      const [existing] = await pool.query(
        'SELECT id FROM roster_default_patterns WHERE user_id = ? AND weekday = ?',
        [user_id, weekday]
      );
      if (existing.length > 0) {
        await pool.query(
          'UPDATE roster_default_patterns SET shop_id=?, shift_start=?, shift_end=?, is_active=1, updated_at=? WHERE user_id=? AND weekday=?',
          [shop_id, start, end, new Date().toISOString(), user_id, weekday]
        );
      } else {
        await pool.query(
          'INSERT INTO roster_default_patterns (user_id, weekday, shop_id, shift_start, shift_end, created_by) VALUES (?, ?, ?, ?, ?, ?)',
          [user_id, weekday, shop_id, start, end, req.user.id]
        );
      }
    }

    if (apply_start && apply_end) {
      for (const date of datesBetween(apply_start, apply_end)) {
        if (!normalizedWeekdays.includes(weekdayOf(date))) continue;
        await pool.query('DELETE FROM roster_default_skips WHERE user_id = ? AND date = ?', [user_id, date]);
      }
      await applyDefaultsForRange(apply_start, apply_end, req.user.id);
    }

    res.status(201).json({ message: 'Default roster saved', weekdays: normalizedWeekdays });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// DELETE /api/rosters/defaults?user_id=&weekday=&shop_id=
async function deleteDefaultPattern(req, res) {
  const { user_id, weekday, shop_id } = req.query;
  if (!user_id) return res.status(400).json({ message: 'user_id is required' });

  const params = [user_id];
  let where = 'user_id = ?';
  if (weekday !== undefined) { where += ' AND weekday = ?'; params.push(weekday); }
  if (shop_id !== undefined) { where += ' AND shop_id = ?'; params.push(shop_id); }

  try {
    await ensureRosterSchema();
    const [patterns] = await pool.query(
      `SELECT weekday, shop_id FROM roster_default_patterns WHERE ${where}`,
      params
    );

    await pool.query(`DELETE FROM roster_default_patterns WHERE ${where}`, params);
    await pool.query('DELETE FROM roster_default_skips WHERE user_id = ?', [user_id]);

    let rosterWhere = 'user_id = ?';
    const rosterParams = [user_id];
    if (shop_id !== undefined) { rosterWhere += ' AND shop_id = ?'; rosterParams.push(shop_id); }

    const [defaultRows] = await pool.query(`SELECT id, date, shop_id FROM rosters WHERE ${rosterWhere}`, rosterParams);
    for (const row of defaultRows) {
      if (weekday !== undefined && weekdayOf(row.date) !== Number(weekday)) continue;
      await pool.query('DELETE FROM rosters WHERE id = ?', [row.id]);
    }

    res.json({ message: 'Default roster removed', removed_patterns: patterns.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// DELETE /api/rosters/:id
async function deleteRoster(req, res) {
  try {
    await ensureRosterSchema();
    const [existing] = await pool.query('SELECT user_id, date, source FROM rosters WHERE id = ?', [req.params.id]);
    await pool.query('DELETE FROM rosters WHERE id = ?', [req.params.id]);
    if (existing.length > 0 && existing[0].source === 'default') {
      const [skipExists] = await pool.query(
        'SELECT id FROM roster_default_skips WHERE user_id = ? AND date = ?',
        [existing[0].user_id, existing[0].date]
      );
      if (skipExists.length === 0) {
        await pool.query(
          'INSERT INTO roster_default_skips (user_id, date, created_by) VALUES (?, ?, ?)',
          [existing[0].user_id, existing[0].date, req.user.id]
        );
      }
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

// DELETE /api/rosters/by-user-date?user_id=&date=
async function deleteByUserDate(req, res) {
  const { user_id, date } = req.query;
  if (!user_id || !date) return res.status(400).json({ message: 'user_id and date required' });
  try {
    await ensureRosterSchema();
    const [existing] = await pool.query(
      'SELECT source FROM rosters WHERE user_id = ? AND date = ?',
      [user_id, date]
    );
    await pool.query('DELETE FROM rosters WHERE user_id = ? AND date = ?', [user_id, date]);
    if (existing.some(row => row.source === 'default')) {
      const [skipExists] = await pool.query(
        'SELECT id FROM roster_default_skips WHERE user_id = ? AND date = ?',
        [user_id, date]
      );
      if (skipExists.length === 0) {
        await pool.query(
          'INSERT INTO roster_default_skips (user_id, date, created_by) VALUES (?, ?, ?)',
          [user_id, date, req.user.id]
        );
      }
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  getRosters,
  getTodayRoster,
  createRoster,
  getDefaults,
  saveDefaultPattern,
  deleteDefaultPattern,
  deleteRoster,
  deleteByUserDate,
};
