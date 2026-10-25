#!/usr/bin/env node
/**
 * Builds the two stylesheets with Tailwind:
 *   public/static/css/site.css      the full stylesheet
 *   public/static/css/critical.css  the small part inlined in <head> (first screen paints without waiting)
 * Usage:  npm run css:build        (once)      npm run css:watch   (while you edit templates)
 */
const { spawnSync, spawn } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
const bin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss');
const watch = process.argv[2] === 'watch';
const builds = [['tailwind.config.js', 'public/static/css/site.css'], ['tailwind.critical.config.js', 'public/static/css/critical.css']];
for (const [config, out] of builds) {
  const args = ['-c', config, '-i', 'styles/main.css', '-o', out, watch ? '--watch' : '--minify'];
  if (watch) spawn(bin, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  else {
    const r = spawnSync(bin, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
    if (r.status !== 0) process.exit(r.status || 1);
    console.log(`  -> ${out}`);
  }
}
