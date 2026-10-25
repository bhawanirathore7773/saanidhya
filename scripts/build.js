#!/usr/bin/env node
/**
 * `npm run build`
 *  - On your computer (dev tools installed, NODE_ENV not "production"): makes the database client and compiles
 *    the app into dist/.
 *  - On Hostinger / a server (production, or only production packages installed): dist/ is already inside the zip,
 *    so this does nothing and succeeds. Hosting panels often run "npm run build" automatically, and compiling on
 *    shared hosting would be slow and needs the dev tools.
 *  - To force a rebuild anywhere:  FORCE_BUILD=1 npm run build
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const hasDevTools = fs.existsSync(path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'nest.cmd' : 'nest'));
const hasDist = fs.existsSync(path.join(root, 'dist', 'main.js'));
const production = process.env.NODE_ENV === 'production' && !process.env.FORCE_BUILD;
if (!hasDevTools || (production && hasDist)) {
  if (hasDist) { console.log('dist/ is already built: nothing to do.'); process.exit(0); }
  console.error('dist/ is missing and build tools are not installed. Run: npm install   then   npm run build');
  process.exit(1);
}
const run = (cmd, args) => { const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' }); if (r.status !== 0) process.exit(r.status || 1); };
const bin = (name) => path.join(root, 'node_modules', '.bin', name + (process.platform === 'win32' ? '.cmd' : ''));
run(bin('prisma'), ['generate']);
run(bin('nest'), ['build']);
console.log('Build finished: dist/ is ready.');
