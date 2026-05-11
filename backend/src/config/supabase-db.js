const { Pool } = require('pg');

const pool_pg = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function testConnection() {
  const client = await pool_pg.connect();
  console.log('✅ Supabase/PostgreSQL connected');
  client.release();
}

function toPgSql(sql) {
  // INSERT OR IGNORE → ON CONFLICT DO NOTHING (suffix added later)
  sql = sql.replace(/INSERT OR IGNORE INTO\s+/gi, 'INSERT INTO ');
  // INSERT OR REPLACE INTO settings → upsert (suffix added later)
  sql = sql.replace(/INSERT OR REPLACE INTO\s+settings\s*/gi, 'INSERT INTO settings ');
  // ? → $1, $2, ...
  let i = 0;
  sql = sql.replace(/\?/g, () => `$${++i}`);
  // Strip trailing semicolons
  sql = sql.replace(/;\s*$/, '');
  return sql;
}

async function query(sql, params = []) {
  const upper = sql.trim().toUpperCase();
  const pgSql = toPgSql(sql);
  const wasIgnore = /INSERT OR IGNORE INTO/i.test(sql);
  const wasReplace = /INSERT OR REPLACE INTO\s+settings/i.test(sql);

  try {
    if (upper.startsWith('INSERT')) {
      let finalSql = pgSql;
      if (wasIgnore) finalSql += ' ON CONFLICT DO NOTHING';
      if (wasReplace) finalSql += ' ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value';

      // Try RETURNING id — fails gracefully if table has no id column
      try {
        const result = await pool_pg.query(finalSql + ' RETURNING id', params);
        return [{ insertId: result.rows[0]?.id ?? null, affectedRows: result.rowCount }];
      } catch (err) {
        if (err.message.includes('"id"') || err.message.includes("column") || err.message.includes("RETURNING")) {
          const result = await pool_pg.query(finalSql, params);
          return [{ insertId: null, affectedRows: result.rowCount }];
        }
        throw err;
      }
    } else if (upper.startsWith('SELECT') || upper.startsWith('WITH')) {
      const result = await pool_pg.query(pgSql, params);
      return [result.rows];
    } else {
      const result = await pool_pg.query(pgSql, params);
      return [{ affectedRows: result.rowCount }];
    }
  } catch (err) {
    throw err;
  }
}

module.exports = { pool: { query }, testConnection };
