import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BY_ORDER, buildTrustItems, PUBLISHED } from '../common/catalog';
import { presentFaq } from '../common/presenters';
import { buildGraph, faqNode } from '../common/schema';
import { buildSeo } from '../common/seo';
import { ViewService } from '../common/view.service';
import { PrismaService } from '../prisma/prisma.service';

const LEGAL_UPDATED = { day: 1, month: 'October', year: 2026 };

@Controller()
export class PagesController {
  constructor(private readonly prisma: PrismaService, private readonly views: ViewService) {}

  @Get('about/')
  about(@Req() req: Request, @Res() res: Response) {
    const site = res.locals.site;
    const crumbs = [{ name: 'Home', url: '/' }, { name: 'About', url: req.path }];
    this.views.render(res, 'pages/about.html', {
      seo: buildSeo(req.path, site, {
        title: `About ${site.business_name}, Event Decorators in ${site.city}`,
        description: `Meet ${site.business_name}, the team behind wedding, birthday and event decoration in ${site.city}. Our story, how we work and the areas we serve.`,
      }),
      schema: buildGraph(site, [], { breadcrumbs: crumbs }),
      nav_active: 'about', breadcrumbs: crumbs, about_title: `About ${site.business_name}`, trust_items: buildTrustItems(site),
    });
  }

  @Get('faq/')
  async faq(@Req() req: Request, @Res() res: Response) {
    const site = res.locals.site;
    const rows = await this.prisma.faq.findMany({ where: PUBLISHED, include: { category: true, service: true }, orderBy: [{ ordering: 'asc' }, { id: 'asc' }], take: 200 });
    const items = rows.map(presentFaq);
    const general = items.filter((f) => !f.category_id && !f.service_id);
    const groups: any[] = general.length ? [{ title: 'General questions', faqs: general }] : [];
    const byCategory = new Map<number, any>(); const byService = new Map<number, any>();
    for (const item of items) {
      if (item.service_id) { if (!byService.has(item.service_id)) byService.set(item.service_id, { title: item.service.title, faqs: [], url: item.service.get_absolute_url }); byService.get(item.service_id).faqs.push(item); }
      else if (item.category_id) { if (!byCategory.has(item.category_id)) byCategory.set(item.category_id, { title: item.category.name, faqs: [] }); byCategory.get(item.category_id).faqs.push(item); }
    }
    groups.push(...byCategory.values(), ...byService.values());
    const crumbs = [{ name: 'Home', url: '/' }, { name: 'FAQ', url: req.path }];
    this.views.render(res, 'pages/faq.html', {
      seo: buildSeo(req.path, site, {
        title: `Event Decoration FAQ in ${site.city}`,
        description: `Answers to common questions about booking, pricing, themes, flowers and setup for wedding and event decoration in ${site.city}.`,
        noindex: !items.length,
      }),
      schema: buildGraph(site, items.length ? [faqNode(items)] : [], { breadcrumbs: crumbs }),
      groups, breadcrumbs: crumbs,
    });
  }

  private legal(req: Request, res: Response, template: string, title: string, description: string) {
    const site = res.locals.site;
    const crumbs = [{ name: 'Home', url: '/' }, { name: title, url: req.path }];
    this.views.render(res, template, {
      seo: buildSeo(req.path, site, { title, description }),
      schema: buildGraph(site, [], { breadcrumbs: crumbs }),
      breadcrumbs: crumbs,
      updated: LEGAL_UPDATED,
      lead: `${description} Last updated ${LEGAL_UPDATED.day} ${LEGAL_UPDATED.month} ${LEGAL_UPDATED.year}.`,
    });
  }

  @Get('privacy/')
  privacy(@Req() req: Request, @Res() res: Response) {
    this.legal(req, res, 'pages/privacy.html', 'Privacy Policy', 'How we collect, use and protect your information when you visit our website or send an enquiry.');
  }

  @Get('terms/')
  terms(@Req() req: Request, @Res() res: Response) {
    this.legal(req, res, 'pages/terms.html', 'Terms of Use', 'The terms for using our website, and how quotes and bookings work.');
  }
}
