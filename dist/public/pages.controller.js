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
exports.PagesController = void 0;
const common_1 = require("@nestjs/common");
const catalog_1 = require("../common/catalog");
const presenters_1 = require("../common/presenters");
const schema_1 = require("../common/schema");
const seo_1 = require("../common/seo");
const view_service_1 = require("../common/view.service");
const prisma_service_1 = require("../prisma/prisma.service");
const LEGAL_UPDATED = { day: 1, month: 'October', year: 2026 };
let PagesController = class PagesController {
    prisma;
    views;
    constructor(prisma, views) {
        this.prisma = prisma;
        this.views = views;
    }
    about(req, res) {
        const site = res.locals.site;
        const crumbs = [{ name: 'Home', url: '/' }, { name: 'About', url: req.path }];
        this.views.render(res, 'pages/about.html', {
            seo: (0, seo_1.buildSeo)(req.path, site, {
                title: `About ${site.business_name}, Event Decorators in ${site.city}`,
                description: `Meet ${site.business_name}, the team behind wedding, birthday and event decoration in ${site.city}. Our story, how we work and the areas we serve.`,
            }),
            schema: (0, schema_1.buildGraph)(site, [], { breadcrumbs: crumbs }),
            nav_active: 'about', breadcrumbs: crumbs, about_title: `About ${site.business_name}`, trust_items: (0, catalog_1.buildTrustItems)(site),
        });
    }
    async faq(req, res) {
        const site = res.locals.site;
        const rows = await this.prisma.faq.findMany({ where: catalog_1.PUBLISHED, include: { category: true, service: true }, orderBy: [{ ordering: 'asc' }, { id: 'asc' }], take: 200 });
        const items = rows.map(presenters_1.presentFaq);
        const general = items.filter((f) => !f.category_id && !f.service_id);
        const groups = general.length ? [{ title: 'General questions', faqs: general }] : [];
        const byCategory = new Map();
        const byService = new Map();
        for (const item of items) {
            if (item.service_id) {
                if (!byService.has(item.service_id))
                    byService.set(item.service_id, { title: item.service.title, faqs: [], url: item.service.get_absolute_url });
                byService.get(item.service_id).faqs.push(item);
            }
            else if (item.category_id) {
                if (!byCategory.has(item.category_id))
                    byCategory.set(item.category_id, { title: item.category.name, faqs: [] });
                byCategory.get(item.category_id).faqs.push(item);
            }
        }
        groups.push(...byCategory.values(), ...byService.values());
        const crumbs = [{ name: 'Home', url: '/' }, { name: 'FAQ', url: req.path }];
        this.views.render(res, 'pages/faq.html', {
            seo: (0, seo_1.buildSeo)(req.path, site, {
                title: `Event Decoration FAQ in ${site.city}`,
                description: `Answers to common questions about booking, pricing, themes, flowers and setup for wedding and event decoration in ${site.city}.`,
                noindex: !items.length,
            }),
            schema: (0, schema_1.buildGraph)(site, items.length ? [(0, schema_1.faqNode)(items)] : [], { breadcrumbs: crumbs }),
            groups, breadcrumbs: crumbs,
        });
    }
    legal(req, res, template, title, description) {
        const site = res.locals.site;
        const crumbs = [{ name: 'Home', url: '/' }, { name: title, url: req.path }];
        this.views.render(res, template, {
            seo: (0, seo_1.buildSeo)(req.path, site, { title, description }),
            schema: (0, schema_1.buildGraph)(site, [], { breadcrumbs: crumbs }),
            breadcrumbs: crumbs,
            updated: LEGAL_UPDATED,
            lead: `${description} Last updated ${LEGAL_UPDATED.day} ${LEGAL_UPDATED.month} ${LEGAL_UPDATED.year}.`,
        });
    }
    privacy(req, res) {
        this.legal(req, res, 'pages/privacy.html', 'Privacy Policy', 'How we collect, use and protect your information when you visit our website or send an enquiry.');
    }
    terms(req, res) {
        this.legal(req, res, 'pages/terms.html', 'Terms of Use', 'The terms for using our website, and how quotes and bookings work.');
    }
};
exports.PagesController = PagesController;
__decorate([
    (0, common_1.Get)('about/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "about", null);
__decorate([
    (0, common_1.Get)('faq/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PagesController.prototype, "faq", null);
__decorate([
    (0, common_1.Get)('privacy/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "privacy", null);
__decorate([
    (0, common_1.Get)('terms/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PagesController.prototype, "terms", null);
exports.PagesController = PagesController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, view_service_1.ViewService])
], PagesController);
