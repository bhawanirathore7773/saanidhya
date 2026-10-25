import { Controller, ForbiddenException, Get, Logger, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { PUBLISHED } from '../common/catalog';
import { clientIp, csrfValid, ensureCsrf, isHtmx, isPartial, sameSitePath, sign, unsign } from '../common/http';
import { buildGraph } from '../common/schema';
import { buildSeo } from '../common/seo';
import { DateOnly, formatDate, whatsappUrl } from '../common/utils';
import { ViewService } from '../common/view.service';
import { config } from '../config/config';
import { PrismaService } from '../prisma/prisma.service';
import { attemptsExceeded, findDuplicate, savedLimitReached } from './antispam';
import { makeFormToken, renderForm, spamReason, validateEnquiry } from './enquiry-form';
import { NotifyService } from './notify.service';

const SUMMARY_COOKIE = 'lead_summary';
const SUMMARY_SALT = 'saanidhya.lead-summary';

interface Summary { name: string; phone: string; event: string; date: string; city: string }

@Controller('contact')
export class LeadsController {
  private readonly log = new Logger('Enquiry');
  constructor(private readonly prisma: PrismaService, private readonly views: ViewService, private readonly notify: NotifyService) {}

  private categories() {
    return this.prisma.eventCategory.findMany({ where: PUBLISHED, orderBy: [{ ordering: 'asc' }, { name: 'asc' }], select: { id: true, name: true } });
  }
  private chosenService(slug: string) {
    return slug ? this.prisma.service.findFirst({ where: { ...PUBLISHED, slug } }) : Promise.resolve(null);
  }

  private pageContext(req: Request, site: any, extra: Record<string, any>) {
    const crumbs = [{ name: 'Home', url: '/' }, { name: 'Contact', url: req.path }];
    return {
      seo: buildSeo(req.path, site, {
        title: `Free Quote for Event Decoration in ${site.city}`,
        description: `Tell ${site.business_name} about your wedding, birthday or event in ${site.city}. Send your date, venue and budget and get a clear written quote.`,
      }),
      schema: buildGraph(site, [], { breadcrumbs: crumbs }), breadcrumbs: crumbs, ...extra,
    };
  }

  private summary(lead: any): Summary {
    return {
      name: lead.name, phone: lead.phone, event: lead.event_type ? lead.event_type.name : '',
      date: lead.event_date ? formatDate(new DateOnly(lead.event_date), 'd M Y').replace(/^(\d) /, '0$1 ') : '', city: lead.city,
    };
  }

  private followUp(site: any, s: Summary | null) {
    if (!s) return whatsappUrl(site.whatsapp_number || site.phone, site.whatsapp_message);
    const when = s.date || 'date not decided yet';
    return whatsappUrl(site.whatsapp_number || site.phone,
      `Hi ${site.business_name}, I am ${s.name}. I just sent an enquiry on your website for ${s.event || 'an event'} (${when}, ${s.city}). Please contact me. Thank you!`);
  }

  private async formResponse(req: Request, res: Response, site: any, values: Record<string, any>, errors: Record<string, string>, nonField: string[], service: any, formToken: string, status = 200) {
    const csrf_token = ensureCsrf(req, res);
    const form = renderForm({ values, errors, nonField, categories: await this.categories(), formToken });
    const ctx = { form, form_token: formToken, service, csrf_token };
    res.set('Cache-Control', 'no-store');
    if (isPartial(req)) return this.views.render(res, 'leads/_form_card.html', ctx, status);
    return this.views.render(res, 'leads/contact.html', { ...this.pageContext(req, site, ctx) }, status);
  }

  private success(req: Request, res: Response, site: any, summary: Summary | null) {
    res.set('Cache-Control', 'no-store');
    if (isHtmx(req)) return this.views.render(res, 'leads/_success.html', { summary, whatsapp_follow_up: this.followUp(site, summary) });
    if (summary) res.cookie(SUMMARY_COOKIE, sign(JSON.stringify(summary), SUMMARY_SALT), { httpOnly: true, sameSite: 'lax', secure: config.production, maxAge: 3600 * 1000, path: '/' });
    return res.redirect(302, '/contact/thanks/');
  }

  private limited(req: Request, res: Response, site: any) {
    if (isHtmx(req)) return this.views.render(res, 'leads/_limited.html', {}); // 200 so htmx shows it
    return this.views.render(res, 'leads/contact.html', this.pageContext(req, site, { limited: true }), 429);
  }

  @Get()
  async contact(@Req() req: Request, @Res() res: Response) {
    const site = res.locals.site;
    const values: Record<string, any> = { city: site.city, source_url: sameSitePath(req, req.header('referer')) };
    const service = await this.chosenService(String(req.query.service ?? ''));
    if (service) { values.service_slug = service.slug; values.event_type = String(service.category_id); }
    else if (req.query.type) {
      const category = await this.prisma.eventCategory.findFirst({ where: { ...PUBLISHED, slug: String(req.query.type) } });
      if (category) values.event_type = String(category.id);
    }
    return this.formResponse(req, res, site, values, {}, [], service, makeFormToken());
  }

  @Post()
  async submit(@Req() req: Request, @Res() res: Response) {
    if (!csrfValid(req)) throw new ForbiddenException('CSRF verification failed. Request aborted.');
    const site = res.locals.site;
    const body = (req.body ?? {}) as Record<string, any>;
    const ip = clientIp(req);
    if (attemptsExceeded(ip)) { this.log.warn(`Too many attempts from ${ip}`); return this.limited(req, res, site); }

    const service = await this.chosenService(String(body.service_slug ?? ''));
    const reason = spamReason(body);
    if (reason === 'honeypot' || reason === 'no_token') {
      this.log.log(`Dropped as spam (${reason}) from ${ip}`);
      return this.success(req, res, site, null); // looks like success, saves nothing, teaches the bot nothing
    }
    const categories = await this.categories();
    const { cleaned, errors, valid } = validateEnquiry(body, categories);
    if (reason === 'too_fast' || reason === 'stale') {
      const message = reason === 'too_fast'
        ? 'That was very quick. Please check your details and press Send again.'
        : 'This page has been open for a long time. Please press Send again to confirm your details.';
      return this.formResponse(req, res, site, body, errors, [message], service, makeFormToken());
    }
    if (!valid) return this.formResponse(req, res, site, body, errors, [], service, String(body.form_token ?? makeFormToken()));
    if (await savedLimitReached(this.prisma, ip)) { this.log.warn(`Saved-enquiry limit reached for ${ip}`); return this.limited(req, res, site); }

    const duplicate = await findDuplicate(this.prisma, cleaned.phone, cleaned.event_type_id);
    if (duplicate) return this.success(req, res, site, this.summary(duplicate));

    const lead = await this.prisma.lead.create({
      data: {
        name: cleaned.name, phone: cleaned.phone, event_type_id: cleaned.event_type_id, service_id: service?.id ?? null,
        event_date: cleaned.event_date, city: cleaned.city, budget: cleaned.budget, notes: '', notify_error: '',
        source_url: sameSitePath(req, cleaned.source_url), utm_source: cleaned.utm_source, utm_medium: cleaned.utm_medium, utm_campaign: cleaned.utm_campaign,
        ip_address: ip, user_agent: (req.header('user-agent') ?? '').slice(0, 300),
      },
      include: { event_type: true },
    });
    this.notify.notifyInBackground(lead.id);
    return this.success(req, res, site, this.summary(lead));
  }

  @Get('thanks/')
  thanks(@Req() req: Request, @Res() res: Response) {
    const site = res.locals.site;
    let summary: Summary | null = null;
    const raw = unsign(req.cookies?.[SUMMARY_COOKIE] ?? '', SUMMARY_SALT);
    if (raw) { try { summary = JSON.parse(raw); } catch { summary = null; } }
    res.set('Cache-Control', 'no-store');
    const ctx = this.pageContext(req, site, { summary, whatsapp_follow_up: this.followUp(site, summary), thanks_page: true });
    ctx.seo = buildSeo(req.path, site, { title: 'Thank you', noindex: true });
    (ctx as any).schema = null;
    this.views.render(res, 'leads/thanks.html', ctx);
  }
}
