require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const init = async () => {
  const client = await pool.connect();
  try {
    const sql = require('fs').readFileSync('./db/init.sql').toString();
    await client.query(sql);
    console.log('Database initialized');
  } catch (err) {
    console.error('Init error:', err);
  } finally {
    client.release();
    process.exit();
  }
};

init();