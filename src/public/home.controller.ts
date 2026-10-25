import { Controller, Get, Res, Req } from '@nestjs/common';
import { Request, Response } from 'express';
import { BY_ORDER, buildTrustItems, FEATURED_FIRST, generalFaqs, livePosts, PUBLISHED } from '../common/catalog';
import { buildGraph, faqNode } from '../common/schema';
import { buildSeo } from '../common/seo';
import { presentFaq, presentPhoto, presentPost, presentProject, presentService, presentTestimonial, presentVideo } from '../common/presenters';
import { ViewService } from '../common/view.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HomeController {
  constructor(private readonly prisma: PrismaService, private readonly views: ViewService) {}

  @Get()
  async home(@Req() req: Request, @Res() res: Response) {
    const site = res.locals.site;
    const p = this.prisma;
    const [services, projects, videos, gallery, testimonials, packages, posts, homeFaqs] = await Promise.all([
      p.service.findMany({ where: PUBLISHED, include: { category: true }, orderBy: [{ is_featured: 'desc' }, { ordering: 'asc' }, { title: 'asc' }], take: 6 }),
      p.project.findMany({ where: PUBLISHED, include: { event_category: true }, orderBy: [{ is_featured: 'desc' }, { ordering: 'asc' }, { event_date: 'desc' }, { id: 'asc' }], take: 6 }),
      p.video.findMany({ where: PUBLISHED, include: { event_category: true }, orderBy: FEATURED_FIRST, take: 3 }),
      p.galleryImage.findMany({ where: PUBLISHED, include: { project: true }, orderBy: FEATURED_FIRST, take: 8 }),
      p.testimonial.findMany({ where: PUBLISHED, include: { event_category: true }, orderBy: FEATURED_FIRST, take: 6 }),
      p.service.findMany({ where: { ...PUBLISHED, show_in_packages: true, starting_price: { not: null } }, include: { category: true }, orderBy: [{ ordering: 'asc' }, { starting_price: 'asc' }, { id: 'asc' }], take: 3 }),
      p.blogPost.findMany({ where: livePosts(), include: { event_category: true }, orderBy: [{ published_at: 'desc' }, { id: 'asc' }], take: 3 }),
      p.faq.findMany({ where: { ...PUBLISHED, show_on_home: true }, orderBy: BY_ORDER, take: 8 }),
    ]);
    const faqs = homeFaqs.length ? homeFaqs.map(presentFaq) : await generalFaqs(p, 8);

    const title = site.default_seo_title || `Wedding & Event Decorators in ${site.city}`;
    const description = site.default_seo_description
      || `${site.business_name} plans and decorates weddings, birthdays, anniversaries and corporate events in ${site.city}. Call or WhatsApp for a clear, free quote.`;
    this.views.render(res, 'home/home.html', {
      trust_items: buildTrustItems(site),
      services: services.map((s) => presentService(s, site.city)),
      projects: projects.map(presentProject),
      videos: videos.map(presentVideo),
      gallery: gallery.map(presentPhoto),
      testimonials: testimonials.map(presentTestimonial),
      packages: packages.map((s) => presentService(s, site.city)),
      posts: posts.map(presentPost),
      faqs,
      seo: buildSeo(req.path, site, { title, description }),
      schema: buildGraph(site, faqs.length ? [faqNode(faqs)] : [], { website: true }),
    });
  }
}
