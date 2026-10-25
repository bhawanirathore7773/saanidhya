import { Controller, Get, NotFoundException, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { buildTrustItems, FEATURED_FIRST, livePosts, PUBLISHED, firstThen } from '../common/catalog';
import { isPartial, makePage, nextUrl, pageInfo } from '../common/http';
import { shareImageUrl } from '../common/images';
import { presentPost, presentService, presentTestimonial, presentVideo } from '../common/presenters';
import { addHeadingIds, sanitize } from '../common/richtext';
import { articleNode, buildGraph, videoNode } from '../common/schema';
import { absoluteUrl, buildSeo } from '../common/seo';
import { isoDate, pyQuote, whatsappUrl } from '../common/utils';
import { safe } from '../common/view';
import { ViewService } from '../common/view.service';
import { config } from '../config/config';
import { PrismaService } from '../prisma/prisma.service';

const PER_PAGE = 9;

@Controller()
export class ListsController {
  constructor(private readonly prisma: PrismaService, private readonly views: ViewService) {}

  @Get('videos/')
  async videos(@Req() req: Request, @Res() res: Response) {
    const site = res.locals.site;
    const total = await this.prisma.video.count({ where: PUBLISHED });
    const info = pageInfo(req.query.page, total, PER_PAGE);
    const rows = await this.prisma.video.findMany({ where: PUBLISHED, include: { event_category: true }, orderBy: FEATURED_FIRST, skip: info.skip, take: info.take });
    const videos = rows.map(presentVideo);
    const page = makePage(videos, total, info);
    const ctx: Record<string, any> = { videos, page, next_url: nextUrl(req.path, info), load_target: '#video-grid' };
    if (isPartial(req)) return this.views.render(res, 'videos/_items.html', ctx);
    const crumbs = [{ name: 'Home', url: '/' }, { name: 'Videos', url: req.path }];
    Object.assign(ctx, {
      schema: buildGraph(site, videos.map(videoNode), { breadcrumbs: crumbs }),
      seo: buildSeo(req.path, site, {
        title: `Decoration & Event Videos in ${site.city}`,
        description: `Watch videos of wedding, birthday and event decoration by ${site.business_name} in ${site.city}.`,
        noindex: !total,
      }),
      nav_active: 'videos', breadcrumbs: crumbs,
    });
    this.views.render(res, 'videos/list.html', ctx);
  }

  @Get('testimonials/')
  async testimonials(@Req() req: Request, @Res() res: Response) {
    const site = res.locals.site;
    const total = await this.prisma.testimonial.count({ where: PUBLISHED });
    const info = pageInfo(req.query.page, total, PER_PAGE);
    const rows = await this.prisma.testimonial.findMany({ where: PUBLISHED, include: { event_category: true }, orderBy: FEATURED_FIRST, skip: info.skip, take: info.take });
    const testimonials = rows.map(presentTestimonial);
    const page = makePage(testimonials, total, info);
    const ctx: Record<string, any> = { testimonials, page, next_url: nextUrl(req.path, info), load_target: '#testimonial-grid' };
    if (isPartial(req)) return this.views.render(res, 'testimonials/_items.html', ctx);
    const crumbs = [{ name: 'Home', url: '/' }, { name: 'Testimonials', url: req.path }];
    Object.assign(ctx, {
      schema: buildGraph(site, [], { breadcrumbs: crumbs }),
      seo: buildSeo(req.path, site, {
        title: `Client Reviews & Testimonials in ${site.city}`,
        description: `Read what families say about ${site.business_name}, wedding and event decorators in ${site.city}.`,
        noindex: !total,
      }),
      rating_item: buildTrustItems(site).find((i) => i.stars) ?? null, breadcrumbs: crumbs,
    });
    this.views.render(res, 'testimonials/list.html', ctx);
  }

  @Get('blog/')
  async posts(@Req() req: Request, @Res() res: Response) {
    const site = res.locals.site;
    const where = livePosts();
    const total = await this.prisma.blogPost.count({ where });
    const info = pageInfo(req.query.page, total, PER_PAGE);
    const rows = await this.prisma.blogPost.findMany({ where, include: { event_category: true }, orderBy: [{ published_at: 'desc' }, { id: 'asc' }], skip: info.skip, take: info.take });
    const posts = rows.map(presentPost);
    const page = makePage(posts, total, info);
    const ctx: Record<string, any> = { posts, page, next_url: nextUrl(req.path, info), load_target: '#blog-grid' };
    if (isPartial(req)) return this.views.render(res, 'blog/_items.html', ctx);
    const crumbs = [{ name: 'Home', url: '/' }, { name: 'Blog', url: req.path }];
    Object.assign(ctx, {
      seo: buildSeo(req.path, site, {
        title: 'Wedding & Event Decoration Ideas, Tips and Guides',
        description: `Practical decoration ideas, budget guides and planning tips for weddings, haldi, birthdays and events in ${site.city}, from ${site.business_name}.`,
        noindex: !total,
      }),
      schema: buildGraph(site, [], { breadcrumbs: crumbs }), nav_active: 'blog', breadcrumbs: crumbs,
    });
    this.views.render(res, 'blog/list.html', ctx);
  }

  @Get('blog/:slug/')
  async post(@Param('slug') rawSlug: string, @Req() req: Request, @Res() res: Response) {
    const slug = rawSlug.toLowerCase();
    const row = await this.prisma.blogPost.findFirst({
      where: { ...livePosts(), slug }, include: { event_category: true, related_service: { include: { category: true } } },
    });
    if (!row) throw new NotFoundException();
    if (rawSlug !== slug) return res.redirect(301, `/blog/${slug}/`);
    const site = res.locals.site;
    const post = presentPost(row);
    const { html: bodyHtml, toc } = addHeadingIds(sanitize(post.body));
    const service = post.related_service && post.related_service.is_published ? presentService(row.related_service as any, site.city) : null;
    const others = await this.prisma.blogPost.findMany({ where: { ...livePosts(), NOT: { id: row.id } }, include: { event_category: true }, orderBy: [{ published_at: 'desc' }, { id: 'asc' }], take: 60 });
    const more = (row.event_category_id ? firstThen(others, (o) => o.event_category_id === row.event_category_id, 3) : others.slice(0, 3)).map(presentPost);
    const canonical = absoluteUrl(req.path);
    const crumbs = [{ name: 'Home', url: '/' }, { name: 'Blog', url: '/blog/' }, { name: post.title, url: req.path }];
    this.views.render(res, 'blog/post.html', {
      seo: buildSeo(req.path, site, {
        title: post.seo_title || post.title, brand: !post.seo_title, description: post.meta_description,
        image: post.cover_image ? shareImageUrl(post.cover_image.name) : '', og_type: 'article',
        published: isoDate(post.published_at),
        modified: isoDate(new Date(Math.max(post.updated_at.getTime(), post.published_at.getTime()))),
      }),
      schema: buildGraph(site, [articleNode(post, site, canonical)], { breadcrumbs: crumbs }),
      nav_active: 'blog', post, body_html: safe(bodyHtml), toc: toc.length >= 3 ? toc : [], service, posts: more,
      share_url: 'https://wa.me/?text=' + pyQuote(`${post.title} ${canonical}`),
      whatsapp_url: whatsappUrl(site.whatsapp_number || site.phone, `Hi ${site.business_name}, I read your article "${post.title}" and would like some help planning.`),
      breadcrumbs: crumbs,
    });
  }
}
