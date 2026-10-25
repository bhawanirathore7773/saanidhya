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
exports.LeadsController = void 0;
const common_1 = require("@nestjs/common");
const catalog_1 = require("../common/catalog");
const http_1 = require("../common/http");
const schema_1 = require("../common/schema");
const seo_1 = require("../common/seo");
const utils_1 = require("../common/utils");
const view_service_1 = require("../common/view.service");
const config_1 = require("../config/config");
const prisma_service_1 = require("../prisma/prisma.service");
const antispam_1 = require("./antispam");
const enquiry_form_1 = require("./enquiry-form");
const notify_service_1 = require("./notify.service");
const SUMMARY_COOKIE = 'lead_summary';
const SUMMARY_SALT = 'saanidhya.lead-summary';
let LeadsController = class LeadsController {
    prisma;
    views;
    notify;
    log = new common_1.Logger('Enquiry');
    constructor(prisma, views, notify) {
        this.prisma = prisma;
        this.views = views;
        this.notify = notify;
    }
    categories() {
        return this.prisma.eventCategory.findMany({ where: catalog_1.PUBLISHED, orderBy: [{ ordering: 'asc' }, { name: 'asc' }], select: { id: true, name: true } });
    }
    chosenService(slug) {
        return slug ? this.prisma.service.findFirst({ where: { ...catalog_1.PUBLISHED, slug } }) : Promise.resolve(null);
    }
    pageContext(req, site, extra) {
        const crumbs = [{ name: 'Home', url: '/' }, { name: 'Contact', url: req.path }];
        return {
            seo: (0, seo_1.buildSeo)(req.path, site, {
                title: `Free Quote for Event Decoration in ${site.city}`,
                description: `Tell ${site.business_name} about your wedding, birthday or event in ${site.city}. Send your date, venue and budget and get a clear written quote.`,
            }),
            schema: (0, schema_1.buildGraph)(site, [], { breadcrumbs: crumbs }), breadcrumbs: crumbs, ...extra,
        };
    }
    summary(lead) {
        return {
            name: lead.name, phone: lead.phone, event: lead.event_type ? lead.event_type.name : '',
            date: lead.event_date ? (0, utils_1.formatDate)(new utils_1.DateOnly(lead.event_date), 'd M Y').replace(/^(\d) /, '0$1 ') : '', city: lead.city,
        };
    }
    followUp(site, s) {
        if (!s)
            return (0, utils_1.whatsappUrl)(site.whatsapp_number || site.phone, site.whatsapp_message);
        const when = s.date || 'date not decided yet';
        return (0, utils_1.whatsappUrl)(site.whatsapp_number || site.phone, `Hi ${site.business_name}, I am ${s.name}. I just sent an enquiry on your website for ${s.event || 'an event'} (${when}, ${s.city}). Please contact me. Thank you!`);
    }
    async formResponse(req, res, site, values, errors, nonField, service, formToken, status = 200) {
        const csrf_token = (0, http_1.ensureCsrf)(req, res);
        const form = (0, enquiry_form_1.renderForm)({ values, errors, nonField, categories: await this.categories(), formToken });
        const ctx = { form, form_token: formToken, service, csrf_token };
        res.set('Cache-Control', 'no-store');
        if ((0, http_1.isPartial)(req))
            return this.views.render(res, 'leads/_form_card.html', ctx, status);
        return this.views.render(res, 'leads/contact.html', { ...this.pageContext(req, site, ctx) }, status);
    }
    success(req, res, site, summary) {
        res.set('Cache-Control', 'no-store');
        if ((0, http_1.isHtmx)(req))
            return this.views.render(res, 'leads/_success.html', { summary, whatsapp_follow_up: this.followUp(site, summary) });
        if (summary)
            res.cookie(SUMMARY_COOKIE, (0, http_1.sign)(JSON.stringify(summary), SUMMARY_SALT), { httpOnly: true, sameSite: 'lax', secure: config_1.config.production, maxAge: 3600 * 1000, path: '/' });
        return res.redirect(302, '/contact/thanks/');
    }
    limited(req, res, site) {
        if ((0, http_1.isHtmx)(req))
            return this.views.render(res, 'leads/_limited.html', {});
        return this.views.render(res, 'leads/contact.html', this.pageContext(req, site, { limited: true }), 429);
    }
    async contact(req, res) {
        const site = res.locals.site;
        const values = { city: site.city, source_url: (0, http_1.sameSitePath)(req, req.header('referer')) };
        const service = await this.chosenService(String(req.query.service ?? ''));
        if (service) {
            values.service_slug = service.slug;
            values.event_type = String(service.category_id);
        }
        else if (req.query.type) {
            const category = await this.prisma.eventCategory.findFirst({ where: { ...catalog_1.PUBLISHED, slug: String(req.query.type) } });
            if (category)
                values.event_type = String(category.id);
        }
        return this.formResponse(req, res, site, values, {}, [], service, (0, enquiry_form_1.makeFormToken)());
    }
    async submit(req, res) {
        if (!(0, http_1.csrfValid)(req))
            throw new common_1.ForbiddenException('CSRF verification failed. Request aborted.');
        const site = res.locals.site;
        const body = (req.body ?? {});
        const ip = (0, http_1.clientIp)(req);
        if ((0, antispam_1.attemptsExceeded)(ip)) {
            this.log.warn(`Too many attempts from ${ip}`);
            return this.limited(req, res, site);
        }
        const service = await this.chosenService(String(body.service_slug ?? ''));
        const reason = (0, enquiry_form_1.spamReason)(body);
        if (reason === 'honeypot' || reason === 'no_token') {
            this.log.log(`Dropped as spam (${reason}) from ${ip}`);
            return this.success(req, res, site, null);
        }
        const categories = await this.categories();
        const { cleaned, errors, valid } = (0, enquiry_form_1.validateEnquiry)(body, categories);
        if (reason === 'too_fast' || reason === 'stale') {
            const message = reason === 'too_fast'
                ? 'That was very quick. Please check your details and press Send again.'
                : 'This page has been open for a long time. Please press Send again to confirm your details.';
            return this.formResponse(req, res, site, body, errors, [message], service, (0, enquiry_form_1.makeFormToken)());
        }
        if (!valid)
            return this.formResponse(req, res, site, body, errors, [], service, String(body.form_token ?? (0, enquiry_form_1.makeFormToken)()));
        if (await (0, antispam_1.savedLimitReached)(this.prisma, ip)) {
            this.log.warn(`Saved-enquiry limit reached for ${ip}`);
            return this.limited(req, res, site);
        }
        const duplicate = await (0, antispam_1.findDuplicate)(this.prisma, cleaned.phone, cleaned.event_type_id);
        if (duplicate)
            return this.success(req, res, site, this.summary(duplicate));
        const lead = await this.prisma.lead.create({
            data: {
                name: cleaned.name, phone: cleaned.phone, event_type_id: cleaned.event_type_id, service_id: service?.id ?? null,
                event_date: cleaned.event_date, city: cleaned.city, budget: cleaned.budget, notes: '', notify_error: '',
                source_url: (0, http_1.sameSitePath)(req, cleaned.source_url), utm_source: cleaned.utm_source, utm_medium: cleaned.utm_medium, utm_campaign: cleaned.utm_campaign,
                ip_address: ip, user_agent: (req.header('user-agent') ?? '').slice(0, 300),
            },
            include: { event_type: true },
        });
        this.notify.notifyInBackground(lead.id);
        return this.success(req, res, site, this.summary(lead));
    }
    thanks(req, res) {
        const site = res.locals.site;
        let summary = null;
        const raw = (0, http_1.unsign)(req.cookies?.[SUMMARY_COOKIE] ?? '', SUMMARY_SALT);
        if (raw) {
            try {
                summary = JSON.parse(raw);
            }
            catch {
                summary = null;
            }
        }
        res.set('Cache-Control', 'no-store');
        const ctx = this.pageContext(req, site, { summary, whatsapp_follow_up: this.followUp(site, summary), thanks_page: true });
        ctx.seo = (0, seo_1.buildSeo)(req.path, site, { title: 'Thank you', noindex: true });
        ctx.schema = null;
        this.views.render(res, 'leads/thanks.html', ctx);
    }
};
exports.LeadsController = LeadsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "contact", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "submit", null);
__decorate([
    (0, common_1.Get)('thanks/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LeadsController.prototype, "thanks", null);
exports.LeadsController = LeadsController = __decorate([
    (0, common_1.Controller)('contact'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, view_service_1.ViewService, notify_service_1.NotifyService])
], LeadsController);
