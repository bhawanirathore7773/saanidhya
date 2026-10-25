"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lines = exports.sleep = exports.isoDate = exports.telUrl = exports.pyQuote = exports.DateOnly = void 0;
exports.slugify = slugify;
exports.truncateChars = truncateChars;
exports.truncateWords = truncateWords;
exports.stripTags = stripTags;
exports.plain = plain;
exports.escapeHtml = escapeHtml;
exports.normalizePhone = normalizePhone;
exports.whatsappUrl = whatsappUrl;
exports.extractYoutubeId = extractYoutubeId;
exports.inr = inr;
exports.formatDate = formatDate;
exports.linebreaks = linebreaks;
const config_1 = require("../config/config");
class DateOnly {
    date;
    constructor(date) {
        this.date = date;
    }
    toString() { return this.date.toISOString().slice(0, 10); }
}
exports.DateOnly = DateOnly;
function slugify(value) {
    const ascii = (value || '').normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
    return ascii.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[-\s]+/g, '-').replace(/^[-_]+|[-_]+$/g, '');
}
function truncateChars(text, limit) {
    const t = (text || '').normalize('NFC');
    const chars = Array.from(t);
    if (chars.length <= limit)
        return t;
    return chars.slice(0, Math.max(limit - 1, 0)).join('') + '…';
}
function truncateWords(text, count) {
    const words = (text || '').split(/\s+/).filter(Boolean);
    if (words.length <= count)
        return (text || '').trim();
    return words.slice(0, count).join(' ') + ' …';
}
function stripTags(html) {
    let value = html || '';
    let previous;
    do {
        previous = value;
        value = value.replace(/<[^>]*>/g, '');
    } while (value !== previous);
    return value;
}
function plain(text) {
    return stripTags(text).split(/\s+/).filter(Boolean).join(' ');
}
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function normalizePhone(raw, code = config_1.config.defaultCountryCode) {
    const digits = (raw || '').replace(/\D/g, '');
    if (digits.length === 10)
        return `${code}${digits}`;
    if (digits.length === 11 && digits.startsWith('0'))
        return `${code}${digits.slice(1)}`;
    return digits;
}
const pyQuote = (text) => encodeURIComponent(text).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()).replace(/%2F/g, '/');
exports.pyQuote = pyQuote;
const telUrl = (raw) => { const d = normalizePhone(raw); return d ? `tel:+${d}` : ''; };
exports.telUrl = telUrl;
function whatsappUrl(raw, message = '') {
    const d = normalizePhone(raw);
    if (!d)
        return '';
    const url = `https://wa.me/${d}`;
    return message ? `${url}?text=${(0, exports.pyQuote)(message)}` : url;
}
const YT_ID = /^[A-Za-z0-9_-]{11}$/;
function extractYoutubeId(value) {
    value = (value || '').trim();
    if (YT_ID.test(value))
        return value;
    if (!value)
        return '';
    if (!value.includes('://'))
        value = `https://${value}`;
    let url;
    try {
        url = new URL(value);
    }
    catch {
        return '';
    }
    const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    let candidate = '';
    if (host === 'youtu.be')
        candidate = url.pathname.replace(/^\//, '').split('/')[0];
    else if (['youtube.com', 'youtube-nocookie.com', 'music.youtube.com'].includes(host)) {
        if (url.pathname === '/watch')
            candidate = url.searchParams.get('v') || '';
        else {
            const parts = url.pathname.split('/').filter(Boolean);
            if (parts.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(parts[0]))
                candidate = parts[1];
        }
    }
    return YT_ID.test(candidate) ? candidate : '';
}
function inr(value) {
    const n = Math.trunc(Number(value));
    if (!Number.isFinite(n))
        return String(value ?? '');
    let digits = String(Math.abs(n));
    if (digits.length > 3) {
        const head = digits.slice(0, -3).replace(/(\d)(?=(\d\d)+$)/g, '$1,');
        digits = `${head},${digits.slice(-3)}`;
    }
    return n < 0 ? `-${digits}` : digits;
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function formatDate(value, fmt) {
    if (!value)
        return '';
    let y, m, d;
    if (value instanceof DateOnly) {
        y = value.date.getUTCFullYear();
        m = value.date.getUTCMonth();
        d = value.date.getUTCDate();
    }
    else {
        const parts = new Intl.DateTimeFormat('en-GB', { timeZone: config_1.config.timezone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(value);
        const get = (t) => parseInt(parts.find((p) => p.type === t).value, 10);
        y = get('year');
        m = get('month') - 1;
        d = get('day');
    }
    const pad = (n) => String(n).padStart(2, '0');
    return fmt.replace(/[djmnyYMF]/g, (c) => ({
        d: pad(d), j: String(d), m: pad(m + 1), n: String(m + 1), y: pad(y % 100), Y: String(y),
        M: MONTHS[m].slice(0, 3), F: MONTHS[m],
    }[c]));
}
function linebreaks(text) {
    const paragraphs = (text || '').replace(/\r\n|\r/g, '\n').split(/\n{2,}/);
    return paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('\n\n');
}
const isoDate = (d) => d.toISOString().replace('Z', '+00:00');
exports.isoDate = isoDate;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
exports.sleep = sleep;
const lines = (text) => (text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
exports.lines = lines;
