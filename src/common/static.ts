import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/config';

const memo = new Map<string, string>();

/** /static/css/site.css -> /static/css/site.css?v=<hash of the file>, so browsers fetch a new file when it changes. */
export function staticUrl(rel: string): string {
  rel = rel.replace(/^\/+/, '');
  const hit = memo.get(rel);
  if (hit && config.production) return hit;
  let url = `/static/${rel}`;
  try {
    const file = path.join(config.staticDir, rel);
    url += `?v=${createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 10)}`;
  } catch { /* missing file: plain URL */ }
  memo.set(rel, url);
  return url;
}

const cssMemo = new Map<string, string>();
/** Contents of a built CSS file, for inlining in <style> (critical CSS). */
export function inlineCss(rel: string): string {
  if (config.production && cssMemo.has(rel)) return cssMemo.get(rel)!;
  let css = '';
  try { css = fs.readFileSync(path.join(config.staticDir, rel.replace(/^\/+/, '')), 'utf8'); } catch { console.warn(`${rel} not found. Run: npm run css:build`); }
  cssMemo.set(rel, css);
  return css;
}
