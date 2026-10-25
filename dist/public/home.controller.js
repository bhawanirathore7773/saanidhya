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
exports.HomeController = void 0;
const common_1 = require("@nestjs/common");
const catalog_1 = require("../common/catalog");
const schema_1 = require("../common/schema");
const seo_1 = require("../common/seo");
const presenters_1 = require("../common/presenters");
const view_service_1 = require("../common/view.service");
const prisma_service_1 = require("../prisma/prisma.service");
let HomeController = class HomeController {
    prisma;
    views;
    constructor(prisma, views) {
        this.prisma = prisma;
        this.views = views;
    }
    async home(req, res) {
        const site = res.locals.site;
        const p = this.prisma;
        const [services, projects, videos, gallery, testimonials, packages, posts, homeFaqs] = await Promise.all([
            p.service.findMany({ where: catalog_1.PUBLISHED, include: { category: true }, orderBy: [{ is_featured: 'desc' }, { ordering: 'asc' }, { title: 'asc' }], take: 6 }),
            p.project.findMany({ where: catalog_1.PUBLISHED, include: { event_category: true }, orderBy: [{ is_featured: 'desc' }, { ordering: 'asc' }, { event_date: 'desc' }, { id: 'asc' }], take: 6 }),
            p.video.findMany({ where: catalog_1.PUBLISHED, include: { event_category: true }, orderBy: catalog_1.FEATURED_FIRST, take: 3 }),
            p.galleryImage.findMany({ where: catalog_1.PUBLISHED, include: { project: true }, orderBy: catalog_1.FEATURED_FIRST, take: 8 }),
            p.testimonial.findMany({ where: catalog_1.PUBLISHED, include: { event_category: true }, orderBy: catalog_1.FEATURED_FIRST, take: 6 }),
            p.service.findMany({ where: { ...catalog_1.PUBLISHED, show_in_packages: true, starting_price: { not: null } }, include: { category: true }, orderBy: [{ ordering: 'asc' }, { starting_price: 'asc' }, { id: 'asc' }], take: 3 }),
            p.blogPost.findMany({ where: (0, catalog_1.livePosts)(), include: { event_category: true }, orderBy: [{ published_at: 'desc' }, { id: 'asc' }], take: 3 }),
            p.faq.findMany({ where: { ...catalog_1.PUBLISHED, show_on_home: true }, orderBy: catalog_1.BY_ORDER, take: 8 }),
        ]);
        const faqs = homeFaqs.length ? homeFaqs.map(presenters_1.presentFaq) : await (0, catalog_1.generalFaqs)(p, 8);
        const title = site.default_seo_title || `Wedding & Event Decorators in ${site.city}`;
        const description = site.default_seo_description
            || `${site.business_name} plans and decorates weddings, birthdays, anniversaries and corporate events in ${site.city}. Call or WhatsApp for a clear, free quote.`;
        this.views.render(res, 'home/home.html', {
            trust_items: (0, catalog_1.buildTrustItems)(site),
            services: services.map((s) => (0, presenters_1.presentService)(s, site.city)),
            projects: projects.map(presenters_1.presentProject),
            videos: videos.map(presenters_1.presentVideo),
            gallery: gallery.map(presenters_1.presentPhoto),
            testimonials: testimonials.map(presenters_1.presentTestimonial),
            packages: packages.map((s) => (0, presenters_1.presentService)(s, site.city)),
            posts: posts.map(presenters_1.presentPost),
            faqs,
            seo: (0, seo_1.buildSeo)(req.path, site, { title, description }),
            schema: (0, schema_1.buildGraph)(site, faqs.length ? [(0, schema_1.faqNode)(faqs)] : [], { website: true }),
        });
    }
};
exports.HomeController = HomeController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HomeController.prototype, "home", null);
exports.HomeController = HomeController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, view_service_1.ViewService])
], HomeController);
