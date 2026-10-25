import { Controller, Get, NotFoundException, Next, Param, Req, Res } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { config } from '../config/config';
import { BY_ORDER, FEATURED_FIRST, firstThen, generalFaqs, livePosts, PUBLISHED } from '../common/catalog';
import { presentCategory, presentFaq, presentPhoto, presentPost, presentProject, presentService, presentTestimonial } from '../common/presenters';
import { buildGraph, faqNode, serviceNode } from '../common/schema';
import { buildSeo } from '../common/seo';
import { shareImageUrl } from '../common/images';
import { whatsappUrl } from '../common/utils';
import { ViewService } from '../common/view.service';
import { PrismaService } from '../prisma/prisma.service';

const QUOTE_URL = '/contact/';

@Controller()
export class ServicesController {
  constructor(private readonly prisma: PrismaService, private readonly views: ViewService) {}

  @Get('services/')
  async list(@Req() req: Request, @Res() res: Response) {
    const site = res.locals.site;
    const rows = await this.prisma.eventCategory.findMany({
      where: PUBLISHED, orderBy: BY_ORDER,
      include: { services: { where: PUBLISHED, orderBy: [{ ordering: 'asc' }, { title: 'asc' }, { id: 'asc' }] } },
    });
    const categories = rows
      .filter((c) => c.services.length)
      .map((c) => ({ ...presentCategory(c), live_services: c.services.map((s) => presentService({ ...s, category: c }, site.city)) }));
    const faqs = await generalFaqs(this.prisma);
    const crumbs = [{ name: 'Home', url: '/' }, { name: 'Services', url: req.path }];
    this.views.render(res, 'services/list.html', {
      seo: buildSeo(req.path, site, {
        title: `Event Decoration Services in ${site.city}`,
        description: `Wedding, engagement, haldi, birthday, anniversary and corporate event decoration and management in ${site.city}. See our services and get a free quote.`,
      }),
      schema: buildGraph(site, faqs.length ? [faqNode(faqs)] : [], { breadcrumbs: crumbs }),
      nav_active: 'services', categories,
      hero_title: `Decoration and event services in ${site.city}`,
      hero_lead: 'Weddings, functions, birthdays, anniversaries and corporate events. Pick what you need, or tell us your idea and we will plan it with you.',
      faqs, breadcrumbs: crumbs,
    });
  }

  @Get('packages/')
  async packages(@Req() req: Request, @Res() res: Response) {
    const site = res.locals.site;
    const rows = await this.prisma.service.findMany({
      where: { ...PUBLISHED, show_in_packages: true, starting_price: { not: null } }, include: { category: true },
      orderBy: [{ category: { ordering: 'asc' } }, { ordering: 'asc' }, { starting_price: 'asc' }, { id: 'asc' }],
    });
    const faqs = await generalFaqs(this.prisma, 6);
    const crumbs = [{ name: 'Home', url: '/' }, { name: 'Packages', url: req.path }];
    this.views.render(res, 'services/packages.html', {
      seo: buildSeo(req.path, site, {
        title: `Decoration Packages & Prices in ${site.city}`,
        description: `See starting prices for wedding, birthday, anniversary and event decoration in ${site.city}, and how the final price is worked out.`,
        noindex: !rows.length,
      }),
      schema: buildGraph(site, faqs.length ? [faqNode(faqs)] : [], { breadcrumbs: crumbs }),
      nav_active: 'packages', packages: rows.map((s) => presentService(s, site.city)),
      hero_title: 'Packages and starting prices',
      hero_lead: 'See where prices start for each type of event, and what decides your final quote. No hidden extras.',
      faqs, breadcrumbs: crumbs,
    });
  }
}

/** Service pages live at the site root (/<slug>/), so this controller is registered last. */
@Controller()
export class ServiceDetailController {
  constructor(private readonly prisma: PrismaService, private readonly views: ViewService) {}

