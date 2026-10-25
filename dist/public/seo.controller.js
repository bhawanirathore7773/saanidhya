"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeoController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const catalog_1 = require("../common/catalog");
const config_1 = require("../config/config");
const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const newest = (rows) => (rows.length ? new Date(Math.max(...rows.map((r) => r.updated_at.getTime()))) : null);
let SeoController = class SeoController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async sitemap(res) {
        const p = this.prisma;
        const [settings, services, galleryImages, videos, testimonials, posts, faqs, projects] = await Promise.all([
            p.siteSettings.findUnique({ where: { id: 1 }, select: { updated_at: true } }),
            p.service.findMany({ where: catalog_1.PUBLISHED, orderBy: [{ ordering: 'asc' }, { id: 'asc' }], select: { slug: true, updated_at: true, show_in_packages: true, starting_price: true } }),
            p.galleryImage.findMany({ where: catalog_1.PUBLISHED, select: { updated_at: true } }),
            p.video.findMany({ where: catalog_1.PUBLISHED, select: { updated_at: true } }),
            p.testimonial.findMany({ where: catalog_1.PUBLISHED, select: { updated_at: true } }),
            p.blogPost.findMany({ where: (0, catalog_1.livePosts)(), orderBy: [{ published_at: 'desc' }], select: { slug: true, updated_at: true, published_at: true } }),
            p.faq.findMany({ where: catalog_1.PUBLISHED, select: { updated_at: true } }),
            p.project.findMany({ where: catalog_1.PUBLISHED, orderBy: [{ ordering: 'asc' }, { id: 'asc' }], select: { slug: true, updated_at: true } }),
        ]);
        const settingsDate = settings?.updated_at ?? null;
        const packages = services.filter((s) => s.show_in_packages && s.starting_price !== null);
        const entries = [];
        const add = (path, d) => entries.push({ loc: `${config_1.config.siteUrl}${path}`, lastmod: ymd(d) });
        add('/', settingsDate);
        if (services.length)
            add('/services/', newest(services));
        if (galleryImages.length)
            add('/gallery/', newest(galleryImages));
        if (videos.length)
            add('/videos/', newest(videos));
        if (packages.length)
            add('/packages/', newest(packages));
        if (testimonials.length)
            add('/testimonials/', newest(testimonials));
        if (posts.length)
            add('/blog/', newest(posts));
        if (faqs.length)
            add('/faq/', newest(faqs));
        add('/about/', settingsDate);
        add('/contact/', null);
        add('/privacy/', null);
        add('/terms/', null);
        services.forEach((s) => add(`/${s.slug}/`, s.updated_at));
        projects.forEach((s) => add(`/gallery/${s.slug}/`, s.updated_at));
        posts.forEach((s) => add(`/blog/${s.slug}/`, new Date(Math.max(s.updated_at.getTime(), s.published_at.getTime()))));
        const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + entries.map((e) => `<url><loc>${esc(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n') + '\n</urlset>';
        res.type('application/xml').send(xml);
    }
    robots() {
        const lines = ['User-agent: *', 'Allow: /'];
        if (config_1.config.adminUrl === 'admin/')
            lines.push('Disallow: /admin/');
        lines.push('Disallow: /healthz/', '', `Sitemap: ${config_1.config.siteUrl}/sitemap.xml`, '');
        return lines.join('\n');
    }
    async health(res) {
        const checks = {};
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            checks.database = 'ok';
        }
        catch {
            checks.database = 'error';
        }
        checks.cache = 'ok';
        const healthy = Object.values(checks).every((v) => v === 'ok');
        res.status(healthy ? 200 : 503).set('Cache-Control', 'no-store').json({ status: healthy ? 'ok' : 'error', ...checks });
    }
    favicon(res) { res.redirect(302, '/static/img/favicon.svg'); }
};
exports.SeoController = SeoController;
__decorate([
    (0, common_1.Get)('sitemap.xml'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "sitemap", null);
__decorate([
    (0, common_1.Get)('robots.txt'),
    (0, common_1.Header)('Content-Type', 'text/plain; charset=utf-8'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SeoController.prototype, "robots", null);
__decorate([
    (0, common_1.Get)('healthz/'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeoController.prototype, "health", null);
__decorate([
    (0, common_1.Get)('favicon.ico'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SeoController.prototype, "favicon", null);
exports.SeoController = SeoController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SeoController);
