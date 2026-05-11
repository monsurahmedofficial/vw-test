CREATE DATABASE IF NOT EXISTS vw_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vw_crm;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  mobile VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff') DEFAULT 'staff',
  is_active BOOLEAN DEFAULT TRUE,
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  proof_required BOOLEAN DEFAULT FALSE,
  default_deadline_hours INT DEFAULT 24,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  template_id INT,
  assigned_to INT NOT NULL,
  assigned_by INT NOT NULL,
  status ENUM('todo', 'doing', 'proof_uploaded', 'done') DEFAULT 'todo',
  deadline DATETIME,
  proof_required BOOLEAN DEFAULT FALSE,
  reminder_count INT DEFAULT 0,
  last_reminder_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS task_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  note TEXT,
  image_path VARCHAR(500),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS shops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  default_open_time TIME DEFAULT '09:00',
  default_close_time TIME DEFAULT '22:00',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rosters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  shop_id INT NOT NULL,
  date DATE NOT NULL,
  shift_start TIME DEFAULT '09:00',
  shift_end TIME DEFAULT '22:00',
  notes TEXT,
  source ENUM('manual', 'default') DEFAULT 'manual',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_date (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

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
  UNIQUE KEY unique_user_weekday (user_id, weekday),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roster_default_skips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_skip_date (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT,
  recipient_email VARCHAR(100) NOT NULL,
  type ENUM('assigned', 'reminder', 'overdue', 'completed') NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- Seed default admin
INSERT IGNORE INTO users (name, mobile, email, password_hash, role)
VALUES ('Admin', '01700000000', 'admin@vaporworld.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
-- Default password: password

-- Seed default task templates
INSERT IGNORE INTO task_templates (name, description, proof_required, default_deadline_hours, created_by)
VALUES
  ('Daily Stock Check', 'Count and verify shelf stock levels', TRUE, 8, 1),
  ('Shelf Refill', 'Restock shelves from back storage', TRUE, 4, 1),
  ('Outlet Visit', 'Visit outlet and report current status', TRUE, 24, 1),
  ('Delivery Confirmation', 'Confirm delivery received and count items', TRUE, 2, 1),
  ('Display Setup', 'Set up or rearrange product display area', TRUE, 6, 1),
  ('Cleaning & Hygiene', 'Clean store and maintain hygiene standards', FALSE, 12, 1);
