/** node dist/scripts/regenerate-images.js  -> (re)make every WebP/AVIF size for all uploaded photos. */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import * as fs from 'fs';
import { AppModule } from '../app.module';
import { generateRenditions, mediaFile } from '../common/images';
import { PrismaService } from '../prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const p = app.get(PrismaService);
  const jobs: [string, string][] = [];
  const add = (rows: any[], field: string, key: string) => rows.forEach((r) => r[field] && jobs.push([r[field], key]));
  add(await p.eventCategory.findMany({ select: { cover_image: true } }), 'cover_image', 'EventCategory.cover_image');
  add(await p.service.findMany({ select: { cover_image: true } }), 'cover_image', 'Service.cover_image');
  add(await p.project.findMany({ select: { cover_image: true } }), 'cover_image', 'Project.cover_image');
  add(await p.galleryImage.findMany({ select: { image: true } }), 'image', 'GalleryImage.image');
  add(await p.video.findMany({ select: { custom_thumbnail: true } }), 'custom_thumbnail', 'Video.custom_thumbnail');
  add(await p.blogPost.findMany({ select: { cover_image: true } }), 'cover_image', 'BlogPost.cover_image');
  add(await p.testimonial.findMany({ select: { photo: true } }), 'photo', 'Testimonial.photo');
  const site = await p.siteSettings.findUnique({ where: { id: 1 } });
  if (site?.hero_poster) jobs.push([site.hero_poster, 'SiteSettings.hero_poster']);
  if (site?.about_photo) jobs.push([site.about_photo, 'SiteSettings.about_photo']);
  let done = 0;
  for (const [rel, key] of jobs) {
    if (!fs.existsSync(mediaFile(rel))) { console.warn(`missing file: ${rel}`); continue; }
    await generateRenditions(rel, key); done += 1;
  }
  console.log(`Resized ${done} photos.`);
  await app.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
