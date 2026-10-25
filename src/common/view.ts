import * as nunjucks from 'nunjucks';
import { config } from '../config/config';
import { IMAGE_SPECS, mediaFile, renditions, Rendition } from './images';
import { addHeadingIds, sanitize } from './richtext';
import { inlineCss, staticUrl } from './static';
import { DateOnly, escapeHtml, formatDate, inr, linebreaks, truncateWords } from './utils';
import * as fs from 'fs';

export const safe = (html: string) => new nunjucks.runtime.SafeString(html);

/** Nunjucks passes keyword arguments as a trailing object flagged __keywords. */
function kwargs(args: any[]): { positional: any[]; kw: Record<string, any> } {
  const last = args[args.length - 1];
  if (last && typeof last === 'object' && last.__keywords) {
    const { __keywords, ...kw } = last;
    return { positional: args.slice(0, -1), kw };
  }
  return { positional: args, kw: {} };
}

const attr = (name: string, value: unknown) => ` ${name}="${escapeHtml(value)}"`;
const srcset = (list: Rendition[]) => list.map((r) => `${r.url} ${r.width}w`).join(', ');

function sourceName(obj: any, source: string): string {
  const field = obj?.[source];
  return field && typeof field === 'object' ? field.name : field || '';
}

function responsiveImage(...args: any[]) {
  const { positional, kw } = kwargs(args);
  const [obj, source] = positional;
  const o = { alt: '', sizes: '100vw', priority: false, css_class: '', ratio: '', eager: false, ...kw };
  const name = sourceName(obj, source);
  const specKey = `${obj?.__model}.${source}`;
  if (!name || !IMAGE_SPECS[specKey]) return '';
  let list = renditions(name, specKey);
  if (!list.length) {
    // no resized files yet (for example copied by hand): show the original picture
    if (!fs.existsSync(mediaFile(name))) return '';
    return safe(`<img src="${escapeHtml('/media/' + name)}" alt="${escapeHtml(o.alt)}" loading="${o.priority ? 'eager' : 'lazy'}" decoding="async"${o.css_class ? attr('class', o.css_class) : ''}>`);
  }
  const largest = list[list.length - 1].width;
  const attrs: [string, unknown][] = [
    ['src', list[Math.floor(list.length / 2)].url], ['srcset', srcset(list)], ['sizes', o.sizes], ['alt', o.alt], ['decoding', 'async'],
  ];
  if (o.priority) attrs.push(['loading', 'eager'], ['fetchpriority', 'high']);
  else if (o.eager) attrs.push(['loading', 'eager']);
  else attrs.push(['loading', 'lazy']);
  const srcW = obj.width; const srcH = obj.height;
  if (srcW && srcH) {
    const width = Math.min(largest, srcW);
    attrs.push(['width', width], ['height', Math.round((width * srcH) / srcW)]);
  } else if (o.ratio) {
    const [num, den] = String(o.ratio).split('/').map(Number);
    attrs.push(['width', largest], ['height', Math.round((largest * den) / num)]);
  }
  if (o.css_class) attrs.push(['class', o.css_class]);
  const img = `<img${attrs.map(([k, v]) => attr(k, v)).join('')}>`;
  const avif = renditions(name, specKey, true);
  if (!avif.length) return safe(img);
  return safe(`<picture><source type="image/avif" srcset="${escapeHtml(srcset(avif))}" sizes="${escapeHtml(o.sizes)}">${img}</picture>`);
}

function imageSrcset(...args: any[]) {
  const { positional } = kwargs(args);
  const [obj, source] = positional;
  const name = sourceName(obj, source);
  const specKey = `${obj?.__model}.${source}`;
  if (!name) return null;
  const avif = renditions(name, specKey, true);
  if (avif.length) return { src: avif[Math.floor(avif.length / 2)].url, srcset: srcset(avif), type: 'image/avif' };
  const list = renditions(name, specKey);
  if (!list.length) return null;
  return { src: list[Math.floor(list.length / 2)].url, srcset: srcset(list), type: 'image/webp' };
}

