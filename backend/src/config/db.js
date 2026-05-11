// Auto-select SQLite (local dev), Supabase/PostgreSQL, or MySQL
if (process.env.USE_SQLITE === 'true') {
  module.exports = require('./sqlite-db');
} else if (process.env.DATABASE_URL) {
  module.exports = require('./supabase-db');
} else {
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+06:00',
  });
  async function testConnection() {
    try {
      const conn = await pool.getConnection();
      console.log('✅ MySQL connected');
      conn.release();
    } catch (err) {
      console.error('❌ MySQL connection failed:', err.message);
      process.exit(1);
    }
  }
  module.exports = { pool, testConnection };
}
