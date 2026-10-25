"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../app.module");
const seed_service_1 = require("../seed/seed.service");
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, { logger: ['error', 'warn'] });
    const r = await app.get(seed_service_1.SeedService).run();
    console.log(`Added ${r.categories} categories, ${r.services} services, ${r.faqs} FAQs, ${r.articles} articles for ${r.city}.`);
    await app.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