const JSON_ESCAPES: Record<string, string> = { '<': '\\u003C', '>': '\\u003E', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029' };

/**
 * Django treats an empty list, empty dict and empty string as false; plain JavaScript treats [] and {} as true.
 * Every bare variable inside {% if %} / {% elif %} is wrapped in truthy() so the templates behave as designed.
 */
export function truthy(v: any): boolean {
  if (v === null || v === undefined || v === false || v === 0 || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (v instanceof nunjucks.runtime.SafeString) return String(v).length > 0;
  if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) return Object.keys(v).length > 0;
  return true;
}
const KEYWORDS = new Set(['true', 'false', 'none', 'null', 'undefined']);
export function wrapConditions(source: string): string {
  return source.replace(/\{%(-?)\s*(if|elif)\s+([\s\S]*?)\s*(-?)%\}/g, (_m, l: string, kw: string, cond: string, r: string) => {
    const parts = cond.split(/\s+(and|or)\s+/);
    const wrapped = parts.map((part, i) => {
      if (i % 2) return part;
      const m = /^(not\s+)?([A-Za-z_][\w.]*)$/.exec(part.trim());
      return m && !KEYWORDS.has(m[2]) ? `${m[1] || ''}truthy(${m[2]})` : part;
    });
    return `{%${l} ${kw} ${wrapped.join(' ')} ${r}%}`;
  });
}

class ViewLoader extends nunjucks.FileSystemLoader {
  getSource(name: string) {
    const found = super.getSource(name);
    if (found) found.src = wrapConditions(found.src);
    return found;
  }
}

export function createViewEnv(): nunjucks.Environment {
  const env = new nunjucks.Environment(
    new ViewLoader(config.viewsDir, { noCache: !config.production, throwOnUndefined: false }),
    { autoescape: true, throwOnUndefined: false },
  );

  env.addGlobal('truthy', truthy);
  env.addGlobal('static', (rel: string) => staticUrl(rel));
  env.addGlobal('inline_css', (rel: string) => safe(inlineCss(rel)));
  env.addGlobal('icon', (name: string, css = 'h-5 w-5') =>
    safe(`<svg class="icon ${escapeHtml(css)}" aria-hidden="true" focusable="false"><use href="#i-${escapeHtml(name)}"></use></svg>`));
  env.addGlobal('stars', (rating: unknown, css = 'h-4 w-4') => {
    let r = Number(rating); r = Number.isFinite(r) ? Math.max(0, Math.min(5, Math.trunc(r))) : 0;
    const icons = Array.from({ length: 5 }, (_, i) =>
      `<svg class="icon ${escapeHtml(css)} ${i < r ? 'fill-gold-500 text-gold-500' : 'text-maroon-200'}" aria-hidden="true" focusable="false"><use href="#i-star"></use></svg>`).join('');
    return safe(`<span class="inline-flex gap-0.5" role="img" aria-label="Rated ${r} out of 5">${icons}</span>`);
  });
  env.addGlobal('responsive_image', responsiveImage);
  env.addGlobal('image_srcset', imageSrcset);
  env.addGlobal('json_ld', (data: unknown) => {
    const text = JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (c) => JSON_ESCAPES[c]);
    return safe(`<script type="application/ld+json">${text}</script>`);
  });
  env.addGlobal('now', (fmt: string) => formatDate(new Date(), fmt));
  env.addGlobal('footer_services', function (this: any) { return this.ctx?.footer_services_list ?? []; });

  env.addFilter('date', (value: Date | DateOnly | null, fmt: string) => formatDate(value, fmt));
  env.addFilter('inr', (value: unknown) => inr(value));
  env.addFilter('rich_text', (html: string) => safe(sanitize(html)));
  env.addFilter('truncatewords', (value: string, n: number) => truncateWords(value, n));
  env.addFilter('slice_to', (value: any, n: number) => (typeof value === 'string' ? value.slice(0, n) : Array.from(value || []).slice(0, n)));
  env.addFilter('linebreaks', (value: string) => safe(linebreaks(value)));
  env.addFilter('heading_ids', (html: string) => addHeadingIds(html));
  return env;
}
