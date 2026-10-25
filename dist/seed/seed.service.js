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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedService = void 0;
const common_1 = require("@nestjs/common");
const cache_1 = require("../common/cache");
const richtext_1 = require("../common/richtext");
const slug_1 = require("../common/slug");
const utils_1 = require("../common/utils");
const prisma_service_1 = require("../prisma/prisma.service");
const site_service_1 = require("../site/site.service");
const seed_data_json_1 = __importDefault(require("./seed-data.json"));
const fill = (text, values) => text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m));
let SeedService = class SeedService {
    prisma;
    versions;
    site;
    constructor(prisma, versions, site) {
        this.prisma = prisma;
        this.versions = versions;
        this.site = site;
    }
    uniqueSlug(model, text) {
        return (0, slug_1.uniqueSlug)(this.prisma[model], text, { fallback: model === 'service' ? 'service' : model === 'blogPost' ? 'blogpost' : 'eventcategory', reserved: model === 'service' });
    }
    async run() {
        const p = this.prisma;
        const settings = await p.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, service_areas: '', about_story: '' } });
        const city = settings.city;
        const created = { categories: 0, services: 0, faqs: 0, articles: 0 };
        const categories = {};
        for (const c of seed_data_json_1.default.categories) {
            let row = await p.eventCategory.findUnique({ where: { name: c.name } });
            if (!row) {
                row = await p.eventCategory.create({
                    data: { name: c.name, slug: await this.uniqueSlug('eventCategory', c.name), short_description: c.short_description, description: '', ordering: c.ordering },
                });
                created.categories += 1;
            }
            categories[c.name] = row.id;
        }
        let order = 0;
        for (const s of seed_data_json_1.default.services) {
            order += 1;
            const title = fill(s.title, { city });
            if (await p.service.findFirst({ where: { title }, select: { id: true } }))
                continue;
            await p.service.create({
                data: {
                    title, slug: await this.uniqueSlug('service', title), category_id: categories[s.category],
                    short_description: fill(s.short, { city }), description: s.paragraphs.map((x) => `<p>${fill(x, { city })}</p>`).join(''),
                    highlights: s.highlights.join('\n'), focus_keyword: fill(s.keyword, { city }), is_featured: s.featured, ordering: order * 10,
                },
            });
            created.services += 1;
        }
        order = 0;
        for (const f of seed_data_json_1.default.faqs) {
            order += 1;
            const question = fill(f.question, { city });
            if (await p.faq.findFirst({ where: { question }, select: { id: true } }))
                continue;
            await p.faq.create({ data: { question, answer: fill(f.answer, { city }), show_on_home: f.show_on_home, ordering: order * 10 } });
            created.faqs += 1;
        }
        for (const a of seed_data_json_1.default.articles) {
            const title = fill(a.title, { city });
            if (await p.blogPost.findFirst({ where: { title }, select: { id: true } }))
                continue;
            const service = await p.service.findFirst({ where: { slug: { startsWith: a.service_prefix } }, orderBy: { ordering: 'asc' } });
            const values = { city, business: settings.business_name, service_url: service ? `/${service.slug}/` : '/services/', gallery_url: '/gallery/', contact_url: '/contact/' };
            await p.blogPost.create({
                data: {
                    title, slug: await this.uniqueSlug('blogPost', title), seo_title: (0, utils_1.truncateChars)(fill(a.seo_title, values), 60), excerpt: a.excerpt,
                    seo_description: (0, utils_1.truncateChars)(fill(a.seo_description, values), 155), body: (0, richtext_1.sanitize)(fill(a.body, values).trim()),
                    focus_keyword: fill(a.focus_keyword, values), search_intent: a.intent,
                    event_category_id: categories[a.category] ?? null, related_service_id: service?.id ?? null,
                    published_at: new Date(Date.now() - a.days_ago * 86400 * 1000),
                },
            });
            created.articles += 1;
        }
        await this.versions.bump();
        return { ...created, city };
    }
};
exports.SeedService = SeedService;
exports.SeedService = SeedService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, cache_1.ContentVersionService, site_service_1.SiteService])
], SeedService);
