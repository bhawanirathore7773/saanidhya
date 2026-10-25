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
exports.SiteService = void 0;
const common_1 = require("@nestjs/common");
const cache_1 = require("../common/cache");
const presenters_1 = require("../common/presenters");
const prisma_service_1 = require("../prisma/prisma.service");
let SiteService = class SiteService {
    prisma;
    version;
    cache = new cache_1.LruCache(3);
    constructor(prisma, version) {
        this.prisma = prisma;
        this.version = version;
    }
    async load() {
        const key = `site:${await this.version.current()}`;
        const hit = this.cache.get(key);
        if (hit)
            return hit;
        const row = await this.prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, service_areas: '', about_story: '' } });
        const site = (0, presenters_1.presentSite)(row);
        this.cache.set(key, site, 3600);
        return site;
    }
};
exports.SiteService = SiteService;
exports.SiteService = SiteService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, cache_1.ContentVersionService])
], SiteService);
