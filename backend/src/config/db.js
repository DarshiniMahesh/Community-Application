const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,                // maximum connections in pool
  min: 0,                // minimum connections
  idleTimeoutMillis: 10000,    // close idle connections after 30s
  connectionTimeoutMillis: 10000, // timeout if can't connect in 10s
  allowExitOnIdle: true,
});

pool.on('connect', () => console.log('Connected to PostgreSQL'));
pool.on('error', (err) => { 
  console.error('PostgreSQL error:', err); 
});

module.exports = pool;