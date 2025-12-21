import pg from 'pg';
import { config } from './config.js';

const pool = new pg.Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined
});

pool.on('error', (err) => {
  console.error('Unexpected PG error', err);
});

export function getClient() {
  return pool;
}
