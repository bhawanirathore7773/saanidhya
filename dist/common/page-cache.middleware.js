"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PageCacheMiddleware = void 0;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const config_1 = require("../config/config");
const prisma_service_1 = require("../prisma/prisma.service");
const cache_1 = require("./cache");
const navigation_1 = require("./navigation");
const TOKEN = /^[A-Za-z0-9_-]{1,50}$/;
const pageNumber = (v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 500;
const knownCategory = async (v, ctx) => TOKEN.test(v) && (await ctx.categorySlugs()).has(v);
const { timeout, shortTimeout } = config_1.config.pageCache;
const RULES = [
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
let PageCacheMiddleware = class PageCacheMiddleware {
    version;
    prisma;
    pages = new cache_1.LruCache(config_1.config.pageCache.maxEntries);
    slugs = new cache_1.LruCache(2);
    constructor(version, prisma) {
        this.version = version;
        this.prisma = prisma;
    }
    async categorySlugs() {
        const key = `slugs:${await this.version.current()}`;
        let set = this.slugs.get(key);
        if (!set) {
            const rows = await this.prisma.eventCategory.findMany({ where: { is_published: true }, select: { slug: true } });
            set = new Set(rows.map((r) => r.slug));
            this.slugs.set(key, set, 3600);
        }
        return set;
    }
    ruleFor(path) {
        for (const r of RULES)
            if (r.re.test(path))
                return r;
        const m = SERVICE_PAGE.exec(path);
        if (m && !navigation_1.RESERVED_SLUGS.has(m[1]))
            return { re: SERVICE_PAGE, timeout };
        return null;
    }
    async use(req, res, next) {
        try {
            if (!config_1.config.pageCache.enabled || req.method !== 'GET')
                return next();
            const rule = this.ruleFor(req.path);
            if (!rule)
                return next();
            if (req.cookies?.admin_session || req.cookies?.lead_summary)
                return this.bypass(res, next);
            const parts = [];
            for (const [name, validate] of Object.entries(rule.params ?? {})) {
                const raw = req.query[name];
                const value = typeof raw === 'string' ? raw : '';
                if (value && !(await validate(value, this)))
                    return this.bypass(res, next);
                parts.push(`${name}=${value}`);
            }
            const hx = req.header('hx-request') === 'true' && req.header('hx-history-restore-request') !== 'true';
            const target = hx ? req.header('hx-target') || '' : '';
            if (target && !TOKEN.test(target))
                return this.bypass(res, next);
            const variant = hx ? `hx-${target}` : 'full';
            const v = await this.version.current();
            const key = (0, crypto_1.createHash)('sha1').update(`${v}|${req.path}?${parts.join('&')}#${variant}`).digest('hex');
            res.setHeader('Vary', 'HX-Request, HX-Target');
            const hit = this.pages.get(key);
            if (hit)
                return this.reply(req, res, hit, 'HIT');
            const send = res.send.bind(res);
            res.send = ((body) => {
                res.send = send;
                const type = String(res.getHeader('Content-Type') || '');
                if (res.statusCode === 200 && typeof body === 'string' && !res.getHeader('Set-Cookie') && /html|xml/.test(type) && !body.includes('csrfmiddlewaretoken')) {
                    const entry = { body, type, etag: `"${(0, crypto_1.createHash)('md5').update(body).digest('hex')}"` };
                    this.pages.set(key, entry, rule.timeout);
                    res.setHeader('ETag', entry.etag);
                    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
                    res.setHeader('X-Page-Cache', 'MISS');
                }
                else {
                    res.setHeader('X-Page-Cache', 'BYPASS');
                }
                return send(body);
            });
            next();
        }
        catch (err) {
            next(err);
        }
    }
    bypass(res, next) { res.setHeader('X-Page-Cache', 'BYPASS'); next(); }
    reply(req, res, entry, state) {
        res.setHeader('ETag', entry.etag);
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        res.setHeader('X-Page-Cache', state);
        if (req.header('if-none-match') === entry.etag)
            return void res.status(304).end();
        res.status(200).type(entry.type).send(entry.body);
    }
};
exports.PageCacheMiddleware = PageCacheMiddleware;
exports.PageCacheMiddleware = PageCacheMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cache_1.ContentVersionService, prisma_service_1.PrismaService])
], PageCacheMiddleware);
