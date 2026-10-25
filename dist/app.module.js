"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = exports.CoreModule = void 0;
const common_1 = require("@nestjs/common");
const cache_1 = require("./common/cache");
const context_middleware_1 = require("./common/context.middleware");
const page_cache_middleware_1 = require("./common/page-cache.middleware");
const view_service_1 = require("./common/view.service");
const leads_controller_1 = require("./leads/leads.controller");
const notify_service_1 = require("./leads/notify.service");
const prisma_module_1 = require("./prisma/prisma.module");
const gallery_controller_1 = require("./public/gallery.controller");
const home_controller_1 = require("./public/home.controller");
const lists_controller_1 = require("./public/lists.controller");
const pages_controller_1 = require("./public/pages.controller");
const seo_controller_1 = require("./public/seo.controller");
const services_controller_1 = require("./public/services.controller");
const seed_service_1 = require("./seed/seed.service");
const site_service_1 = require("./site/site.service");
const admin_module_1 = require("./admin/admin.module");
let CoreModule = class CoreModule {
};
exports.CoreModule = CoreModule;
exports.CoreModule = CoreModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [cache_1.ContentVersionService, site_service_1.SiteService, view_service_1.ViewService, seed_service_1.SeedService, notify_service_1.NotifyService],
        exports: [cache_1.ContentVersionService, site_service_1.SiteService, view_service_1.ViewService, seed_service_1.SeedService, notify_service_1.NotifyService],
    })
], CoreModule);
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, CoreModule, admin_module_1.AdminModule],
        controllers: [
            home_controller_1.HomeController, pages_controller_1.PagesController, services_controller_1.ServicesController, gallery_controller_1.GalleryController, lists_controller_1.ListsController, seo_controller_1.SeoController, leads_controller_1.LeadsController,
            services_controller_1.ServiceDetailController,
        ],
        providers: [page_cache_middleware_1.PageCacheMiddleware, context_middleware_1.ContextMiddleware],
    })
], AppModule);