  @Get(':slug/')
  async detail(@Param('slug') rawSlug: string, @Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    if (rawSlug === config.adminBase.slice(1)) return next(); // /admin/ belongs to the admin dashboard
    if (rawSlug !== rawSlug.toLowerCase()) return res.redirect(301, `/${rawSlug.toLowerCase()}/`);
    const p = this.prisma;
    const row = await p.service.findFirst({ where: { ...PUBLISHED, slug: rawSlug }, include: { category: true } });
    if (!row) throw new NotFoundException();
    const site = res.locals.site;
    const service = presentService(row, site.city);
    const category = service.category;
    const [projA, projB, gallery, faqRows, testimonials, postA, postB, others] = await Promise.all([
      p.project.findMany({ where: { ...PUBLISHED, service_id: row.id }, include: { event_category: true }, orderBy: [{ is_featured: 'desc' }, { ordering: 'asc' }, { event_date: 'desc' }, { id: 'asc' }], take: 3 }),
      p.project.findMany({ where: { ...PUBLISHED, event_category_id: row.category_id, NOT: { service_id: row.id } }, include: { event_category: true }, orderBy: [{ is_featured: 'desc' }, { ordering: 'asc' }, { event_date: 'desc' }, { id: 'asc' }], take: 3 }),
      p.galleryImage.findMany({ where: { ...PUBLISHED, event_category_id: row.category_id }, include: { project: true }, orderBy: FEATURED_FIRST, take: 8 }),
      p.faq.findMany({ where: { ...PUBLISHED, OR: [{ service_id: row.id }, { category_id: row.category_id }] }, orderBy: BY_ORDER, take: 40 }),
      p.testimonial.findMany({ where: { ...PUBLISHED, event_category_id: row.category_id }, include: { event_category: true }, orderBy: FEATURED_FIRST, take: 3 }),
      p.blogPost.findMany({ where: { ...livePosts(), related_service_id: row.id }, include: { event_category: true }, orderBy: [{ published_at: 'desc' }, { id: 'asc' }], take: 3 }),
      p.blogPost.findMany({ where: { ...livePosts(), event_category_id: row.category_id, NOT: { related_service_id: row.id } }, include: { event_category: true }, orderBy: [{ published_at: 'desc' }, { id: 'asc' }], take: 3 }),
      p.service.findMany({ where: { ...PUBLISHED, NOT: { id: row.id } }, include: { category: true }, orderBy: [{ ordering: 'asc' }, { title: 'asc' }, { id: 'asc' }], take: 60 }),
    ]);
    const projects = [...projA, ...projB].slice(0, 3).map(presentProject);
    const faqSorted = firstThen(faqRows, (f) => f.service_id === row.id, 8);
    const faqs = faqSorted.length ? faqSorted.map(presentFaq) : await generalFaqs(p, 6);
    const guides = [...postA, ...postB].slice(0, 3).map(presentPost);
    const otherServices = firstThen(others, (s) => s.category_id === row.category_id, 3).map((s) => presentService(s, site.city));

    const crumbs = [{ name: 'Home', url: '/' }, { name: 'Services', url: '/services/' }, { name: service.title, url: req.path }];
    this.views.render(res, 'services/detail.html', {
      seo: buildSeo(req.path, site, {
        title: service.seo_title || service.title, brand: !service.seo_title, description: service.meta_description,
        image: service.cover_image ? shareImageUrl(service.cover_image.name) : '',
      }),
      schema: buildGraph(site, [serviceNode(service), faqs.length ? faqNode(faqs) : null], { breadcrumbs: crumbs }),
      nav_active: 'services', service, category, projects,
      gallery: gallery.map(presentPhoto), faqs, testimonials: testimonials.map(presentTestimonial), posts: guides, services: otherServices,
      quote_url: `${QUOTE_URL}?service=${service.slug}`,
      whatsapp_url: whatsappUrl(site.whatsapp_number || site.phone, `Hi ${site.business_name}, I am interested in ${service.title}. Could you please share the details and a quote?`),
      breadcrumbs: crumbs,
      cta_title: `Planning ${service.title.split(' in ')[0].toLowerCase()}?`,
    });
  }
}
