import * as fs from 'fs';
import * as path from 'path';
import { imageSize } from 'image-size';
import sharp from 'sharp';
import { config } from '../config/config';

sharp.cache(false);       // do not keep decoded photos in memory
sharp.concurrency(1);     // one photo at a time: friendly to shared hosting limits

export interface ImageSpec {
  widths: Record<string, number>;  // sm / md / lg -> pixel width
  square?: boolean;                // crop to a square (client avatars)
  share?: boolean;                 // also make a 1200x630 JPEG for WhatsApp / Facebook previews
  avif?: boolean;                  // default true
}

/** Which sizes are made for which upload field. Key = "Model.field". */
export const IMAGE_SPECS: Record<string, ImageSpec> = {
  'EventCategory.cover_image': { widths: { sm: 480, md: 800, lg: 1200 } },
  'Service.cover_image': { widths: { sm: 480, md: 800, lg: 1200 }, share: true },
  'Project.cover_image': { widths: { sm: 480, md: 800, lg: 1200 }, share: true },
  'GalleryImage.image': { widths: { sm: 480, md: 800, lg: 1400 } },
  'Video.custom_thumbnail': { widths: { sm: 480, md: 800 } },
  'BlogPost.cover_image': { widths: { sm: 480, md: 800, lg: 1200 }, share: true },
  'Testimonial.photo': { widths: { sm: 96, md: 192 }, square: true, avif: false },
  'SiteSettings.hero_poster': { widths: { sm: 480, md: 900, lg: 1600 } },
  'SiteSettings.about_photo': { widths: { sm: 480, md: 800, lg: 1200 } },
};
const LABELS = ['sm', 'md', 'lg'];

export const mediaUrl = (rel: string) => (rel ? config.mediaUrl + rel.replace(/^\/+/, '') : '');
export const mediaFile = (rel: string) => path.join(config.uploadDir, rel);

export function renditionRel(rel: string, label: string, ext: string): string {
  const p = path.posix.parse(rel);
  return path.posix.join(p.dir, `${p.name}.${label}.${ext}`);
}

const exists = (rel: string) => { try { return fs.existsSync(mediaFile(rel)); } catch { return false; } };
const size = (rel: string) => fs.statSync(mediaFile(rel)).size;

/** Make every size (WebP + AVIF) for one stored photo. Safe to run again. */
export async function generateRenditions(rel: string, specKey: string): Promise<void> {
  const spec = IMAGE_SPECS[specKey];
  if (!rel || !spec) return;
  const source = mediaFile(rel);
  const buffer = fs.readFileSync(source);
  for (const [label, width] of Object.entries(spec.widths)) {
    const base = () => {
      const img = sharp(buffer).rotate();
      return spec.square ? img.resize(width, width, { fit: 'cover' }) : img.resize({ width, fit: 'inside', withoutEnlargement: true });
    };
    await base().webp({ quality: config.images.webpQuality }).toFile(mediaFile(renditionRel(rel, label, 'webp')));
    if (spec.avif !== false) {
      try {
        await base().avif({ quality: config.images.avifQuality, effort: config.images.avifEffort }).toFile(mediaFile(renditionRel(rel, label, 'avif')));
      } catch { /* AVIF not available on this server: WebP is used */ }
    }
  }
  if (spec.share) {
    await sharp(buffer).rotate().resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 80, mozjpeg: true }).toFile(mediaFile(renditionRel(rel, 'share', 'jpg')));
  }
  memo.clear();
}

export interface Rendition { width: number; url: string }
const memo = new Map<string, Rendition[]>();

/** [{width,url}] sorted by width, only files that exist. AVIF is offered only if it is clearly smaller than the WebP. */
export function renditions(rel: string, specKey: string, avif = false): Rendition[] {
  const spec = IMAGE_SPECS[specKey];
  if (!rel || !spec) return [];
  if (avif && spec.avif === false) return [];
  const memoKey = `${rel}|${specKey}|${avif}`;
  const hit = memo.get(memoKey);
  if (hit) return hit;
  const found: Rendition[] = [];
  let complete = true;
  for (const label of LABELS) {
    const width = spec.widths[label];
    if (!width) continue;
    const file = renditionRel(rel, label, avif ? 'avif' : 'webp');
    if (!exists(file)) { complete = false; continue; }
    if (avif) {
      const webp = renditionRel(rel, label, 'webp');
      if (exists(webp) && size(file) > size(webp) * (1 - config.images.avifMinSaving)) continue;
    }
    found.push({ width, url: mediaUrl(file) });
  }
  found.sort((a, b) => a.width - b.width);
  if (complete && found.length) { if (memo.size > 20000) memo.clear(); memo.set(memoKey, found); }
  return found;
}

/** URL of one WebP size (falls back to the original photo). */
export function renditionUrl(rel: string, specKey: string, label: string): string {
  if (!rel) return '';
  const file = renditionRel(rel, label, 'webp');
  return exists(file) ? mediaUrl(file) : mediaUrl(rel);
}

export function shareImageUrl(rel: string): string {
  if (!rel) return '';
  const file = renditionRel(rel, 'share', 'jpg');
  return exists(file) ? mediaUrl(file) : mediaUrl(rel);
}

/** Remove a stored photo and all sizes made from it. */
export function deleteMedia(rel: string): void {
  if (!rel) return;
  try {
    const p = path.posix.parse(rel);
    const dir = mediaFile(p.dir);
    for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
      if (name === p.base || name.startsWith(`${p.name}.`)) fs.unlinkSync(path.join(dir, name));
    }
    memo.clear();
  } catch { /* already gone */ }
}

const dims = new Map<string, { width: number; height: number } | null>();
/** Real pixel size of a stored photo (read from the file header once, then remembered). */
export function imageDimensions(rel: string): { width: number; height: number } | null {
  if (!rel) return null;
  if (dims.has(rel)) return dims.get(rel)!;
  let result: { width: number; height: number } | null = null;
  try {
    const d = imageSize(fs.readFileSync(mediaFile(rel)));
    if (d.width && d.height) result = { width: d.width, height: d.height };
  } catch { /* missing file */ }
  if (dims.size > 20000) dims.clear();
  dims.set(rel, result);
  return result;
}
