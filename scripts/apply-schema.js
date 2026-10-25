#!/usr/bin/env node
/**
 * Creates the database tables from database/schema.sql (safe to run again: existing tables are kept).
 * Needs DATABASE_URL (in .env or the environment). Works over SSH; on plain hosting use phpMyAdmin > Import instead.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const mariadb = require('mariadb');
(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing. Example: mysql://user:password@localhost:3306/database');
  const u = new URL(process.env.DATABASE_URL);
  const conn = await mariadb.createConnection({
    host: u.hostname === 'localhost' ? '127.0.0.1' : u.hostname, port: Number(u.port || 3306), user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password), database: u.pathname.slice(1), multipleStatements: true, socketPath: process.env.DB_SOCKET || undefined,
  });
  await conn.query(fs.readFileSync(path.join(root, 'database', 'schema.sql'), 'utf8'));
  const rows = await conn.query('SHOW TABLES');
  console.log(`Database ready: ${rows.length} tables.`);
  await conn.end();
})().catch((e) => { console.error('Could not apply the schema:', e.message); process.exit(1); });
