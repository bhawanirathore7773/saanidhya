import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';
import * as net from 'net';
import { config } from '../config/config';

// ---------------------------------------------------------------- htmx
export const isHtmx = (req: Request) => req.header('hx-request') === 'true';
/** A fragment request (not the browser restoring history after Back). */
export const isPartial = (req: Request) => isHtmx(req) && req.header('hx-history-restore-request') !== 'true';
export const htmxTarget = (req: Request) => req.header('hx-target') || '';

// ----------------------------------------------------------- pagination
export interface Page<T> extends Array<T> {
  paginator: { count: number; num_pages: number };
  number: number;
  has_next: boolean;
}

/** Django-style get_page: bad page numbers fall back to the first page, too-large ones to the last. */
export function pageInfo(rawPage: unknown, total: number, perPage: number) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  let n = parseInt(String(rawPage ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) n = 1;
  if (n > pages) n = pages;
  return { number: n, pages, skip: (n - 1) * perPage, take: perPage, hasNext: n < pages };
}

export function makePage<T>(items: T[], total: number, info: { number: number; pages: number; hasNext: boolean }): Page<T> {
  const page = [...items] as Page<T>;
  page.paginator = { count: total, num_pages: info.pages };
  page.number = info.number;
  page.has_next = info.hasNext;
  return page;
}

export function nextUrl(path: string, info: { number: number; hasNext: boolean }, keep: Record<string, string> = {}): string {
  if (!info.hasNext) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(keep)) if (v) params.set(k, v);
  params.set('page', String(info.number + 1));
  return `${path}?${params.toString()}`;
}

// ------------------------------------------------------------ client IP
export function clientIp(req: Request): string | null {
  const header = config.clientIpHeader;
  const raw = header ? String(req.headers[header] ?? '') : '';
  const candidate = raw ? raw.split(',')[0].trim() : req.ip || req.socket.remoteAddress || '';
  const ip = candidate.replace(/^::ffff:/, '');
  return net.isIP(ip) ? ip : null;
}

/** Keep only a path (and query) on this site. */
export function sameSitePath(req: Request, value: string | undefined): string {
  value = (value || '').split(/\s+/).filter(Boolean).join(' ');
  if (!value) return '';
  try {
    const u = new URL(value, config.siteUrl);
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) && u.host !== req.get('host')) return '';
    return (u.pathname + u.search).slice(0, 500);
  } catch { return ''; }
}

// -------------------------------------------------------------- signing
const b64 = (buf: Buffer) => buf.toString('base64url');
export function sign(payload: string, salt: string): string {
  const sig = createHmac('sha256', `${config.secret}:${salt}`).update(payload).digest();
  return `${b64(Buffer.from(payload))}.${b64(sig)}`;
}
export function unsign(token: string, salt: string): string | null {
  const [p, s] = (token || '').split('.');
  if (!p || !s) return null;
  try {
    const payload = Buffer.from(p, 'base64url').toString();
    const expected = createHmac('sha256', `${config.secret}:${salt}`).update(payload).digest();
    const given = Buffer.from(s, 'base64url');
    return given.length === expected.length && timingSafeEqual(given, expected) ? payload : null;
  } catch { return null; }
}

// ----------------------------------------------------------------- CSRF
const CSRF_COOKIE = 'csrftoken';
export function ensureCsrf(req: Request, res: Response): string {
  let token = req.cookies?.[CSRF_COOKIE];
  if (!token || !/^[A-Za-z0-9_-]{32,64}$/.test(token)) {
    token = randomBytes(32).toString('base64url');
    res.cookie(CSRF_COOKIE, token, { httpOnly: false, sameSite: 'lax', secure: config.production, maxAge: 365 * 24 * 3600 * 1000, path: '/' });
    req.cookies = { ...(req.cookies || {}), [CSRF_COOKIE]: token };
  }
  return token;
}

/** Cookie value must match the form field or the X-CSRFToken header (set by htmx). */
export function csrfValid(req: Request): boolean {
  const cookie = req.cookies?.[CSRF_COOKIE];
  const sent = (req.body && req.body.csrfmiddlewaretoken) || req.header('x-csrftoken');
  if (!cookie || !sent || typeof sent !== 'string' || cookie.length !== sent.length) return false;
  return timingSafeEqual(Buffer.from(cookie), Buffer.from(sent));
}

// ------------------------------------------------------------ rate limit
/** Counts hits per key inside a time window (in memory; fine for one small site). */
export class HitCounter {
  private hits = new Map<string, { n: number; reset: number }>();
  constructor(private readonly windowMs: number) {}
  hit(key: string): number {
    const now = Date.now();
    const rec = this.hits.get(key);
    if (!rec || rec.reset < now) { this.hits.set(key, { n: 1, reset: now + this.windowMs }); this.prune(now); return 1; }
    rec.n += 1;
    return rec.n;
  }
  private prune(now: number) {
    if (this.hits.size < 5000) return;
    for (const [k, v] of this.hits) if (v.reset < now) this.hits.delete(k);
  }
}
