import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { config } from '../config/config';
import { PrismaService } from '../prisma/prisma.service';
import { SiteService } from '../site/site.service';
import { ContentVersionService, LruCache } from './cache';
import { PUBLISHED } from './catalog';
import { FOOTER_LINKS, NAV_ITEMS, QUOTE_PATH } from './navigation';
import { defaultSeo } from './seo';

/** Values every page template needs: site settings, menu, footer links, default SEO. */
@Injectable()
export class ContextMiddleware implements NestMiddleware {
  private footer = new LruCache<{ title: string; url: string }[]>(4);
  constructor(private readonly site: SiteService, private readonly version: ContentVersionService, private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const site = await this.site.load();
      const v = await this.version.current();
      const path = req.path;
      res.locals = {
        ...res.locals,
        site,
        SITE_URL: config.siteUrl,
        nav_items: NAV_ITEMS.map((item) => ({ ...item, active: path === item.path || path.startsWith(item.path) })),
        footer_links: FOOTER_LINKS,
        quote_path: QUOTE_PATH,
        content_version: v,
        seo: defaultSeo(path, site),
        footer_services_list: await this.footerServices(v),
      };
      next();
    } catch (err) { next(err); }
  }

  private async footerServices(version: number) {
    const key = `footer:${version}`;
    const hit = this.footer.get(key);
    if (hit) return hit;
    const rows = await this.prisma.service.findMany({ where: PUBLISHED, orderBy: [{ ordering: 'asc' }, { title: 'asc' }], take: 6, select: { title: true, slug: true } });
    const items = rows.map((s) => ({ title: s.title, url: `/${s.slug}/` }));
    this.footer.set(key, items, 3600);
    return items;
  }
}
