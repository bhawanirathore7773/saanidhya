"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const fs = __importStar(require("fs"));
const app_module_1 = require("../app.module");
const images_1 = require("../common/images");
const prisma_service_1 = require("../prisma/prisma.service");
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, { logger: ['error', 'warn'] });
    const p = app.get(prisma_service_1.PrismaService);
    const jobs = [];
    const add = (rows, field, key) => rows.forEach((r) => r[field] && jobs.push([r[field], key]));
    add(await p.eventCategory.findMany({ select: { cover_image: true } }), 'cover_image', 'EventCategory.cover_image');
    add(await p.service.findMany({ select: { cover_image: true } }), 'cover_image', 'Service.cover_image');
    add(await p.project.findMany({ select: { cover_image: true } }), 'cover_image', 'Project.cover_image');
    add(await p.galleryImage.findMany({ select: { image: true } }), 'image', 'GalleryImage.image');
    add(await p.video.findMany({ select: { custom_thumbnail: true } }), 'custom_thumbnail', 'Video.custom_thumbnail');
    add(await p.blogPost.findMany({ select: { cover_image: true } }), 'cover_image', 'BlogPost.cover_image');
    add(await p.testimonial.findMany({ select: { photo: true } }), 'photo', 'Testimonial.photo');
    const site = await p.siteSettings.findUnique({ where: { id: 1 } });
    if (site?.hero_poster)
        jobs.push([site.hero_poster, 'SiteSettings.hero_poster']);
    if (site?.about_photo)
        jobs.push([site.about_photo, 'SiteSettings.about_photo']);
    let done = 0;
    for (const [rel, key] of jobs) {
        if (!fs.existsSync((0, images_1.mediaFile)(rel))) {
            console.warn(`missing file: ${rel}`);
            continue;
        }
        await (0, images_1.generateRenditions)(rel, key);
        done += 1;
    }
    console.log(`Resized ${done} photos.`);
    await app.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
