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
exports.config = exports.ROOT = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
exports.ROOT = path.resolve(__dirname, '..', '..', fs.existsSync(path.resolve(__dirname, '..', '..', 'package.json')) ? '' : '..');
function loadDotEnv(file) {
    if (!fs.existsSync(file))
        return;
    for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith('#'))
            continue;
        const eq = line.indexOf('=');
        if (eq < 1)
            continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
            value = value.slice(1, -1);
        if (process.env[key] === undefined)
            process.env[key] = value;
    }
}
loadDotEnv(path.join(exports.ROOT, '.env'));
const env = (key, fallback = '') => (process.env[key] ?? fallback).trim();
const bool = (key, fallback) => {
    const v = process.env[key];
    return v === undefined || v === '' ? fallback : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
};
const int = (key, fallback) => {
    const n = parseInt(env(key), 10);
    return Number.isFinite(n) ? n : fallback;
};
const production = env('NODE_ENV', 'development') === 'production';
let secret = env('SECRET_KEY');
if (!secret) {
    if (production)
        throw new Error('SECRET_KEY is missing. Add a long random value in your hosting environment variables.');
    secret = (0, crypto_1.randomBytes)(32).toString('hex');
}
const adminUrl = env('ADMIN_URL', 'admin/').replace(/^\/+/, '');
exports.config = {
    production,
    port: int('PORT', 3000),
    siteUrl: env('SITE_URL', 'http://localhost:3000').replace(/\/+$/, ''),
    adminUrl: adminUrl.endsWith('/') ? adminUrl : adminUrl + '/',
    get adminBase() { return '/' + this.adminUrl.replace(/\/$/, ''); },
    secret,
    databaseUrl: env('DATABASE_URL'),
    setupKey: env('SETUP_KEY'),
    trustProxy: env('TRUST_PROXY', '1'),
    clientIpHeader: env('CLIENT_IP_HEADER').toLowerCase().replace(/^http_/, '').replace(/_/g, '-'),
    uploadDir: path.resolve(env('UPLOAD_DIR') || path.join(exports.ROOT, 'storage', 'uploads')),
    mediaUrl: '/media/',
    staticDir: path.join(exports.ROOT, 'public', 'static'),
    viewsDir: path.join(exports.ROOT, 'views'),
    email: {
        host: env('EMAIL_HOST'),
        port: int('EMAIL_PORT', 587),
        user: env('EMAIL_HOST_USER'),
        password: env('EMAIL_HOST_PASSWORD'),
        useTls: bool('EMAIL_USE_TLS', true),
        from: env('DEFAULT_FROM_EMAIL', 'Saanidhya Events <no-reply@localhost>'),
    },
    whatsapp: {
        token: env('WHATSAPP_CLOUD_TOKEN'),
        phoneId: env('WHATSAPP_CLOUD_PHONE_ID'),
        notifyTo: env('WHATSAPP_NOTIFY_TO'),
        template: env('WHATSAPP_TEMPLATE_NAME'),
        lang: env('WHATSAPP_TEMPLATE_LANG', 'en'),
    },
    defaultCountryCode: '91',
    lead: {
        minFillSeconds: int('LEAD_MIN_FILL_SECONDS', 3),
        rateLimitPerHour: int('LEAD_RATE_LIMIT_PER_HOUR', 5),
        attemptsPerHour: int('LEAD_ATTEMPTS_PER_HOUR', 20),
        duplicateWindowMinutes: int('LEAD_DUPLICATE_WINDOW_MINUTES', 10),
        notifyThreaded: bool('LEAD_NOTIFY_THREADED', true),
    },
    images: {
        webpQuality: 78,
        avifQuality: int('AVIF_QUALITY', 50),
        avifEffort: int('AVIF_EFFORT', 3),
        avifMinSaving: 0.05,
        maxStoredSide: 2400,
    },
    pageCache: {
        enabled: bool('PAGE_CACHE_ENABLED', true),
        timeout: 3600,
        shortTimeout: 900,
        maxEntries: int('PAGE_CACHE_MAX_ENTRIES', 400),
    },
    timezone: 'Asia/Kolkata',
};
