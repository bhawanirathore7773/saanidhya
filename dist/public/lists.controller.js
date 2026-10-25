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
exports.ListsController = void 0;
const common_1 = require("@nestjs/common");
const catalog_1 = require("../common/catalog");
const http_1 = require("../common/http");
const images_1 = require("../common/images");
const presenters_1 = require("../common/presenters");
const richtext_1 = require("../common/richtext");
const schema_1 = require("../common/schema");
const seo_1 = require("../common/seo");
const utils_1 = require("../common/utils");
const view_1 = require("../common/view");
const view_service_1 = require("../common/view.service");
const prisma_service_1 = require("../prisma/prisma.service");
const PER_PAGE = 9;
let ListsController = class ListsController {
    prisma;
    views;
    constructor(prisma, views) {
        this.prisma = prisma;
        this.views = views;
    }
    async videos(req, res) {
        const site = res.locals.site;
        const total = await this.prisma.video.count({ where: catalog_1.PUBLISHED });
        const info = (0, http_1.pageInfo)(req.query.page, total, PER_PAGE);
        const rows = await this.prisma.video.findMany({ where: catalog_1.PUBLISHED, include: { event_category: true }, orderBy: catalog_1.FEATURED_FIRST, skip: info.skip, take: info.take });
        const videos = rows.map(presenters_1.presentVideo);
        const page = (0, http_1.makePage)(videos, total, info);
        const ctx = { videos, page, next_url: (0, http_1.nextUrl)(req.path, info), load_target: '#video-grid' };
        if ((0, http_1.isPartial)(req))
            return this.views.render(res, 'videos/_items.html', ctx);
        const crumbs = [{ name: 'Home', url: '/' }, { name: 'Videos', url: req.path }];
        Object.assign(ctx, {
            schema: (0, schema_1.buildGraph)(site, videos.map(schema_1.videoNode), { breadcrumbs: crumbs }),
            seo: (0, seo_1.buildSeo)(req.path, site, {
                title: `Decoration & Event Videos in ${site.city}`,
                description: `Watch videos of wedding, birthday and event decoration by ${site.business_name} in ${site.city}.`,
                noindex: !total,
            }),
            nav_active: 'videos', breadcrumbs: crumbs,
        });
        this.views.render(res, 'videos/list.html', ctx);
    }
    async testimonials(req, res) {
        const site = res.locals.site;
        const total = await this.prisma.testimonial.count({ where: catalog_1.PUBLISHED });
        const info = (0, http_1.pageInfo)(req.query.page, total, PER_PAGE);
        const rows = await this.prisma.testimonial.findMany({ where: catalog_1.PUBLISHED, include: { event_category: true }, orderBy: catalog_1.FEATURED_FIRST, skip: info.skip, take: info.take });
        const testimonials = rows.map(presenters_1.presentTestimonial);
        const page = (0, http_1.makePage)(testimonials, total, info);
        const ctx = { testimonials, page, next_url: (0, http_1.nextUrl)(req.path, info), load_target: '#testimonial-grid' };
        if ((0, http_1.isPartial)(req))
            return this.views.render(res, 'testimonials/_items.html', ctx);
        const crumbs = [{ name: 'Home', url: '/' }, { name: 'Testimonials', url: req.path }];
        Object.assign(ctx, {
            schema: (0, schema_1.buildGraph)(site, [], { breadcrumbs: crumbs }),
            seo: (0, seo_1.buildSeo)(req.path, site, {
                title: `Client Reviews & Testimonials in ${site.city}`,
                description: `Read what families say about ${site.business_name}, wedding and event decorators in ${site.city}.`,
                noindex: !total,
            }),
            rating_item: (0, catalog_1.buildTrustItems)(site).find((i) => i.stars) ?? null, breadcrumbs: crumbs,
        });
        this.views.render(res, 'testimonials/list.html', ctx);
    }
    async posts(req, res) {
        const site = res.locals.site;
        const where = (0, catalog_1.livePosts)();
        const total = await this.prisma.blogPost.count({ where });
        const info = (0, http_1.pageInfo)(req.query.page, total, PER_PAGE);
        const rows = await this.prisma.blogPost.findMany({ where, include: { event_category: true }, orderBy: [{ published_at: 'desc' }, { id: 'asc' }], skip: info.skip, take: info.take });
        const posts = rows.map(presenters_1.presentPost);
        const page = (0, http_1.makePage)(posts, total, info);
        const ctx = { posts, page, next_url: (0, http_1.nextUrl)(req.path, info), load_target: '#blog-grid' };
        if ((0, http_1.isPartial)(req))
            return this.views.render(res, 'blog/_items.html', ctx);
        const crumbs = [{ name: 'Home', url: '/' }, { name: 'Blog', url: req.path }];
        Object.assign(ctx, {
            seo: (0, seo_1.buildSeo)(req.path, site, {
                title: 'Wedding & Event Decoration Ideas, Tips and Guides',
                description: `Practical decoration ideas, budget guides and planning tips for weddings, haldi, birthdays and events in ${site.city}, from ${site.business_name}.`,
                noindex: !total,
            }),
            schema: (0, schema_1.buildGraph)(site, [], { breadcrumbs: crumbs }), nav_active: 'blog', breadcrumbs: crumbs,
        });
        this.views.render(res, 'blog/list.html', ctx);
    }
    async post(rawSlug, req, res) {
        const slug = rawSlug.toLowerCase();
        const row = await this.prisma.blogPost.findFirst({
            where: { ...(0, catalog_1.livePosts)(), slug }, include: { event_category: true, related_service: { include: { category: true } } },
        });
        if (!row)
            throw new common_1.NotFoundException();
        if (rawSlug !== slug)
            return res.redirect(301, `/blog/${slug}/`);
        const site = res.locals.site;
        const post = (0, presenters_1.presentPost)(row);
        const { html: bodyHtml, toc } = (0, richtext_1.addHeadingIds)((0, richtext_1.sanitize)(post.body));
        const service = post.related_service && post.related_service.is_published ? (0, presenters_1.presentService)(row.related_service, site.city) : null;
        const others = await this.prisma.blogPost.findMany({ where: { ...(0, catalog_1.livePosts)(), NOT: { id: row.id } }, include: { event_category: true }, orderBy: [{ published_at: 'desc' }, { id: 'asc' }], take: 60 });
        const more = (row.event_category_id ? (0, catalog_1.firstThen)(others, (o) => o.event_category_id === row.event_category_id, 3) : others.slice(0, 3)).map(presenters_1.presentPost);
        const canonical = (0, seo_1.absoluteUrl)(req.path);
        const crumbs = [{ name: 'Home', url: '/' }, { name: 'Blog', url: '/blog/' }, { name: post.title, url: req.path }];
        this.views.render(res, 'blog/post.html', {
            seo: (0, seo_1.buildSeo)(req.path, site, {
                title: post.seo_title || post.title, brand: !post.seo_title, description: post.meta_description,
                image: post.cover_image ? (0, images_1.shareImageUrl)(post.cover_image.name) : '', og_type: 'article',
                published: (0, utils_1.isoDate)(post.published_at),
                modified: (0, utils_1.isoDate)(new Date(Math.max(post.updated_at.getTime(), post.published_at.getTime()))),
            }),
            schema: (0, schema_1.buildGraph)(site, [(0, schema_1.articleNode)(post, site, canonical)], { breadcrumbs: crumbs }),
            nav_active: 'blog', post, body_html: (0, view_1.safe)(bodyHtml), toc: toc.length >= 3 ? toc : [], service, posts: more,
            share_url: 'https://wa.me/?text=' + (0, utils_1.pyQuote)(`${post.title} ${canonical}`),
            whatsapp_url: (0, utils_1.whatsappUrl)(site.whatsapp_number || site.phone, `Hi ${site.business_name}, I read your article "${post.title}" and would like some help planning.`),
            breadcrumbs: crumbs,
        });
    }
};
exports.ListsController = ListsController;
__decorate([
    (0, common_1.Get)('videos/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ListsController.prototype, "videos", null);
__decorate([
    (0, common_1.Get)('testimonials/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ListsController.prototype, "testimonials", null);
__decorate([
    (0, common_1.Get)('blog/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ListsController.prototype, "posts", null);
__decorate([
    (0, common_1.Get)('blog/:slug/'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ListsController.prototype, "post", null);
exports.ListsController = ListsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, view_service_1.ViewService])
], ListsController);
