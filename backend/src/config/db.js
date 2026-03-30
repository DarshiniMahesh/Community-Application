const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  family: 4,
});

pool.on('connect', () => console.log('Connected to PostgreSQL'));
pool.on('error', (err) => { console.error('PostgreSQL error:', err); process.exit(-1); });

module.exports = pool;