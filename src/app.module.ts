import { Global, Module } from '@nestjs/common';
import { ContentVersionService } from './common/cache';
import { ContextMiddleware } from './common/context.middleware';
import { PageCacheMiddleware } from './common/page-cache.middleware';
import { ViewService } from './common/view.service';
import { LeadsController } from './leads/leads.controller';
import { NotifyService } from './leads/notify.service';
import { PrismaModule } from './prisma/prisma.module';
import { GalleryController } from './public/gallery.controller';
import { HomeController } from './public/home.controller';
import { ListsController } from './public/lists.controller';
import { PagesController } from './public/pages.controller';
import { SeoController } from './public/seo.controller';
import { ServiceDetailController, ServicesController } from './public/services.controller';
import { SeedService } from './seed/seed.service';
import { SiteService } from './site/site.service';
import { AdminModule } from './admin/admin.module';

@Global()
@Module({
  providers: [ContentVersionService, SiteService, ViewService, SeedService, NotifyService],
  exports: [ContentVersionService, SiteService, ViewService, SeedService, NotifyService],
})
export class CoreModule {}

@Module({
  imports: [PrismaModule, CoreModule, AdminModule],
  controllers: [
    HomeController, PagesController, ServicesController, GalleryController, ListsController, SeoController, LeadsController,
    ServiceDetailController, // catch-all /<slug>/ must come last
  ],
  providers: [PageCacheMiddleware, ContextMiddleware],
})
export class AppModule {}
