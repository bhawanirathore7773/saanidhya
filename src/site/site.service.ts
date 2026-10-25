import { Injectable } from '@nestjs/common';
import { ContentVersionService, LruCache } from '../common/cache';
import { presentSite, Vm } from '../common/presenters';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SiteService {
  private cache = new LruCache<Vm>(3);
  constructor(private readonly prisma: PrismaService, private readonly version: ContentVersionService) {}

  /** The single settings row, prepared for templates. Cached until any admin edit. */
  async load(): Promise<Vm> {
    const key = `site:${await this.version.current()}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const row = await this.prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, service_areas: '', about_story: '' } });
    const site = presentSite(row);
    this.cache.set(key, site, 3600);
    return site;
  }
}
