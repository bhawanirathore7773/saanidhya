import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { config } from '../config/config';
import { formatDate, DateOnly, normalizePhone, whatsappUrl } from '../common/utils';
import { SiteService } from '../site/site.service';
import { PrismaService } from '../prisma/prisma.service';
import { budgetLabel } from './enquiry-form';

const GRAPH_URL = (id: string) => `https://graph.facebook.com/v20.0/${id}/messages`;

@Injectable()
export class NotifyService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('LeadNotify');
  private transport: nodemailer.Transporter | null = null;
  private timer?: NodeJS.Timeout;
  constructor(private readonly prisma: PrismaService, private readonly site: SiteService) {}

  onModuleInit() {
    // Retry failed notifications every 10 minutes (shared hosting has no cron guarantee).
    this.timer = setInterval(() => this.retryPending().catch((e) => this.log.warn(`retry failed: ${e.message}`)), 10 * 60 * 1000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  whatsappConfigured() {
    const w = config.whatsapp;
    return Boolean(w.token && w.phoneId && w.notifyTo && w.template);
  }

  private describe(lead: any) {
    return {
      event: lead.event_type ? lead.event_type.name : 'Not selected',
      date: lead.event_date ? formatDate(new DateOnly(lead.event_date), 'd M Y') : 'Not decided',
      city: lead.city || '-',
      budget: budgetLabel(lead.budget) || 'Not shared',
    };
  }

  buildEmail(lead: any, site: any): { subject: string; body: string } {
    const d = this.describe(lead);
    const adminUrl = `${config.siteUrl}${config.adminBase}/leads/${lead.id}/`;
    const reply = whatsappUrl(lead.phone, `Hi ${lead.name}, thank you for contacting ${site.business_name}. We received your enquiry and would love to help plan your celebration.`);
    const lines = [
      `New enquiry on the website: ${lead.name}`, '',
      `Name:        ${lead.name}`, `Mobile:      ${lead.phone}`, `Event type:  ${d.event}`, `Event date:  ${d.date}`, `City:        ${d.city}`, `Budget:      ${d.budget}`,
    ];
    if (lead.service) lines.push(`Interested in: ${lead.service.title}`);
    lines.push('', `Call:               tel:+${normalizePhone(lead.phone)}`, `Reply on WhatsApp:  ${reply}`, `Open in admin:      ${adminUrl}`);
    if (lead.source_url || lead.utm_source) {
      lines.push('', `Came from: ${lead.source_url || '-'}`);
      if (lead.utm_source) lines.push(`Campaign:  ${lead.utm_source} / ${lead.utm_medium || '-'} / ${lead.utm_campaign || '-'}`);
    }
    return { subject: `New enquiry: ${lead.name} (${d.event}, ${d.date})`.split(/\s+/).join(' '), body: lines.join('\n') };
  }

  private mailer() {
    if (!this.transport) {
      const e = config.email;
      if (!e.host) {
        this.transport = nodemailer.createTransport({ jsonTransport: true }); // no SMTP set up yet: nothing leaves the server
      } else {
        this.transport = nodemailer.createTransport({
          host: e.host, port: e.port, secure: e.port === 465, requireTLS: e.useTls && e.port !== 465,
          auth: e.user ? { user: e.user, pass: e.password } : undefined, connectionTimeout: 10000, socketTimeout: 15000,
        });
      }
    }
    return this.transport;
  }

  private async sendEmail(lead: any, site: any): Promise<boolean> {
    const to = site.notification_email_list as string[];
    if (!to.length) return false;
    const { subject, body } = this.buildEmail(lead, site);
    await this.mailer().sendMail({ from: config.email.from, to, subject, text: body });
    return true;
  }

  private async sendWhatsapp(lead: any): Promise<boolean> {
    const d = this.describe(lead);
    const params = [lead.name, lead.phone, d.event, d.date, d.city, d.budget];
    const w = config.whatsapp;
    const res = await fetch(GRAPH_URL(w.phoneId), {
      method: 'POST',
      headers: { Authorization: `Bearer ${w.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp', to: normalizePhone(w.notifyTo), type: 'template',
        template: { name: w.template, language: { code: w.lang }, components: [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: String(p).slice(0, 200) })) }] },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`WhatsApp API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return true;
  }

  /** Email + WhatsApp for one enquiry. Records what worked and what failed on the lead itself. */
  async notifyLead(leadId: number): Promise<void> {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId }, include: { event_type: true, service: true } });
    if (!lead) return;
    const site = await this.site.load();
    const changes: Record<string, any> = {};
    const errors: string[] = [];
    if (!lead.email_sent) {
      try { if (await this.sendEmail(lead, site)) changes.email_sent = true; }
      catch (e: any) { this.log.error(`Enquiry email failed for lead ${leadId}: ${e.message}`); errors.push(`email: ${e.name}: ${e.message}`); }
    }
    if (!lead.whatsapp_sent && this.whatsappConfigured()) {
      try { if (await this.sendWhatsapp(lead)) changes.whatsapp_sent = true; }
      catch (e: any) { this.log.error(`Enquiry WhatsApp failed for lead ${leadId}: ${e.message}`); errors.push(`whatsapp: ${e.name}: ${e.message}`); }
    }
    changes.notify_error = errors.join('; ').slice(0, 1000);
    await this.prisma.lead.update({ where: { id: leadId }, data: changes });
  }

  /** Send in the background so the visitor never waits for the mail server. */
  notifyInBackground(leadId: number) {
    const run = () => this.notifyLead(leadId).catch((e) => this.log.error(`notify ${leadId}: ${e.message}`));
    if (config.lead.notifyThreaded) setImmediate(run); else void run();
  }

  async retryPending(): Promise<number> {
    const since = new Date(Date.now() - 48 * 3600 * 1000);
    const older = new Date(Date.now() - 2 * 60 * 1000);
    const leads = await this.prisma.lead.findMany({
      where: { created_at: { gte: since, lte: older }, OR: [{ email_sent: false, notify_error: { not: '' } }, { whatsapp_sent: false, notify_error: { not: '' } }] },
      take: 20,
    });
    for (const lead of leads) await this.notifyLead(lead.id);
    return leads.length;
  }
}
