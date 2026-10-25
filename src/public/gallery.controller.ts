import { Controller, Get, NotFoundException, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BY_ORDER, PUBLISHED } from '../common/catalog';
import { htmxTarget, isPartial, makePage, nextUrl, pageInfo } from '../common/http';
import { shareImageUrl } from '../common/images';
import { presentCategory, presentPhoto, presentProject } from '../common/presenters';
import { buildGraph } from '../common/schema';
import { buildSeo } from '../common/seo';
import { ViewService } from '../common/view.service';
import { PrismaService } from '../prisma/prisma.service';

const PER_PAGE = 12;
const FIRST_SCREEN_PHOTOS = 4;
const PROJECT_PHOTO_LIMIT = 60;

@Controller('gallery')
export class GalleryController {
  constructor(private readonly prisma: PrismaService, private readonly views: ViewService) {}

  @Get()
  async list(@Req() req: Request, @Res() res: Response) {
    const site = res.locals.site;
    const cats = await this.prisma.eventCategory.findMany({
      where: { ...PUBLISHED, gallery_images: { some: PUBLISHED } }, orderBy: [{ ordering: 'asc' }, { name: 'asc' }],
    });
    const categories = cats.map(presentCategory);
    const slug = typeof req.query.type === 'string' ? req.query.type : '';
    const current = categories.find((c) => c.slug === slug) ?? null;
    const where = { ...PUBLISHED, ...(current ? { event_category_id: current.id } : {}) };
    const total = await this.prisma.galleryImage.count({ where });
    const info = pageInfo(req.query.page, total, PER_PAGE);
    const rows = await this.prisma.galleryImage.findMany({ where, include: { project: true }, orderBy: BY_ORDER, skip: info.skip, take: info.take });
    const photos = rows.map(presentPhoto);
    photos.forEach((photo, i) => { photo.eager = info.number === 1 && i < FIRST_SCREEN_PHOTOS; });
    const page = makePage(photos, total, info);
    const ctx: Record<string, any> = {
      categories, current, page, photos,
      next_url: nextUrl(req.path, info, { type: current ? current.slug : '' }), load_target: '#gallery-chunks',
    };
    if (isPartial(req)) {
      return this.views.render(res, htmxTarget(req) === 'gallery-chunks' ? 'gallery/_items.html' : 'gallery/_region.html', ctx);
    }
    const crumbs = [{ name: 'Home', url: '/' }, { name: 'Portfolio', url: req.path }];
    Object.assign(ctx, {
      seo: buildSeo(req.path, site, {
        title: `Event Decoration Photo Gallery in ${site.city}`,
        description: `Photos of wedding, haldi, mehndi, birthday, anniversary and party decoration by ${site.business_name} in ${site.city}. Browse by event type.`,
        noindex: !total,
      }),
      nav_active: 'gallery', breadcrumbs: crumbs, schema: buildGraph(site, [], { breadcrumbs: crumbs }),
    });
    this.views.render(res, 'gallery/list.html', ctx);
  }

  @Get(':slug/')
  async project(@Param('slug') rawSlug: string, @Req() req: Request, @Res() res: Response) {
    const slug = rawSlug.toLowerCase();
    const row = await this.prisma.project.findFirst({ where: { ...PUBLISHED, slug }, include: { event_category: true, service: { include: { category: true } } } });
    if (!row) throw new NotFoundException();
    if (rawSlug !== slug) return res.redirect(301, `/gallery/${slug}/`);
    const site = res.locals.site;
    const [photoRows, more] = await Promise.all([
      this.prisma.galleryImage.findMany({ where: { ...PUBLISHED, project_id: row.id }, include: { project: true }, orderBy: BY_ORDER, take: PROJECT_PHOTO_LIMIT }),
      this.prisma.project.findMany({
        where: { ...PUBLISHED, event_category_id: row.event_category_id, NOT: { id: row.id } }, include: { event_category: true },
        orderBy: [{ is_featured: 'desc' }, { ordering: 'asc' }, { event_date: 'desc' }, { id: 'asc' }], take: 3,
      }),
    ]);
    const project = presentProject(row);
    const crumbs = [{ name: 'Home', url: '/' }, { name: 'Portfolio', url: '/gallery/' }, { name: project.title, url: req.path }];
    this.views.render(res, 'gallery/project.html', {
      seo: buildSeo(req.path, site, {
        title: project.seo_title || project.title, brand: !project.seo_title, description: project.meta_description,
        image: project.cover_image ? shareImageUrl(project.cover_image.name) : '',
      }),
      schema: buildGraph(site, [], { breadcrumbs: crumbs }),
      nav_active: 'gallery', project, photos: photoRows.map(presentPhoto), projects: more.map(presentProject),
      service: project.service && project.service.is_published ? project.service : null, breadcrumbs: crumbs,
    });
  }
}
