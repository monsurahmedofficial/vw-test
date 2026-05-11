const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../../data/vw_crm.db');

const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'staff',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      proof_required INTEGER DEFAULT 0,
      default_deadline_hours INTEGER DEFAULT 24,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      template_id INTEGER,
      assigned_to INTEGER NOT NULL,
      assigned_by INTEGER NOT NULL,
      status TEXT DEFAULT 'todo',
      deadline TEXT,
      proof_required INTEGER DEFAULT 0,
      reminder_count INTEGER DEFAULT 0,
      last_reminder_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      note TEXT,
      image_path TEXT,
      old_status TEXT,
      new_status TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      recipient_email TEXT NOT NULL,
      type TEXT NOT NULL,
      sent_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS roles (
      key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT '{}',
      is_system INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT 'blue',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      default_open_time TEXT DEFAULT '09:00',
      default_close_time TEXT DEFAULT '22:00',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shop_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      is_open INTEGER DEFAULT 0,
      opened_at TEXT,
      closed_at TEXT,
      is_manual_override INTEGER DEFAULT 0,
      override_by INTEGER,
      override_reason TEXT,
      UNIQUE(shop_id, date),
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      shop_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      check_in_at TEXT NOT NULL,
      check_out_at TEXT,
      opened_shop INTEGER DEFAULT 0,
      closed_shop INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT,
      created_by INTEGER NOT NULL,
      expires_at TEXT,
      requires_ack INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS announcement_acknowledgements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      announcement_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      acknowledged_at TEXT DEFAULT (datetime('now')),
      UNIQUE(announcement_id, user_id),
      FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rosters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      shop_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      shift_start TEXT DEFAULT '09:00',
      shift_end TEXT DEFAULT '22:00',
      notes TEXT,
      source TEXT DEFAULT 'manual',
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    );

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
      UNIQUE(user_id, weekday),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS roster_default_skips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Seed default settings
  const settingDefaults = [
    ['stage_1_name', 'Pending'],
    ['stage_2_name', 'On-Process'],
    ['stage_3_name', 'Completed'],
    ['reminder_task_hours_before', '4'],
    ['reminder_stuck_hours', '3'],
    ['reminder_overdue_interval_hours', '6'],
    ['reminder_announcement_ack_hours', '2'],
    ['reminder_announcement_repeat_hours', '4'],
  ];
  const upsertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  settingDefaults.forEach(([k, v]) => upsertSetting.run(k, v));

  const roleDefaults = [
    ['admin', 'Admin', JSON.stringify({
      dashboard: true, tasks: true, attendance: true, rosters: true, announcements: true,
      settings: true, team: true, shops: true, templates: true, categories: true,
    }), 1],
    ['hr', 'HR', JSON.stringify({
      dashboard: false, tasks: true, attendance: true, rosters: true, announcements: true,
      settings: false, team: false, shops: false, templates: false, categories: false,
    }), 1],
    ['staff', 'Staff', JSON.stringify({
      dashboard: false, tasks: false, attendance: true, rosters: false, announcements: true,
      settings: false, team: false, shops: false, templates: false, categories: false,
    }), 1],
  ];
  const upsertRole = db.prepare('INSERT OR IGNORE INTO roles (key, label, permissions, is_system) VALUES (?, ?, ?, ?)');
  roleDefaults.forEach((role) => upsertRole.run(...role));

  // Seed default categories
  const categoryDefaults = [
    ['Operations', 'blue'], ['Sales', 'orange'], ['Delivery', 'purple'],
    ['Cleaning', 'teal'], ['Stock', 'amber'], ['Display', 'pink'], ['Other', 'gray'],
  ];
  const upsertCat = db.prepare('INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)');
  categoryDefaults.forEach(([n, c]) => upsertCat.run(n, c));

  // Migrate any old proof_uploaded tasks → doing
  db.prepare("UPDATE tasks SET status = 'doing' WHERE status = 'proof_uploaded'").run();

  // Add new columns if they don't exist yet
  [
    ['category',    'TEXT'],
    ['is_repeat',   'INTEGER DEFAULT 0'],
    ['repeat_days', 'TEXT'],
  ].forEach(([col, def]) => {
    try { db.exec(`ALTER TABLE tasks ADD COLUMN ${col} ${def}`); } catch {}
  });

  try { db.exec("ALTER TABLE rosters ADD COLUMN source TEXT DEFAULT 'manual'"); } catch {}

  const adminExists = db.prepare("SELECT id FROM users WHERE mobile = '01700000000'").get();
  if (!adminExists) {
    const hash = bcrypt.hashSync('password', 10);
    db.prepare(
      "INSERT INTO users (name, mobile, email, password_hash, role) VALUES (?, ?, ?, ?, ?)"
    ).run('Admin', '01700000000', 'admin@vaporworld.com', hash, 'admin');

    const adminId = db.prepare("SELECT id FROM users WHERE mobile = '01700000000'").get().id;
    const templates = [
      ['Daily Stock Check', 'Count and verify shelf stock levels', 1, 8],
      ['Shelf Refill', 'Restock shelves from back storage', 1, 4],
      ['Outlet Visit', 'Visit outlet and report current status', 1, 24],
      ['Delivery Confirmation', 'Confirm delivery received and count items', 1, 2],
      ['Display Setup', 'Set up or rearrange product display area', 1, 6],
      ['Cleaning & Hygiene', 'Clean store and maintain hygiene standards', 0, 12],
    ];
    const ins = db.prepare("INSERT INTO task_templates (name, description, proof_required, default_deadline_hours, created_by) VALUES (?, ?, ?, ?, ?)");
    templates.forEach((t) => ins.run(...t, adminId));
    console.log('✅ SQLite database initialized with seed data');
  }
}

initSchema();

// Compatibility shim matching mysql2/promise interface: returns [rows] for SELECT, [{insertId, affectedRows}] for mutations
function query(sql, params = []) {
  const s = sql.trim().toUpperCase();
  try {
    if (s.startsWith('SELECT') || s.startsWith('WITH')) {
      const rows = db.prepare(sql).all(...params);
      return Promise.resolve([rows]);
    } else if (s.startsWith('INSERT')) {
      const info = db.prepare(sql).run(...params);
      return Promise.resolve([{ insertId: info.lastInsertRowid, affectedRows: info.changes }]);
    } else {
      const info = db.prepare(sql).run(...params);
      return Promise.resolve([{ affectedRows: info.changes }]);
    }
  } catch (err) {
    return Promise.reject(err);
  }
}

const pool = { query };

async function testConnection() {
  console.log(`✅ SQLite connected → ${DB_PATH}`);
}

module.exports = { pool, testConnection };
