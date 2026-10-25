/** node dist/scripts/create-admin.js "Your Name" you@example.com "a-long-password"   (or reset an existing admin's password) */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { hashPassword, passwordProblem } from '../admin/auth';
import { PrismaService } from '../prisma/prisma.service';

async function main() {
  const [name, emailRaw, password] = process.argv.slice(2);
  if (!name || !emailRaw || !password) { console.error('Usage: node dist/scripts/create-admin.js "Name" email password'); process.exit(1); }
  const email = emailRaw.trim().toLowerCase();
  const problem = passwordProblem(password, email);
  if (problem) { console.error(`Password problem: ${problem}`); process.exit(1); }
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  const password_hash = await hashPassword(password);
  if (existing) { await prisma.adminUser.update({ where: { id: existing.id }, data: { password_hash, name, is_active: true } }); console.log(`Updated ${email} (new password set).`); }
  else { await prisma.adminUser.create({ data: { name, email, password_hash, is_superuser: true } }); console.log(`Admin ${email} created.`); }
  await app.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
