#!/usr/bin/env node
/**
 * Deployment preflight: verifies required files and environment variable presence.
 * It never connects to the production database or prints secret values.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const requiredPaths = [
  'server.js',
  'package.json',
  'dist/main.js',
  'src/generated/prisma/client.ts',
  'public/static',
  'views',
  'database/schema.sql'
];
const missing = requiredPaths.filter((p) => !fs.existsSync(path.join(root, p)));
const requiredEnv = ['NODE_ENV', 'SITE_URL', 'SECRET_KEY', 'DATABASE_URL'];
const unset = requiredEnv.filter((key) => !String(process.env[key] || '').trim());
const warnings = [];
if (process.env.NODE_ENV && process.env.NODE_ENV !== 'production') warnings.push('NODE_ENV is not production.');
if (process.env.DATABASE_URL && !/^mysql:\/\//i.test(process.env.DATABASE_URL)) warnings.push('DATABASE_URL should use the mysql:// scheme for the MariaDB adapter.');
if (process.env.SITE_URL && !/^https:\/\//i.test(process.env.SITE_URL)) warnings.push('SITE_URL should use the final HTTPS URL.');
if (missing.length) {
  console.error('Deployment preflight failed. Missing files:', missing.join(', '));
  process.exitCode = 1;
} else if (unset.length) {
  console.error('Deployment preflight failed. Missing environment variable names:', unset.join(', '));
  process.exitCode = 1;
} else {
  console.log('Deployment preflight passed. No secret values were printed.');
}
if (warnings.length) {
  for (const warning of warnings) console.warn('Warning:', warning);
  process.exitCode = 1;
}
