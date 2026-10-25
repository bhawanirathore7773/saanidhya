import { config } from '../config/config';

/** A calendar date without a time zone (event dates). */
export class DateOnly {
  constructor(public readonly date: Date) {}
  toString() { return this.date.toISOString().slice(0, 10); }
}

export function slugify(value: string): string {
  const ascii = (value || '').normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
  return ascii.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[-\s]+/g, '-').replace(/^[-_]+|[-_]+$/g, '');
}

/** Django's Truncator.chars(limit, "…"): short text is untouched, long text is cut and gets one ellipsis character. */
export function truncateChars(text: string, limit: number): string {
  const t = (text || '').normalize('NFC');
  const chars = Array.from(t);
  if (chars.length <= limit) return t;
  return chars.slice(0, Math.max(limit - 1, 0)).join('') + '…';
}

export function truncateWords(text: string, count: number): string {
  const words = (text || '').split(/\s+/).filter(Boolean);
  if (words.length <= count) return (text || '').trim();
  return words.slice(0, count).join(' ') + ' …';
}

export function stripTags(html: string): string {
  let value = html || '';
  let previous: string;
  do {
    previous = value;
    value = value.replace(/<[^>]*>/g, '');
  } while (value !== previous);
  return value;
}

export function plain(text: string): string {
  return stripTags(text).split(/\s+/).filter(Boolean).join(' ');
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export function normalizePhone(raw: string, code = config.defaultCountryCode): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `${code}${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `${code}${digits.slice(1)}`;
  return digits;
}

/** Python's urllib quote(): everything except letters, digits _ . - ~ and / is percent-encoded. */
export const pyQuote = (text: string) =>
  encodeURIComponent(text).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()).replace(/%2F/g, '/');

export const telUrl = (raw: string) => { const d = normalizePhone(raw); return d ? `tel:+${d}` : ''; };

export function whatsappUrl(raw: string, message = ''): string {
  const d = normalizePhone(raw);
  if (!d) return '';
  const url = `https://wa.me/${d}`;
  return message ? `${url}?text=${pyQuote(message)}` : url;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
export function extractYoutubeId(value: string): string {
  value = (value || '').trim();
  if (YT_ID.test(value)) return value;
  if (!value) return '';
  if (!value.includes('://')) value = `https://${value}`;
  let url: URL;
  try { url = new URL(value); } catch { return ''; }
  const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  let candidate = '';
  if (host === 'youtu.be') candidate = url.pathname.replace(/^\//, '').split('/')[0];
  else if (['youtube.com', 'youtube-nocookie.com', 'music.youtube.com'].includes(host)) {
    if (url.pathname === '/watch') candidate = url.searchParams.get('v') || '';
    else {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(parts[0])) candidate = parts[1];
    }
  }
  return YT_ID.test(candidate) ? candidate : '';
}

/** Indian digit grouping: 125000 -> 1,25,000 */
export function inr(value: unknown): string {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return String(value ?? '');
  let digits = String(Math.abs(n));
  if (digits.length > 3) {
    const head = digits.slice(0, -3).replace(/(\d)(?=(\d\d)+$)/g, '$1,');
    digits = `${head},${digits.slice(-3)}`;
  }
  return n < 0 ? `-${digits}` : digits;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Django `date` filter subset used by the templates: d j m n y Y M F. Datetimes are shown in IST. */
export function formatDate(value: Date | DateOnly | null | undefined, fmt: string): string {
  if (!value) return '';
  let y: number, m: number, d: number;
  if (value instanceof DateOnly) {
    y = value.date.getUTCFullYear(); m = value.date.getUTCMonth(); d = value.date.getUTCDate();
  } else {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: config.timezone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(value);
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)!.value, 10);
    y = get('year'); m = get('month') - 1; d = get('day');
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return fmt.replace(/[djmnyYMF]/g, (c) => ({
    d: pad(d), j: String(d), m: pad(m + 1), n: String(m + 1), y: pad(y % 100), Y: String(y),
    M: MONTHS[m].slice(0, 3), F: MONTHS[m],
  }[c] as string));
}

export function linebreaks(text: string): string {
  const paragraphs = (text || '').replace(/\r\n|\r/g, '\n').split(/\n{2,}/);
  return paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('\n\n');
}

/** 2026-10-03T08:33:17.526+00:00 (same style the original site printed) */
export const isoDate = (d: Date) => d.toISOString().replace('Z', '+00:00');
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const lines = (text: string) => (text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
