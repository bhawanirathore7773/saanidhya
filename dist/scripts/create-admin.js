"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("../app.module");
const auth_1 = require("../admin/auth");
const prisma_service_1 = require("../prisma/prisma.service");
async function main() {
    const [name, emailRaw, password] = process.argv.slice(2);
    if (!name || !emailRaw || !password) {
        console.error('Usage: node dist/scripts/create-admin.js "Name" email password');
        process.exit(1);
    }
    const email = emailRaw.trim().toLowerCase();
    const problem = (0, auth_1.passwordProblem)(password, email);
    if (problem) {
        console.error(`Password problem: ${problem}`);
        process.exit(1);
    }
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule, { logger: ['error'] });
    const prisma = app.get(prisma_service_1.PrismaService);
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    const password_hash = await (0, auth_1.hashPassword)(password);
    if (existing) {
        await prisma.adminUser.update({ where: { id: existing.id }, data: { password_hash, name, is_active: true } });
        console.log(`Updated ${email} (new password set).`);
    }
    else {
        await prisma.adminUser.create({ data: { name, email, password_hash, is_superuser: true } });
        console.log(`Admin ${email} created.`);
    }
    await app.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
