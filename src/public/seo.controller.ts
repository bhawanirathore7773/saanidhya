import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { livePosts, PUBLISHED } from '../common/catalog';
import { config } from '../config/config';

const ymd = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const newest = (rows: { updated_at: Date }[]) => (rows.length ? new Date(Math.max(...rows.map((r) => r.updated_at.getTime()))) : null);

@Controller()
export class SeoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('sitemap.xml')
  async sitemap(@Res() res: Response) {
    const p = this.prisma;
    const [settings, services, galleryImages, videos, testimonials, posts, faqs, projects] = await Promise.all([
      p.siteSettings.findUnique({ where: { id: 1 }, select: { updated_at: true } }),
      p.service.findMany({ where: PUBLISHED, orderBy: [{ ordering: 'asc' }, { id: 'asc' }], select: { slug: true, updated_at: true, show_in_packages: true, starting_price: true } }),
      p.galleryImage.findMany({ where: PUBLISHED, select: { updated_at: true } }),
      p.video.findMany({ where: PUBLISHED, select: { updated_at: true } }),
      p.testimonial.findMany({ where: PUBLISHED, select: { updated_at: true } }),
      p.blogPost.findMany({ where: livePosts(), orderBy: [{ published_at: 'desc' }], select: { slug: true, updated_at: true, published_at: true } }),
      p.faq.findMany({ where: PUBLISHED, select: { updated_at: true } }),
      p.project.findMany({ where: PUBLISHED, orderBy: [{ ordering: 'asc' }, { id: 'asc' }], select: { slug: true, updated_at: true } }),
    ]);
    const settingsDate = settings?.updated_at ?? null;
    const packages = services.filter((s) => s.show_in_packages && s.starting_price !== null);
    const entries: { loc: string; lastmod: string }[] = [];
    const add = (path: string, d: Date | null) => entries.push({ loc: `${config.siteUrl}${path}`, lastmod: ymd(d) });
    add('/', settingsDate);
    if (services.length) add('/services/', newest(services));
    if (galleryImages.length) add('/gallery/', newest(galleryImages));
    if (videos.length) add('/videos/', newest(videos));
    if (packages.length) add('/packages/', newest(packages));
    if (testimonials.length) add('/testimonials/', newest(testimonials));
    if (posts.length) add('/blog/', newest(posts));
    if (faqs.length) add('/faq/', newest(faqs));
    add('/about/', settingsDate); add('/contact/', null); add('/privacy/', null); add('/terms/', null);
    services.forEach((s) => add(`/${s.slug}/`, s.updated_at));
    projects.forEach((s) => add(`/gallery/${s.slug}/`, s.updated_at));
    posts.forEach((s) => add(`/blog/${s.slug}/`, new Date(Math.max(s.updated_at.getTime(), s.published_at.getTime()))));
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
      + entries.map((e) => `<url><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n') + '\n</urlset>';
    res.type('application/xml').send(xml);
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  robots() {
    const lines = ['User-agent: *', 'Allow: /'];
    if (config.adminUrl === 'admin/') lines.push('Disallow: /admin/');
    lines.push('Disallow: /healthz/', '', `Sitemap: ${config.siteUrl}/sitemap.xml`, '');
    return lines.join('\n');
  }

  @Get('healthz/')
  async health(@Res() res: Response) {
    const checks: Record<string, string> = {};
    try { await this.prisma.$queryRaw`SELECT 1`; checks.database = 'ok'; } catch { checks.database = 'error'; }
    checks.cache = 'ok';
    const healthy = Object.values(checks).every((v) => v === 'ok');
    res.status(healthy ? 200 : 503).set('Cache-Control', 'no-store').json({ status: healthy ? 'ok' : 'error', ...checks });
  }

  @Get('favicon.ico')
  favicon(@Res() res: Response) { res.redirect(302, '/static/img/favicon.svg'); }
}
