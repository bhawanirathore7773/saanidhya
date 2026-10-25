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
exports.GalleryController = void 0;
const common_1 = require("@nestjs/common");
const catalog_1 = require("../common/catalog");
const http_1 = require("../common/http");
const images_1 = require("../common/images");
const presenters_1 = require("../common/presenters");
const schema_1 = require("../common/schema");
const seo_1 = require("../common/seo");
const view_service_1 = require("../common/view.service");
const prisma_service_1 = require("../prisma/prisma.service");
const PER_PAGE = 12;
const FIRST_SCREEN_PHOTOS = 4;
const PROJECT_PHOTO_LIMIT = 60;
let GalleryController = class GalleryController {
    prisma;
    views;
    constructor(prisma, views) {
        this.prisma = prisma;
        this.views = views;
    }
    async list(req, res) {
        const site = res.locals.site;
        const cats = await this.prisma.eventCategory.findMany({
            where: { ...catalog_1.PUBLISHED, gallery_images: { some: catalog_1.PUBLISHED } }, orderBy: [{ ordering: 'asc' }, { name: 'asc' }],
        });
        const categories = cats.map(presenters_1.presentCategory);
        const slug = typeof req.query.type === 'string' ? req.query.type : '';
        const current = categories.find((c) => c.slug === slug) ?? null;
        const where = { ...catalog_1.PUBLISHED, ...(current ? { event_category_id: current.id } : {}) };
        const total = await this.prisma.galleryImage.count({ where });
        const info = (0, http_1.pageInfo)(req.query.page, total, PER_PAGE);
        const rows = await this.prisma.galleryImage.findMany({ where, include: { project: true }, orderBy: catalog_1.BY_ORDER, skip: info.skip, take: info.take });
        const photos = rows.map(presenters_1.presentPhoto);
        photos.forEach((photo, i) => { photo.eager = info.number === 1 && i < FIRST_SCREEN_PHOTOS; });
        const page = (0, http_1.makePage)(photos, total, info);
        const ctx = {
            categories, current, page, photos,
            next_url: (0, http_1.nextUrl)(req.path, info, { type: current ? current.slug : '' }), load_target: '#gallery-chunks',
        };
        if ((0, http_1.isPartial)(req)) {
            return this.views.render(res, (0, http_1.htmxTarget)(req) === 'gallery-chunks' ? 'gallery/_items.html' : 'gallery/_region.html', ctx);
        }
        const crumbs = [{ name: 'Home', url: '/' }, { name: 'Portfolio', url: req.path }];
        Object.assign(ctx, {
            seo: (0, seo_1.buildSeo)(req.path, site, {
                title: `Event Decoration Photo Gallery in ${site.city}`,
                description: `Photos of wedding, haldi, mehndi, birthday, anniversary and party decoration by ${site.business_name} in ${site.city}. Browse by event type.`,
                noindex: !total,
            }),
            nav_active: 'gallery', breadcrumbs: crumbs, schema: (0, schema_1.buildGraph)(site, [], { breadcrumbs: crumbs }),
        });
        this.views.render(res, 'gallery/list.html', ctx);
    }
    async project(rawSlug, req, res) {
        const slug = rawSlug.toLowerCase();
        const row = await this.prisma.project.findFirst({ where: { ...catalog_1.PUBLISHED, slug }, include: { event_category: true, service: { include: { category: true } } } });
        if (!row)
            throw new common_1.NotFoundException();
        if (rawSlug !== slug)
            return res.redirect(301, `/gallery/${slug}/`);
        const site = res.locals.site;
        const [photoRows, more] = await Promise.all([
            this.prisma.galleryImage.findMany({ where: { ...catalog_1.PUBLISHED, project_id: row.id }, include: { project: true }, orderBy: catalog_1.BY_ORDER, take: PROJECT_PHOTO_LIMIT }),
            this.prisma.project.findMany({
                where: { ...catalog_1.PUBLISHED, event_category_id: row.event_category_id, NOT: { id: row.id } }, include: { event_category: true },
                orderBy: [{ is_featured: 'desc' }, { ordering: 'asc' }, { event_date: 'desc' }, { id: 'asc' }], take: 3,
            }),
        ]);
        const project = (0, presenters_1.presentProject)(row);
        const crumbs = [{ name: 'Home', url: '/' }, { name: 'Portfolio', url: '/gallery/' }, { name: project.title, url: req.path }];
        this.views.render(res, 'gallery/project.html', {
            seo: (0, seo_1.buildSeo)(req.path, site, {
                title: project.seo_title || project.title, brand: !project.seo_title, description: project.meta_description,
                image: project.cover_image ? (0, images_1.shareImageUrl)(project.cover_image.name) : '',
            }),
            schema: (0, schema_1.buildGraph)(site, [], { breadcrumbs: crumbs }),
            nav_active: 'gallery', project, photos: photoRows.map(presenters_1.presentPhoto), projects: more.map(presenters_1.presentProject),
            service: project.service && project.service.is_published ? project.service : null, breadcrumbs: crumbs,
        });
    }
};
exports.GalleryController = GalleryController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GalleryController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':slug/'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], GalleryController.prototype, "project", null);
exports.GalleryController = GalleryController = __decorate([
    (0, common_1.Controller)('gallery'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, view_service_1.ViewService])
], GalleryController);
