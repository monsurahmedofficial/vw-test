const { pool } = require('../config/db');

const DEFAULT_PERMISSIONS = {
  dashboard: false,
  tasks: false,
  attendance: true,
  rosters: false,
  announcements: true,
  settings: false,
  team: false,
  shops: false,
  templates: false,
  categories: false,
};

const SYSTEM_ROLES = [
  {
    key: 'admin',
    label: 'Admin',
    permissions: {
      dashboard: true, tasks: true, attendance: true, rosters: true, announcements: true,
      settings: true, team: true, shops: true, templates: true, categories: true,
    },
  },
  {
    key: 'hr',
    label: 'HR',
    permissions: {
      ...DEFAULT_PERMISSIONS,
      tasks: true,
      rosters: true,
    },
  },
  {
    key: 'staff',
    label: 'Staff',
    permissions: DEFAULT_PERMISSIONS,
  },
];

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ -]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
}

function normalizePermissions(value = {}) {
  return Object.keys(DEFAULT_PERMISSIONS).reduce((acc, key) => {
    acc[key] = Boolean(value[key]);
    return acc;
  }, {});
}

function serializeRole(row) {
  let permissions = {};
  try { permissions = JSON.parse(row.permissions || '{}'); } catch {}
  return {
    ...row,
    is_system: Boolean(row.is_system),
    permissions: normalizePermissions(permissions),
  };
}

async function ensureRolesSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        key TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        permissions TEXT NOT NULL DEFAULT '{}',
        is_system INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
  } catch {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS roles (
          \`key\` VARCHAR(50) PRIMARY KEY,
          label VARCHAR(100) NOT NULL,
          permissions TEXT NOT NULL,
          is_system BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch {}
  }

  for (const role of SYSTEM_ROLES) {
    const [existing] = await pool.query('SELECT key FROM roles WHERE key = ?', [role.key]);
    if (existing.length === 0) {
      await pool.query(
        'INSERT INTO roles (key, label, permissions, is_system) VALUES (?, ?, ?, ?)',
        [role.key, role.label, JSON.stringify(role.permissions), 1]
      );
    }
  }
}

async function listRoles(req, res) {
  try {
    await ensureRolesSchema();
    const [rows] = await pool.query('SELECT * FROM roles ORDER BY is_system DESC, label ASC');
    res.json(rows.map(serializeRole));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function createRole(req, res) {
  const key = normalizeKey(req.body.key || req.body.label);
  const label = String(req.body.label || '').trim();
  if (!key || !label) return res.status(400).json({ message: 'Role name is required' });

  try {
    await ensureRolesSchema();
    const [existing] = await pool.query('SELECT key FROM roles WHERE key = ?', [key]);
    if (existing.length > 0) return res.status(409).json({ message: 'Role already exists' });

    await pool.query(
      'INSERT INTO roles (key, label, permissions, is_system) VALUES (?, ?, ?, ?)',
      [key, label, JSON.stringify(normalizePermissions(req.body.permissions)), 0]
    );
    res.status(201).json({ message: 'Role created', key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function updateRole(req, res) {
  const { key } = req.params;
  const label = String(req.body.label || '').trim();
  if (!label) return res.status(400).json({ message: 'Role name is required' });

  try {
    await ensureRolesSchema();
    const [existing] = await pool.query('SELECT * FROM roles WHERE key = ?', [key]);
    if (existing.length === 0) return res.status(404).json({ message: 'Role not found' });

    await pool.query(
      'UPDATE roles SET label = ?, permissions = ?, updated_at = ? WHERE key = ?',
      [label, JSON.stringify(normalizePermissions(req.body.permissions)), new Date().toISOString(), key]
    );
    res.json({ message: 'Role updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function deleteRole(req, res) {
  const { key } = req.params;
  try {
    await ensureRolesSchema();
    const [existing] = await pool.query('SELECT * FROM roles WHERE key = ?', [key]);
    if (existing.length === 0) return res.status(404).json({ message: 'Role not found' });
    if (existing[0].is_system) return res.status(400).json({ message: 'System roles cannot be deleted' });

    const [users] = await pool.query('SELECT id FROM users WHERE role = ? LIMIT 1', [key]);
    if (users.length > 0) return res.status(400).json({ message: 'Reassign users before deleting this role' });

    await pool.query('DELETE FROM roles WHERE key = ?', [key]);
    res.json({ message: 'Role deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  DEFAULT_PERMISSIONS,
  ensureRolesSchema,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
};
