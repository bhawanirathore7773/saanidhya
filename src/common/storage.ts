import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { config } from '../config/config';
import { mediaFile } from './images';

export class UploadError extends Error {}

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'heif']);

const monthFolder = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const ensureDir = (rel: string) => fs.mkdirSync(path.dirname(mediaFile(rel)), { recursive: true });

export interface StoredImage { rel: string; width: number; height: number }

/**
 * Check that the upload really is a photo, straighten it, shrink it (so phone photos do not fill the disk)
 * and store it as JPEG (or PNG when it has transparency). `folder` may contain {ym} for year/month.
 */
export async function saveImage(buffer: Buffer, folder: string, maxSide = config.images.maxStoredSide): Promise<StoredImage> {
  let meta: sharp.Metadata;
  try { meta = await sharp(buffer).metadata(); } catch { throw new UploadError('This file is not a picture we can read. Please upload a JPG, PNG or WebP photo.'); }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw new UploadError('Please upload a JPG, PNG or WebP photo.');
  const hasAlpha = Boolean(meta.hasAlpha) && meta.format !== 'jpeg';
  const pipeline = sharp(buffer).rotate().resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true });
  const ext = hasAlpha ? 'png' : 'jpg';
  const rel = `${folder.replace('{ym}', monthFolder())}/${randomBytes(6).toString('hex')}.${ext}`;
  ensureDir(rel);
  const info = hasAlpha ? await pipeline.png({ compressionLevel: 9 }).toFile(mediaFile(rel)) : await pipeline.jpeg({ quality: 86, progressive: true, mozjpeg: true }).toFile(mediaFile(rel));
  return { rel, width: info.width, height: info.height };
}

/** Short hero video: mp4 or webm, 8 MB at most. */
export function saveVideo(file: { originalname: string; buffer: Buffer }, folder: string, maxMb = 8): string {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (!['mp4', 'webm'].includes(ext)) throw new UploadError('Please upload an MP4 or WebM video.');
  if (file.buffer.length > maxMb * 1024 * 1024) {
    throw new UploadError(`This file is ${(file.buffer.length / 1048576).toFixed(1)} MB. Please compress it to under ${maxMb} MB (a short muted hero video should be 2-4 MB).`);
  }
  const rel = `${folder}/${randomBytes(6).toString('hex')}.${ext}`;
  ensureDir(rel);
  fs.writeFileSync(mediaFile(rel), file.buffer);
  return rel;
}
