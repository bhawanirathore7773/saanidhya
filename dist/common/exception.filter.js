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
exports.SiteExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const seo_1 = require("./seo");
const view_service_1 = require("./view.service");
const FALLBACK_500 = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Something went wrong</title><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;line-height:1.6"><h1>Something went wrong</h1><p>Sorry, we hit a problem. Please try again in a minute.</p><p><a href="/">Back to the home page</a></p></body></html>';
let SiteExceptionFilter = class SiteExceptionFilter {
    views;
    log = new common_1.Logger('Error');
    constructor(views) {
        this.views = views;
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        const req = ctx.getRequest();
        if (res.headersSent)
            return;
        const status = exception instanceof common_1.HttpException ? exception.getStatus() : 500;
        const wantsHtml = (req.header('accept') || '').includes('html') || !req.header('accept');
        if (status >= 500)
            this.log.error(`${req.method} ${req.originalUrl}: ${exception?.stack || exception}`);
        if (status === 404 && wantsHtml && res.locals.site) {
            try {
                return this.views.render(res, '404.html', { seo: (0, seo_1.buildSeo)(req.path, res.locals.site, { title: 'Page not found', noindex: true }) }, 404);
            }
            catch { }
        }
        if (status === 403 && req.method === 'POST')
            return void res.status(403).type('text').send('CSRF verification failed. Request aborted.');
        if (status >= 500 && wantsHtml)
            return void res.status(500).type('html').send(FALLBACK_500);
        res.status(status).type('text').send(status === 404 ? 'Not found' : exception instanceof common_1.HttpException ? String(exception.message) : 'Server error');
    }
};
exports.SiteExceptionFilter = SiteExceptionFilter;
exports.SiteExceptionFilter = SiteExceptionFilter = __decorate([
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [view_service_1.ViewService])
], SiteExceptionFilter);
