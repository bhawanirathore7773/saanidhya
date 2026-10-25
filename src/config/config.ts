import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

/** Project root: works from src/ (ts-node/jest) and from dist/ (production). */
export const ROOT = path.resolve(__dirname, '..', '..', fs.existsSync(path.resolve(__dirname, '..', '..', 'package.json')) ? '' : '..');

/** Tiny .env reader so no extra package is needed. Real environment variables always win. */
function loadDotEnv(file: string) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv(path.join(ROOT, '.env'));

const env = (key: string, fallback = '') => (process.env[key] ?? fallback).trim();
const bool = (key: string, fallback: boolean) => {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
};
const int = (key: string, fallback: number) => {
  const n = parseInt(env(key), 10);
  return Number.isFinite(n) ? n : fallback;
};

const production = env('NODE_ENV', 'development') === 'production';
let secret = env('SECRET_KEY');
if (!secret) {
  if (production) throw new Error('SECRET_KEY is missing. Add a long random value in your hosting environment variables.');
  secret = randomBytes(32).toString('hex'); // development only: sessions reset on every restart
}

const adminUrl = env('ADMIN_URL', 'admin/').replace(/^\/+/, '');

export const config = {
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

  uploadDir: path.resolve(env('UPLOAD_DIR') || path.join(ROOT, 'storage', 'uploads')),
  mediaUrl: '/media/',
  staticDir: path.join(ROOT, 'public', 'static'),
  viewsDir: path.join(ROOT, 'views'),

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
export type Config = typeof config;
