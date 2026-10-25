#!/usr/bin/env node
/**
 * Hostinger-safe build strategy.
 *
 * Production deployments may install only production dependencies. In that case,
 * dist/ must already be included in the deployment bundle. Locally/CI, compile.
 * Set FORCE_BUILD=1 to build even when NODE_ENV=production.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const distEntry = path.join(root, 'dist', 'main.js');
const hasDist = fs.existsSync(distEntry);
const binExt = process.platform === 'win32' ? '.cmd' : '';
const bin = (name) => path.join(root, 'node_modules', '.bin', name + binExt);
const hasBuildTools = ['nest', 'prisma'].every((name) => fs.existsSync(bin(name)));

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (process.env.SKIP_BUILD === '1') {
  if (!hasDist) fail('SKIP_BUILD=1 was set, but dist/main.js is missing.');
  console.log('Build skipped explicitly; prebuilt dist/ exists.');
  process.exit(0);
}

if (process.env.NODE_ENV === 'production' && process.env.FORCE_BUILD !== '1') {
  if (!hasDist) fail('Production deployment requires the prebuilt dist/ directory. Build in CI or locally before uploading.');
  if (!fs.existsSync(path.join(root, 'public', 'static')) || !fs.existsSync(path.join(root, 'views'))) {
    fail('Required public/static or views/ directory is missing from the deployment package.');
  }
  console.log('Using prebuilt production bundle.');
  process.exit(0);
}

if (!hasBuildTools) fail('Build tools are missing. Run npm install with devDependencies before building.');
const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
};
run(bin('prisma'), ['generate']);
run(bin('nest'), ['build']);
console.log('Build finished: dist/ is ready.');
