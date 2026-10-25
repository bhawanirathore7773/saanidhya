import * as fs from 'fs';
import { imageSize } from 'image-size';
import sanitizeHtml from 'sanitize-html';
import { config } from '../config/config';
import { mediaFile } from './images';
import { slugify, stripTags } from './utils';

const TAGS = ['a', 'b', 'blockquote', 'br', 'em', 'figcaption', 'figure', 'h2', 'h3', 'h4', 'i', 'img', 'li', 'ol', 'p', 's', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul'];
const ATTRS: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'title', 'rel'], img: ['src', 'alt', 'width', 'height'], figure: ['class'], table: ['class'],
  td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'],
};

const IMG = /<img\b[^>]*>/g;
const SRC = /\ssrc="([^"]+)"/;
const SIZED = /\s(width|height)=/;
const sizes = new Map<string, [number, number] | null>();

function localImageSize(src: string): [number, number] | null {
  if (!src.startsWith(config.mediaUrl) || src.includes('..')) return null;
  const rel = decodeURIComponent(src.slice(config.mediaUrl.length).split('?')[0]);
  if (sizes.has(rel)) return sizes.get(rel)!;
  let result: [number, number] | null = null;
  try {
    const dim = imageSize(fs.readFileSync(mediaFile(rel)));
    if (dim.width && dim.height) result = [dim.width, dim.height];
  } catch { /* missing or unreadable: leave the tag alone */ }
  if (sizes.size > 5000) sizes.clear();
  if (result) sizes.set(rel, result);
  return result;
}

/** Give every article picture a width/height so the page does not jump while images load. */
export function addImageDimensions(html: string): string {
  return html.replace(IMG, (tag) => {
    const src = SRC.exec(tag);
    if (!src || SIZED.test(tag)) return tag;
    const size = localImageSize(src[1]);
    return size ? tag.replace(/\s*\/?>$/, '') + ` width="${size[0]}" height="${size[1]}">` : tag;
  });
}

/** Editor HTML -> safe HTML (no scripts, no inline styles, only the tags above). */
export function sanitize(html: string): string {
  const cleaned = sanitizeHtml(html || '', {
    allowedTags: TAGS,
    allowedAttributes: ATTRS,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    transformTags: { a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } }) },
  });
  return addImageDimensions(cleaned).replace(/<img\b/g, '<img loading="lazy" decoding="async"');
}

const HEADING = /<(h[23])>([\s\S]*?)<\/\1>/g;
/** Add ids to h2/h3 headings and return the h2 list for the table of contents. */
export function addHeadingIds(html: string): { html: string; toc: { id: string; text: string }[] } {
  const used = new Set<string>();
  const toc: { id: string; text: string }[] = [];
  const out = html.replace(HEADING, (_m, tag: string, inner: string) => {
    const text = stripTags(inner).split(/\s+/).filter(Boolean).join(' ');
    const base = slugify(text).slice(0, 60) || 'section';
    let slug = base; let n = 2;
    while (used.has(slug)) { slug = `${base}-${n}`; n += 1; }
    used.add(slug);
    if (tag === 'h2') toc.push({ id: slug, text });
    return `<${tag} id="${slug}">${inner}</${tag}>`;
  });
  return { html: out, toc };
}
