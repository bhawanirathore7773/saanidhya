"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HitCounter = exports.htmxTarget = exports.isPartial = exports.isHtmx = void 0;
exports.pageInfo = pageInfo;
exports.makePage = makePage;
exports.nextUrl = nextUrl;
exports.clientIp = clientIp;
exports.sameSitePath = sameSitePath;
exports.sign = sign;
exports.unsign = unsign;
exports.ensureCsrf = ensureCsrf;
exports.csrfValid = csrfValid;
const crypto_1 = require("crypto");
const net = __importStar(require("net"));
const config_1 = require("../config/config");
const isHtmx = (req) => req.header('hx-request') === 'true';
exports.isHtmx = isHtmx;
const isPartial = (req) => (0, exports.isHtmx)(req) && req.header('hx-history-restore-request') !== 'true';
exports.isPartial = isPartial;
const htmxTarget = (req) => req.header('hx-target') || '';
exports.htmxTarget = htmxTarget;
function pageInfo(rawPage, total, perPage) {
    const pages = Math.max(1, Math.ceil(total / perPage));
    let n = parseInt(String(rawPage ?? ''), 10);
    if (!Number.isFinite(n) || n < 1)
        n = 1;
    if (n > pages)
        n = pages;
    return { number: n, pages, skip: (n - 1) * perPage, take: perPage, hasNext: n < pages };
}
function makePage(items, total, info) {
    const page = [...items];
    page.paginator = { count: total, num_pages: info.pages };
    page.number = info.number;
    page.has_next = info.hasNext;
    return page;
}
function nextUrl(path, info, keep = {}) {
    if (!info.hasNext)
        return '';
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(keep))
        if (v)
            params.set(k, v);
    params.set('page', String(info.number + 1));
    return `${path}?${params.toString()}`;
}
function clientIp(req) {
    const header = config_1.config.clientIpHeader;
    const raw = header ? String(req.headers[header] ?? '') : '';
    const candidate = raw ? raw.split(',')[0].trim() : req.ip || req.socket.remoteAddress || '';
    const ip = candidate.replace(/^::ffff:/, '');
    return net.isIP(ip) ? ip : null;
}
function sameSitePath(req, value) {
    value = (value || '').split(/\s+/).filter(Boolean).join(' ');
    if (!value)
        return '';
    try {
        const u = new URL(value, config_1.config.siteUrl);
        if (/^[a-z][a-z0-9+.-]*:/i.test(value) && u.host !== req.get('host'))
            return '';
        return (u.pathname + u.search).slice(0, 500);
    }
    catch {
        return '';
    }
}
const b64 = (buf) => buf.toString('base64url');
function sign(payload, salt) {
    const sig = (0, crypto_1.createHmac)('sha256', `${config_1.config.secret}:${salt}`).update(payload).digest();
    return `${b64(Buffer.from(payload))}.${b64(sig)}`;
}
function unsign(token, salt) {
    const [p, s] = (token || '').split('.');
    if (!p || !s)
        return null;
    try {
        const payload = Buffer.from(p, 'base64url').toString();
        const expected = (0, crypto_1.createHmac)('sha256', `${config_1.config.secret}:${salt}`).update(payload).digest();
        const given = Buffer.from(s, 'base64url');
        return given.length === expected.length && (0, crypto_1.timingSafeEqual)(given, expected) ? payload : null;
    }
    catch {
        return null;
    }
}
const CSRF_COOKIE = 'csrftoken';
function ensureCsrf(req, res) {
    let token = req.cookies?.[CSRF_COOKIE];
    if (!token || !/^[A-Za-z0-9_-]{32,64}$/.test(token)) {
        token = (0, crypto_1.randomBytes)(32).toString('base64url');
        res.cookie(CSRF_COOKIE, token, { httpOnly: false, sameSite: 'lax', secure: config_1.config.production, maxAge: 365 * 24 * 3600 * 1000, path: '/' });
        req.cookies = { ...(req.cookies || {}), [CSRF_COOKIE]: token };
    }
    return token;
}
function csrfValid(req) {
    const cookie = req.cookies?.[CSRF_COOKIE];
    const sent = (req.body && req.body.csrfmiddlewaretoken) || req.header('x-csrftoken');
    if (!cookie || !sent || typeof sent !== 'string' || cookie.length !== sent.length)
        return false;
    return (0, crypto_1.timingSafeEqual)(Buffer.from(cookie), Buffer.from(sent));
}
class HitCounter {
    windowMs;
    hits = new Map();
    constructor(windowMs) {
        this.windowMs = windowMs;
    }
    hit(key) {
        const now = Date.now();
        const rec = this.hits.get(key);
        if (!rec || rec.reset < now) {
            this.hits.set(key, { n: 1, reset: now + this.windowMs });
            this.prune(now);
            return 1;
        }
        rec.n += 1;
        return rec.n;
    }
    prune(now) {
        if (this.hits.size < 5000)
            return;
        for (const [k, v] of this.hits)
            if (v.reset < now)
                this.hits.delete(k);
    }
}
exports.HitCounter = HitCounter;
