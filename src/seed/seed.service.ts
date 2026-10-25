import { Injectable } from '@nestjs/common';
import { ContentVersionService } from '../common/cache';
import { sanitize } from '../common/richtext';
import { uniqueSlug } from '../common/slug';
import { truncateChars } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { SiteService } from '../site/site.service';
import seed from './seed-data.json';

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m));

/** Starter categories, service pages, FAQs and two articles. Safe to run again: it never overwrites edits. */
@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaService, private readonly versions: ContentVersionService, private readonly site: SiteService) {}

  private uniqueSlug(model: 'service' | 'blogPost' | 'eventCategory', text: string): Promise<string> {
    return uniqueSlug(this.prisma[model] as any, text, { fallback: model === 'service' ? 'service' : model === 'blogPost' ? 'blogpost' : 'eventcategory', reserved: model === 'service' });
  }

  async run(): Promise<{ categories: number; services: number; faqs: number; articles: number; city: string }> {
    const p = this.prisma;
    const settings = await p.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, service_areas: '', about_story: '' } });
    const city = settings.city;
    const created = { categories: 0, services: 0, faqs: 0, articles: 0 };
    const categories: Record<string, number> = {};

    for (const c of seed.categories) {
      let row = await p.eventCategory.findUnique({ where: { name: c.name } });
      if (!row) {
        row = await p.eventCategory.create({
          data: { name: c.name, slug: await this.uniqueSlug('eventCategory', c.name), short_description: c.short_description, description: '', ordering: c.ordering },
        });
        created.categories += 1;
      }
      categories[c.name] = row.id;
    }

    let order = 0;
    for (const s of seed.services) {
      order += 1;
      const title = fill(s.title, { city });
      if (await p.service.findFirst({ where: { title }, select: { id: true } })) continue;
      await p.service.create({
        data: {
          title, slug: await this.uniqueSlug('service', title), category_id: categories[s.category],
          short_description: fill(s.short, { city }), description: s.paragraphs.map((x: string) => `<p>${fill(x, { city })}</p>`).join(''),
          highlights: s.highlights.join('\n'), focus_keyword: fill(s.keyword, { city }), is_featured: s.featured, ordering: order * 10,
        },
      });
      created.services += 1;
    }

    order = 0;
    for (const f of seed.faqs) {
      order += 1;
      const question = fill(f.question, { city });
      if (await p.faq.findFirst({ where: { question }, select: { id: true } })) continue;
      await p.faq.create({ data: { question, answer: fill(f.answer, { city }), show_on_home: f.show_on_home, ordering: order * 10 } });
      created.faqs += 1;
    }

    for (const a of seed.articles as any[]) {
      const title = fill(a.title, { city });
      if (await p.blogPost.findFirst({ where: { title }, select: { id: true } })) continue;
      const service = await p.service.findFirst({ where: { slug: { startsWith: a.service_prefix } }, orderBy: { ordering: 'asc' } });
      const values = { city, business: settings.business_name, service_url: service ? `/${service.slug}/` : '/services/', gallery_url: '/gallery/', contact_url: '/contact/' };
      await p.blogPost.create({
        data: {
          title, slug: await this.uniqueSlug('blogPost', title), seo_title: truncateChars(fill(a.seo_title, values), 60), excerpt: a.excerpt,
          seo_description: truncateChars(fill(a.seo_description, values), 155), body: sanitize(fill(a.body, values).trim()),
          focus_keyword: fill(a.focus_keyword, values), search_intent: a.intent,
          event_category_id: categories[a.category] ?? null, related_service_id: service?.id ?? null,
          published_at: new Date(Date.now() - a.days_ago * 86400 * 1000),
        },
      });
      created.articles += 1;
    }
    await this.versions.bump();
    return { ...created, city };
  }
}
