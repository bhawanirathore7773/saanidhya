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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAuthController = void 0;
const common_1 = require("@nestjs/common");
const http_1 = require("../common/http");
const config_1 = require("../config/config");
const prisma_service_1 = require("../prisma/prisma.service");
const admin_support_1 = require("./admin.support");
const auth_1 = require("./auth");
const attempts = new http_1.HitCounter(15 * 60 * 1000);
let AdminAuthController = class AdminAuthController {
    prisma;
    support;
    constructor(prisma, support) {
        this.prisma = prisma;
        this.support = support;
    }
    noindex(res) { res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }); }
    safeNext(next) { const n = String(next ?? ''); return n.startsWith(admin_support_1.BASE + '/') && !n.startsWith('//') ? n : `${admin_support_1.BASE}/`; }
    async loginForm(req, res) {
        this.noindex(res);
        if (await (0, auth_1.currentAdmin)(req, this.prisma))
            return res.redirect(302, this.safeNext(req.query.next));
        const hasAdmin = (await this.prisma.adminUser.count()) > 0;
        return this.support.page(req, res, 'login.html', { next: String(req.query.next ?? ''), needs_setup: !hasAdmin, setup_ready: Boolean(config_1.config.setupKey), email: '' });
    }
    async login(req, res) {
        this.noindex(res);
        if (!(0, http_1.csrfValid)(req))
            throw new common_1.ForbiddenException('CSRF verification failed. Request aborted.');
        const ip = (0, http_1.clientIp)(req) ?? 'unknown';
        const email = String(req.body?.email ?? '').trim().toLowerCase();
        const fail = (message, status = 200) => this.support.page(req, res, 'login.html', { error: message, email, next: String(req.body?.next ?? ''), needs_setup: false }, status);
        if (attempts.hit(ip) > 10)
            return fail('Too many attempts. Please wait 15 minutes and try again.', 429);
        const user = email ? await this.prisma.adminUser.findUnique({ where: { email } }) : null;
        const ok = user && user.is_active && (await (0, auth_1.checkPassword)(String(req.body?.password ?? ''), user.password_hash));
        if (!user || !ok) {
            await (0, auth_1.hashPassword)('timing-equaliser');
            return fail('Wrong email or password.');
        }
        await this.prisma.adminUser.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
        (0, auth_1.startSession)(res, user);
        return res.redirect(302, this.safeNext(req.body?.next));
    }
    logout(req, res) {
        if (!(0, http_1.csrfValid)(req))
            throw new common_1.ForbiddenException('CSRF verification failed. Request aborted.');
        (0, auth_1.endSession)(res);
        return res.redirect(302, `${admin_support_1.BASE}/login/`);
    }
    async setupForm(req, res) {
        this.noindex(res);
        if ((await this.prisma.adminUser.count()) > 0)
            throw new common_1.NotFoundException();
        return this.support.page(req, res, 'setup.html', { setup_ready: Boolean(config_1.config.setupKey), values: {}, errors: {} });
    }
    async setup(req, res) {
        this.noindex(res);
        if (!(0, http_1.csrfValid)(req))
            throw new common_1.ForbiddenException('CSRF verification failed. Request aborted.');
        if ((await this.prisma.adminUser.count()) > 0)
            throw new common_1.NotFoundException();
        const b = req.body ?? {};
        const values = { name: String(b.name ?? '').trim(), email: String(b.email ?? '').trim().toLowerCase() };
        const errors = {};
        if (!config_1.config.setupKey)
            errors.setup_key = 'SETUP_KEY is not set on the server yet.';
        else if (String(b.setup_key ?? '') !== config_1.config.setupKey)
            errors.setup_key = 'The setup key is not correct.';
        if (!values.name)
            errors.name = 'This field is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
            errors.email = 'Enter a valid email address.';
        const problem = (0, auth_1.passwordProblem)(String(b.password ?? ''), values.email);
        if (problem)
            errors.password = problem;
        else if (b.password !== b.password2)
            errors.password2 = 'The two passwords do not match.';
        if (Object.keys(errors).length)
            return this.support.page(req, res, 'setup.html', { setup_ready: Boolean(config_1.config.setupKey), values, errors });
        const user = await this.prisma.adminUser.create({ data: { name: values.name, email: values.email, password_hash: await (0, auth_1.hashPassword)(String(b.password)), is_superuser: true } });
        (0, auth_1.startSession)(res, user);
        this.support.flash(res, 'success', 'Your admin account is ready. Start with Site settings.');
        return res.redirect(302, `${admin_support_1.BASE}/site-settings/`);
    }
};
exports.AdminAuthController = AdminAuthController;
__decorate([
    (0, common_1.Get)('login/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "loginForm", null);
__decorate([
    (0, common_1.Post)('login/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('logout/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminAuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('setup/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "setupForm", null);
__decorate([
    (0, common_1.Post)('setup/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminAuthController.prototype, "setup", null);
exports.AdminAuthController = AdminAuthController = __decorate([
    (0, common_1.Controller)(admin_support_1.BASE),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, admin_support_1.AdminSupport])
], AdminAuthController);
