#!/usr/bin/env node
/**
 * Deployment preflight: verifies required files and environment variable presence.
 * Does not connect to the production database and never prints secret values.
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

const hasAnyFile = (dir, extensions) => {
  if (!fs.existsSync(dir)) return false;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(file);
      else if (extensions.some((ext) => entry.name.toLowerCase().endsWith(ext))) return true;
    }
  }
  return false;
};

const requiredPaths = [
  'server.js',
  'package.json',
  'dist/main.js',
  'src/generated/prisma/client.ts',
  'public/static',
  'database/schema.sql'
];
const missing = requiredPaths.filter((p) => !fs.existsSync(path.join(root, p)));
const viewsPath = path.join(root, 'views');
if (!fs.existsSync(viewsPath) || !hasAnyFile(viewsPath, ['.njk', '.html', '.jinja', '.jinja2'])) {
  missing.push('views/ (expected Nunjucks/HTML template files)');
}
const requiredEnv = ['NODE_ENV', 'SITE_URL', 'SECRET_KEY', 'DATABASE_URL'];
const unset = requiredEnv.filter((key) => !String(process.env[key] || '').trim());
const warnings = [];
if (process.env.NODE_ENV && process.env.NODE_ENV !== 'production') warnings.push('NODE_ENV is not production.');
if (process.env.DATABASE_URL && !/^mysql:\/\//i.test(process.env.DATABASE_URL)) warnings.push('DATABASE_URL should use the mysql:// scheme for the MariaDB adapter.');
if (process.env.SITE_URL && !/^https:\/\//i.test(process.env.SITE_URL)) warnings.push('SITE_URL should use the final HTTPS URL.');

if (missing.length) {
  console.error('Deployment preflight failed. Missing required runtime files:', missing.join(', '));
}
if (unset.length) {
  console.error('Deployment preflight failed. Missing environment variable names:', unset.join(', '));
}
for (const warning of warnings) console.warn('Warning:', warning);
if (missing.length || unset.length || warnings.length) {
  process.exitCode = 1;
} else {
  console.log('Deployment preflight passed. No secret values were printed.');
}
