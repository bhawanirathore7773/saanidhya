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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotifyService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = __importStar(require("nodemailer"));
const config_1 = require("../config/config");
const utils_1 = require("../common/utils");
const site_service_1 = require("../site/site.service");
const prisma_service_1 = require("../prisma/prisma.service");
const enquiry_form_1 = require("./enquiry-form");
const GRAPH_URL = (id) => `https://graph.facebook.com/v20.0/${id}/messages`;
let NotifyService = class NotifyService {
    prisma;
    site;
    log = new common_1.Logger('LeadNotify');
    transport = null;
    timer;
    constructor(prisma, site) {
        this.prisma = prisma;
        this.site = site;
    }
    onModuleInit() {
        this.timer = setInterval(() => this.retryPending().catch((e) => this.log.warn(`retry failed: ${e.message}`)), 10 * 60 * 1000);
        this.timer.unref();
    }
    onModuleDestroy() { if (this.timer)
        clearInterval(this.timer); }
    whatsappConfigured() {
        const w = config_1.config.whatsapp;
        return Boolean(w.token && w.phoneId && w.notifyTo && w.template);
    }
    describe(lead) {
        return {
            event: lead.event_type ? lead.event_type.name : 'Not selected',
            date: lead.event_date ? (0, utils_1.formatDate)(new utils_1.DateOnly(lead.event_date), 'd M Y') : 'Not decided',
            city: lead.city || '-',
            budget: (0, enquiry_form_1.budgetLabel)(lead.budget) || 'Not shared',
        };
    }
    buildEmail(lead, site) {
        const d = this.describe(lead);
        const adminUrl = `${config_1.config.siteUrl}${config_1.config.adminBase}/leads/${lead.id}/`;
        const reply = (0, utils_1.whatsappUrl)(lead.phone, `Hi ${lead.name}, thank you for contacting ${site.business_name}. We received your enquiry and would love to help plan your celebration.`);
        const lines = [
            `New enquiry on the website: ${lead.name}`, '',
            `Name:        ${lead.name}`, `Mobile:      ${lead.phone}`, `Event type:  ${d.event}`, `Event date:  ${d.date}`, `City:        ${d.city}`, `Budget:      ${d.budget}`,
        ];
        if (lead.service)
            lines.push(`Interested in: ${lead.service.title}`);
        lines.push('', `Call:               tel:+${(0, utils_1.normalizePhone)(lead.phone)}`, `Reply on WhatsApp:  ${reply}`, `Open in admin:      ${adminUrl}`);
        if (lead.source_url || lead.utm_source) {
            lines.push('', `Came from: ${lead.source_url || '-'}`);
            if (lead.utm_source)
                lines.push(`Campaign:  ${lead.utm_source} / ${lead.utm_medium || '-'} / ${lead.utm_campaign || '-'}`);
        }
        return { subject: `New enquiry: ${lead.name} (${d.event}, ${d.date})`.split(/\s+/).join(' '), body: lines.join('\n') };
    }
    mailer() {
        if (!this.transport) {
            const e = config_1.config.email;
            if (!e.host) {
                this.transport = nodemailer.createTransport({ jsonTransport: true });
            }
            else {
                this.transport = nodemailer.createTransport({
                    host: e.host, port: e.port, secure: e.port === 465, requireTLS: e.useTls && e.port !== 465,
                    auth: e.user ? { user: e.user, pass: e.password } : undefined, connectionTimeout: 10000, socketTimeout: 15000,
                });
            }
        }
        return this.transport;
    }
    async sendEmail(lead, site) {
        const to = site.notification_email_list;
        if (!to.length)
            return false;
        const { subject, body } = this.buildEmail(lead, site);
        await this.mailer().sendMail({ from: config_1.config.email.from, to, subject, text: body });
        return true;
    }
    async sendWhatsapp(lead) {
        const d = this.describe(lead);
        const params = [lead.name, lead.phone, d.event, d.date, d.city, d.budget];
        const w = config_1.config.whatsapp;
        const res = await fetch(GRAPH_URL(w.phoneId), {
            method: 'POST',
            headers: { Authorization: `Bearer ${w.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messaging_product: 'whatsapp', to: (0, utils_1.normalizePhone)(w.notifyTo), type: 'template',
                template: { name: w.template, language: { code: w.lang }, components: [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: String(p).slice(0, 200) })) }] },
            }),
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok)
            throw new Error(`WhatsApp API ${res.status}: ${(await res.text()).slice(0, 300)}`);
        return true;
    }
    async notifyLead(leadId) {
        const lead = await this.prisma.lead.findUnique({ where: { id: leadId }, include: { event_type: true, service: true } });
        if (!lead)
            return;
        const site = await this.site.load();
        const changes = {};
        const errors = [];
        if (!lead.email_sent) {
            try {
                if (await this.sendEmail(lead, site))
                    changes.email_sent = true;
            }
            catch (e) {
                this.log.error(`Enquiry email failed for lead ${leadId}: ${e.message}`);
                errors.push(`email: ${e.name}: ${e.message}`);
            }
        }
        if (!lead.whatsapp_sent && this.whatsappConfigured()) {
            try {
                if (await this.sendWhatsapp(lead))
                    changes.whatsapp_sent = true;
            }
            catch (e) {
                this.log.error(`Enquiry WhatsApp failed for lead ${leadId}: ${e.message}`);
                errors.push(`whatsapp: ${e.name}: ${e.message}`);
            }
        }
        changes.notify_error = errors.join('; ').slice(0, 1000);
        await this.prisma.lead.update({ where: { id: leadId }, data: changes });
    }
    notifyInBackground(leadId) {
        const run = () => this.notifyLead(leadId).catch((e) => this.log.error(`notify ${leadId}: ${e.message}`));
        if (config_1.config.lead.notifyThreaded)
            setImmediate(run);
        else
            void run();
    }
    async retryPending() {
        const since = new Date(Date.now() - 48 * 3600 * 1000);
        const older = new Date(Date.now() - 2 * 60 * 1000);
        const leads = await this.prisma.lead.findMany({
            where: { created_at: { gte: since, lte: older }, OR: [{ email_sent: false, notify_error: { not: '' } }, { whatsapp_sent: false, notify_error: { not: '' } }] },
            take: 20,
        });
        for (const lead of leads)
            await this.notifyLead(lead.id);
        return leads.length;
    }
};
exports.NotifyService = NotifyService;
exports.NotifyService = NotifyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, site_service_1.SiteService])
], NotifyService);
