/** node dist/scripts/seed.js   -> loads the starter content (safe to run again). */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from '../seed/seed.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const r = await app.get(SeedService).run();
  console.log(`Added ${r.categories} categories, ${r.services} services, ${r.faqs} FAQs, ${r.articles} articles for ${r.city}.`);
  await app.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
