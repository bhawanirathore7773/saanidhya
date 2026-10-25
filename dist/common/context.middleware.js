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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextMiddleware = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("../config/config");
const prisma_service_1 = require("../prisma/prisma.service");
const site_service_1 = require("../site/site.service");
const cache_1 = require("./cache");
const catalog_1 = require("./catalog");
const navigation_1 = require("./navigation");
const seo_1 = require("./seo");
let ContextMiddleware = class ContextMiddleware {
    site;
    version;
    prisma;
    footer = new cache_1.LruCache(4);
    constructor(site, version, prisma) {
        this.site = site;
        this.version = version;
        this.prisma = prisma;
    }
    async use(req, res, next) {
        try {
            const site = await this.site.load();
            const v = await this.version.current();
            const path = req.path;
            res.locals = {
                ...res.locals,
                site,
                SITE_URL: config_1.config.siteUrl,
                nav_items: navigation_1.NAV_ITEMS.map((item) => ({ ...item, active: path === item.path || path.startsWith(item.path) })),
                footer_links: navigation_1.FOOTER_LINKS,
                quote_path: navigation_1.QUOTE_PATH,
                content_version: v,
                seo: (0, seo_1.defaultSeo)(path, site),
                footer_services_list: await this.footerServices(v),
            };
            next();
        }
        catch (err) {
            next(err);
        }
    }
    async footerServices(version) {
        const key = `footer:${version}`;
        const hit = this.footer.get(key);
        if (hit)
            return hit;
        const rows = await this.prisma.service.findMany({ where: catalog_1.PUBLISHED, orderBy: [{ ordering: 'asc' }, { title: 'asc' }], take: 6, select: { title: true, slug: true } });
        const items = rows.map((s) => ({ title: s.title, url: `/${s.slug}/` }));
        this.footer.set(key, items, 3600);
        return items;
    }
};
exports.ContextMiddleware = ContextMiddleware;
exports.ContextMiddleware = ContextMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [site_service_1.SiteService, cache_1.ContentVersionService, prisma_service_1.PrismaService])
], ContextMiddleware);
