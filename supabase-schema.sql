-- Vapor World CRM — Supabase (PostgreSQL) Schema
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT UNIQUE NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'staff',
  is_active INTEGER DEFAULT 1,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '{}',
  is_system INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  proof_required INTEGER DEFAULT 0,
  default_deadline_hours INTEGER DEFAULT 24,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  template_id INTEGER REFERENCES task_templates(id) ON DELETE SET NULL,
  assigned_to INTEGER NOT NULL REFERENCES users(id),
  assigned_by INTEGER NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'todo',
  deadline TIMESTAMPTZ,
  proof_required INTEGER DEFAULT 0,
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  category TEXT,
  is_repeat INTEGER DEFAULT 0,
  repeat_days TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_updates (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  note TEXT,
  image_path TEXT,
  old_status TEXT,
  new_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'blue',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shops (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  default_open_time TEXT DEFAULT '09:00',
  default_close_time TEXT DEFAULT '22:00',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_logs (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  is_open INTEGER DEFAULT 0,
  opened_at TEXT,
  closed_at TEXT,
  is_manual_override INTEGER DEFAULT 0,
  override_by INTEGER,
  override_reason TEXT,
  UNIQUE(shop_id, date)
);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  check_in_at TEXT NOT NULL,
  check_out_at TEXT,
  opened_shop INTEGER DEFAULT 0,
  closed_shop INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ,
  requires_ack INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcement_acknowledgements (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

CREATE TABLE IF NOT EXISTS rosters (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  shift_start TEXT DEFAULT '09:00',
  shift_end TEXT DEFAULT '22:00',
  notes TEXT,
  source TEXT DEFAULT 'manual',
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS roster_default_patterns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL,
  shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shift_start TEXT DEFAULT '09:00',
  shift_end TEXT DEFAULT '22:00',
  is_active INTEGER DEFAULT 1,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, weekday)
);

CREATE TABLE IF NOT EXISTS roster_default_skips (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed default data ──────────────────────────────────────────────────────────

-- Default admin (password: password)
INSERT INTO users (name, mobile, email, password_hash, role)
VALUES ('Admin', '01700000000', 'admin@vaporworld.com',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (mobile) DO NOTHING;

-- Roles
INSERT INTO roles (key, label, permissions, is_system) VALUES
  ('admin', 'Admin', '{"dashboard":true,"tasks":true,"attendance":true,"rosters":true,"announcements":true,"settings":true,"team":true,"shops":true,"templates":true,"categories":true}', 1),
  ('hr',    'HR',    '{"dashboard":false,"tasks":true,"attendance":true,"rosters":true,"announcements":true,"settings":false,"team":false,"shops":false,"templates":false,"categories":false}', 1),
  ('staff', 'Staff', '{"dashboard":false,"tasks":false,"attendance":true,"rosters":false,"announcements":true,"settings":false,"team":false,"shops":false,"templates":false,"categories":false}', 1)
ON CONFLICT (key) DO NOTHING;

-- Settings
INSERT INTO settings (key, value) VALUES
  ('stage_1_name', 'Pending'),
  ('stage_2_name', 'On-Process'),
  ('stage_3_name', 'Completed'),
  ('reminder_task_hours_before', '4'),
  ('reminder_stuck_hours', '3'),
  ('reminder_overdue_interval_hours', '6'),
  ('reminder_announcement_ack_hours', '2'),
  ('reminder_announcement_repeat_hours', '4')
ON CONFLICT (key) DO NOTHING;

-- Categories
INSERT INTO categories (name, color) VALUES
  ('Operations', 'blue'), ('Sales', 'orange'), ('Delivery', 'purple'),
  ('Cleaning', 'teal'), ('Stock', 'amber'), ('Display', 'pink'), ('Other', 'gray')
ON CONFLICT (name) DO NOTHING;

-- Task templates (seed after admin user exists)
INSERT INTO task_templates (name, description, proof_required, default_deadline_hours, created_by)
SELECT * FROM (VALUES
  ('Daily Stock Check', 'Count and verify shelf stock levels', 1, 8),
  ('Shelf Refill', 'Restock shelves from back storage', 1, 4),
  ('Outlet Visit', 'Visit outlet and report current status', 1, 24),
  ('Delivery Confirmation', 'Confirm delivery received and count items', 1, 2),
  ('Display Setup', 'Set up or rearrange product display area', 1, 6),
  ('Cleaning & Hygiene', 'Clean store and maintain hygiene standards', 0, 12)
) AS t(name, description, proof_required, default_deadline_hours)
CROSS JOIN (SELECT id FROM users WHERE mobile = '01700000000' LIMIT 1) AS admin(id);
