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
exports.ServiceDetailController = exports.ServicesController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("../config/config");
const catalog_1 = require("../common/catalog");
const presenters_1 = require("../common/presenters");
const schema_1 = require("../common/schema");
const seo_1 = require("../common/seo");
const images_1 = require("../common/images");
const utils_1 = require("../common/utils");
const view_service_1 = require("../common/view.service");
const prisma_service_1 = require("../prisma/prisma.service");
const QUOTE_URL = '/contact/';
let ServicesController = class ServicesController {
    prisma;
    views;
    constructor(prisma, views) {
        this.prisma = prisma;
        this.views = views;
    }
    async list(req, res) {
        const site = res.locals.site;
        const rows = await this.prisma.eventCategory.findMany({
            where: catalog_1.PUBLISHED, orderBy: catalog_1.BY_ORDER,
            include: { services: { where: catalog_1.PUBLISHED, orderBy: [{ ordering: 'asc' }, { title: 'asc' }, { id: 'asc' }] } },
        });
        const categories = rows
            .filter((c) => c.services.length)
            .map((c) => ({ ...(0, presenters_1.presentCategory)(c), live_services: c.services.map((s) => (0, presenters_1.presentService)({ ...s, category: c }, site.city)) }));
        const faqs = await (0, catalog_1.generalFaqs)(this.prisma);
        const crumbs = [{ name: 'Home', url: '/' }, { name: 'Services', url: req.path }];
        this.views.render(res, 'services/list.html', {
            seo: (0, seo_1.buildSeo)(req.path, site, {
                title: `Event Decoration Services in ${site.city}`,
                description: `Wedding, engagement, haldi, birthday, anniversary and corporate event decoration and management in ${site.city}. See our services and get a free quote.`,
            }),
            schema: (0, schema_1.buildGraph)(site, faqs.length ? [(0, schema_1.faqNode)(faqs)] : [], { breadcrumbs: crumbs }),
            nav_active: 'services', categories,
            hero_title: `Decoration and event services in ${site.city}`,
            hero_lead: 'Weddings, functions, birthdays, anniversaries and corporate events. Pick what you need, or tell us your idea and we will plan it with you.',
            faqs, breadcrumbs: crumbs,
        });
    }
    async packages(req, res) {
        const site = res.locals.site;
        const rows = await this.prisma.service.findMany({
            where: { ...catalog_1.PUBLISHED, show_in_packages: true, starting_price: { not: null } }, include: { category: true },
            orderBy: [{ category: { ordering: 'asc' } }, { ordering: 'asc' }, { starting_price: 'asc' }, { id: 'asc' }],
        });
        const faqs = await (0, catalog_1.generalFaqs)(this.prisma, 6);
        const crumbs = [{ name: 'Home', url: '/' }, { name: 'Packages', url: req.path }];
        this.views.render(res, 'services/packages.html', {
            seo: (0, seo_1.buildSeo)(req.path, site, {
                title: `Decoration Packages & Prices in ${site.city}`,
                description: `See starting prices for wedding, birthday, anniversary and event decoration in ${site.city}, and how the final price is worked out.`,
                noindex: !rows.length,
            }),
            schema: (0, schema_1.buildGraph)(site, faqs.length ? [(0, schema_1.faqNode)(faqs)] : [], { breadcrumbs: crumbs }),
            nav_active: 'packages', packages: rows.map((s) => (0, presenters_1.presentService)(s, site.city)),
            hero_title: 'Packages and starting prices',
            hero_lead: 'See where prices start for each type of event, and what decides your final quote. No hidden extras.',
            faqs, breadcrumbs: crumbs,
        });
    }
};
exports.ServicesController = ServicesController;
__decorate([
    (0, common_1.Get)('services/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('packages/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ServicesController.prototype, "packages", null);
exports.ServicesController = ServicesController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, view_service_1.ViewService])
], ServicesController);
let ServiceDetailController = class ServiceDetailController {
    prisma;
    views;
    constructor(prisma, views) {
        this.prisma = prisma;
        this.views = views;
    }
    async detail(rawSlug, req, res, next) {
        if (rawSlug === config_1.config.adminBase.slice(1))
            return next();
        if (rawSlug !== rawSlug.toLowerCase())
            return res.redirect(301, `/${rawSlug.toLowerCase()}/`);
        const p = this.prisma;
        const row = await p.service.findFirst({ where: { ...catalog_1.PUBLISHED, slug: rawSlug }, include: { category: true } });
        if (!row)
            throw new common_1.NotFoundException();
        const site = res.locals.site;
        const service = (0, presenters_1.presentService)(row, site.city);
        const category = service.category;
        const [projA, projB, gallery, faqRows, testimonials, postA, postB, others] = await Promise.all([
            p.project.findMany({ where: { ...catalog_1.PUBLISHED, service_id: row.id }, include: { event_category: true }, orderBy: [{ is_featured: 'desc' }, { ordering: 'asc' }, { event_date: 'desc' }, { id: 'asc' }], take: 3 }),
            p.project.findMany({ where: { ...catalog_1.PUBLISHED, event_category_id: row.category_id, NOT: { service_id: row.id } }, include: { event_category: true }, orderBy: [{ is_featured: 'desc' }, { ordering: 'asc' }, { event_date: 'desc' }, { id: 'asc' }], take: 3 }),
            p.galleryImage.findMany({ where: { ...catalog_1.PUBLISHED, event_category_id: row.category_id }, include: { project: true }, orderBy: catalog_1.FEATURED_FIRST, take: 8 }),
            p.faq.findMany({ where: { ...catalog_1.PUBLISHED, OR: [{ service_id: row.id }, { category_id: row.category_id }] }, orderBy: catalog_1.BY_ORDER, take: 40 }),
            p.testimonial.findMany({ where: { ...catalog_1.PUBLISHED, event_category_id: row.category_id }, include: { event_category: true }, orderBy: catalog_1.FEATURED_FIRST, take: 3 }),
            p.blogPost.findMany({ where: { ...(0, catalog_1.livePosts)(), related_service_id: row.id }, include: { event_category: true }, orderBy: [{ published_at: 'desc' }, { id: 'asc' }], take: 3 }),
            p.blogPost.findMany({ where: { ...(0, catalog_1.livePosts)(), event_category_id: row.category_id, NOT: { related_service_id: row.id } }, include: { event_category: true }, orderBy: [{ published_at: 'desc' }, { id: 'asc' }], take: 3 }),
            p.service.findMany({ where: { ...catalog_1.PUBLISHED, NOT: { id: row.id } }, include: { category: true }, orderBy: [{ ordering: 'asc' }, { title: 'asc' }, { id: 'asc' }], take: 60 }),
        ]);
        const projects = [...projA, ...projB].slice(0, 3).map(presenters_1.presentProject);
        const faqSorted = (0, catalog_1.firstThen)(faqRows, (f) => f.service_id === row.id, 8);
        const faqs = faqSorted.length ? faqSorted.map(presenters_1.presentFaq) : await (0, catalog_1.generalFaqs)(p, 6);
        const guides = [...postA, ...postB].slice(0, 3).map(presenters_1.presentPost);
        const otherServices = (0, catalog_1.firstThen)(others, (s) => s.category_id === row.category_id, 3).map((s) => (0, presenters_1.presentService)(s, site.city));
        const crumbs = [{ name: 'Home', url: '/' }, { name: 'Services', url: '/services/' }, { name: service.title, url: req.path }];
        this.views.render(res, 'services/detail.html', {
            seo: (0, seo_1.buildSeo)(req.path, site, {
                title: service.seo_title || service.title, brand: !service.seo_title, description: service.meta_description,
                image: service.cover_image ? (0, images_1.shareImageUrl)(service.cover_image.name) : '',
            }),
            schema: (0, schema_1.buildGraph)(site, [(0, schema_1.serviceNode)(service), faqs.length ? (0, schema_1.faqNode)(faqs) : null], { breadcrumbs: crumbs }),
            nav_active: 'services', service, category, projects,
            gallery: gallery.map(presenters_1.presentPhoto), faqs, testimonials: testimonials.map(presenters_1.presentTestimonial), posts: guides, services: otherServices,
            quote_url: `${QUOTE_URL}?service=${service.slug}`,
            whatsapp_url: (0, utils_1.whatsappUrl)(site.whatsapp_number || site.phone, `Hi ${site.business_name}, I am interested in ${service.title}. Could you please share the details and a quote?`),
            breadcrumbs: crumbs,
            cta_title: `Planning ${service.title.split(' in ')[0].toLowerCase()}?`,
        });
    }
};
exports.ServiceDetailController = ServiceDetailController;
__decorate([
    (0, common_1.Get)(':slug/'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, common_1.Next)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Function]),
    __metadata("design:returntype", Promise)
], ServiceDetailController.prototype, "detail", null);
exports.ServiceDetailController = ServiceDetailController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, view_service_1.ViewService])
], ServiceDetailController);
