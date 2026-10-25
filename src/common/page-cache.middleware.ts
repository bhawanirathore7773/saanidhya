import { createHash } from 'crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { config } from '../config/config';
import { PrismaService } from '../prisma/prisma.service';
import { ContentVersionService, LruCache } from './cache';
import { RESERVED_SLUGS } from './navigation';

/**
 * Whole-page cache for public pages (in memory).
 *  - the key contains the content version, so any admin edit makes old pages unreachable at once
 *  - never used for staff, for visitors who just sent an enquiry, for non-200 answers or pages with cookies
 *  - only the query values that change a page (?page, ?type) are part of the key; utm_*, gclid ... are ignored
 *  - repeat visitors get 304 Not Modified (ETag)
 */
type Validator = (value: string, ctx: PageCacheMiddleware) => Promise<boolean> | boolean;
interface Rule { re: RegExp; timeout: number; params?: Record<string, Validator> }
interface Entry { body: string; type: string; etag: string }

const TOKEN = /^[A-Za-z0-9_-]{1,50}$/;
const pageNumber: Validator = (v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 500;
const knownCategory: Validator = async (v, ctx) => TOKEN.test(v) && (await ctx.categorySlugs()).has(v);

const { timeout, shortTimeout } = config.pageCache;
const RULES: Rule[] = [
  { re: /^\/$/, timeout: shortTimeout },
  { re: /^\/(about|faq|privacy|terms|services|packages)\/$/, timeout },
  { re: /^\/sitemap\.xml$/, timeout: shortTimeout },
  { re: /^\/gallery\/$/, timeout, params: { type: knownCategory, page: pageNumber } },
  { re: /^\/gallery\/[a-z0-9_-]+\/$/, timeout },
  { re: /^\/videos\/$/, timeout, params: { page: pageNumber } },
  { re: /^\/testimonials\/$/, timeout, params: { page: pageNumber } },
  { re: /^\/blog\/$/, timeout: shortTimeout, params: { page: pageNumber } },
  { re: /^\/blog\/[a-z0-9_-]+\/$/, timeout },
];
const SERVICE_PAGE = /^\/([a-z0-9_-]+)\/$/;

@Injectable()
export class PageCacheMiddleware implements NestMiddleware {
  private pages = new LruCache<Entry>(config.pageCache.maxEntries);
  private slugs = new LruCache<Set<string>>(2);
  constructor(private readonly version: ContentVersionService, private readonly prisma: PrismaService) {}

  async categorySlugs(): Promise<Set<string>> {
    const key = `slugs:${await this.version.current()}`;
    let set = this.slugs.get(key);
    if (!set) {
      const rows = await this.prisma.eventCategory.findMany({ where: { is_published: true }, select: { slug: true } });
      set = new Set(rows.map((r) => r.slug));
      this.slugs.set(key, set, 3600);
    }
    return set;
  }

  private ruleFor(path: string): Rule | null {
    for (const r of RULES) if (r.re.test(path)) return r;
    const m = SERVICE_PAGE.exec(path);
    if (m && !RESERVED_SLUGS.has(m[1])) return { re: SERVICE_PAGE, timeout };
    return null;
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      if (!config.pageCache.enabled || req.method !== 'GET') return next();
      const rule = this.ruleFor(req.path);
      if (!rule) return next();
      if (req.cookies?.admin_session || req.cookies?.lead_summary) return this.bypass(res, next);

      const parts: string[] = [];
      for (const [name, validate] of Object.entries(rule.params ?? {})) {
        const raw = req.query[name];
        const value = typeof raw === 'string' ? raw : '';
        if (value && !(await validate(value, this))) return this.bypass(res, next);
        parts.push(`${name}=${value}`);
      }
      const hx = req.header('hx-request') === 'true' && req.header('hx-history-restore-request') !== 'true';
      const target = hx ? req.header('hx-target') || '' : '';
      if (target && !TOKEN.test(target)) return this.bypass(res, next);
      const variant = hx ? `hx-${target}` : 'full';
      const v = await this.version.current();
      const key = createHash('sha1').update(`${v}|${req.path}?${parts.join('&')}#${variant}`).digest('hex');

      res.setHeader('Vary', 'HX-Request, HX-Target');
      const hit = this.pages.get(key);
      if (hit) return this.reply(req, res, hit, 'HIT');

      const send = res.send.bind(res);
      res.send = ((body?: any) => {
        res.send = send;
        const type = String(res.getHeader('Content-Type') || '');
        if (res.statusCode === 200 && typeof body === 'string' && !res.getHeader('Set-Cookie') && /html|xml/.test(type) && !body.includes('csrfmiddlewaretoken')) {
          const entry: Entry = { body, type, etag: `"${createHash('md5').update(body).digest('hex')}"` };
          this.pages.set(key, entry, rule.timeout);
          res.setHeader('ETag', entry.etag);
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
          res.setHeader('X-Page-Cache', 'MISS');
        } else {
          res.setHeader('X-Page-Cache', 'BYPASS');
        }
        return send(body);
      }) as typeof res.send;
      next();
    } catch (err) { next(err); }
  }

  private bypass(res: Response, next: NextFunction) { res.setHeader('X-Page-Cache', 'BYPASS'); next(); }

  private reply(req: Request, res: Response, entry: Entry, state: string) {
    res.setHeader('ETag', entry.etag);
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('X-Page-Cache', state);
    if (req.header('if-none-match') === entry.etag) return void res.status(304).end();
    res.status(200).type(entry.type).send(entry.body);
  }
}
