require('dotenv').config();
const { Pool } = require('pg');

console.log('DATABASE_URL =', process.env.DATABASE_URL);
console.log('DB_SSL =', process.env.DB_SSL);
console.log('DB_HOST =', process.env.DB_HOST);
console.log('DB_PORT =', process.env.DB_PORT);
console.log('DB_NAME =', process.env.DB_NAME);
console.log('DB_USER =', process.env.DB_USER);
console.log('DB_PASS =', process.env.DB_PASS ? '***' : '');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('DB connect error:', err.message || err);
    process.exit(1);
  }
  client.query('SELECT NOW()', (qerr, res) => {
    if (qerr) {
      console.error('DB query error:', qerr.message || qerr);
      process.exit(1);
    }
    console.log('DB query result:', res.rows[0]);
    release();
    pool.end(() => process.exit(0));
  });
});
