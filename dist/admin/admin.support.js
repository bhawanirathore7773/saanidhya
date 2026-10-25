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
exports.AdminSupport = exports.BASE = void 0;
const common_1 = require("@nestjs/common");
const cache_1 = require("../common/cache");
const http_1 = require("../common/http");
const view_service_1 = require("../common/view.service");
const config_1 = require("../config/config");
const prisma_service_1 = require("../prisma/prisma.service");
const resources_1 = require("./resources");
exports.BASE = config_1.config.adminUrl.replace(/\/$/, '');
let AdminSupport = class AdminSupport {
    prisma;
    views;
    versions;
    constructor(prisma, views, versions) {
        this.prisma = prisma;
        this.views = views;
        this.versions = versions;
    }
    flash(res, level, message) {
        res.cookie('admin_flash', Buffer.from(JSON.stringify({ l: level, m: message })).toString('base64url'), { httpOnly: true, sameSite: 'lax', maxAge: 60000, path: '/' });
    }
    readFlash(req, res) {
        const raw = req.cookies?.admin_flash;
        if (!raw)
            return null;
        res.clearCookie('admin_flash', { path: '/' });
        try {
            const f = JSON.parse(Buffer.from(raw, 'base64url').toString());
            return { level: f.l, message: f.m };
        }
        catch {
            return null;
        }
    }
    async page(req, res, template, ctx = {}, status = 200) {
        const newLeads = res.locals.admin ? await this.prisma.lead.count({ where: { status: 'new' } }) : 0;
        const active = ctx.active ?? '';
        this.views.render(res, `admin/${template}`, {
            adminBase: exports.BASE, csrf_token: (0, http_1.ensureCsrf)(req, res), flash: this.readFlash(req, res), new_leads: newLeads, active,
            nav: resources_1.RESOURCES.map((r) => ({ key: r.key, label: r.plural })), siteUrl: config_1.config.siteUrl, ...ctx,
        }, status);
    }
    refresh() { return this.versions.bump(); }
    back(req, fallback) {
        const ref = req.header('referer') || '';
        try {
            const u = new URL(ref, config_1.config.siteUrl);
            if (u.pathname.startsWith(exports.BASE + '/'))
                return u.pathname + u.search;
        }
        catch { }
        return fallback;
    }
};
exports.AdminSupport = AdminSupport;
exports.AdminSupport = AdminSupport = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, view_service_1.ViewService, cache_1.ContentVersionService])
], AdminSupport);
