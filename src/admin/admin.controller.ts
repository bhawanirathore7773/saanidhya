import { Controller, Get, NotFoundException, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { deleteMedia, mediaUrl } from '../common/images';
import { pageInfo } from '../common/http';
import { sanitize } from '../common/richtext';
import { saveImage, saveVideo, UploadError } from '../common/storage';
import { uniqueSlug } from '../common/slug';
import { DateOnly, formatDate, truncateChars } from '../common/utils';
import { RESERVED_SLUGS } from '../common/navigation';
import { PrismaService } from '../prisma/prisma.service';
import { SeedService } from '../seed/seed.service';
import { BUDGETS, budgetLabel, STATUSES } from '../leads/enquiry-form';
import { NotifyService } from '../leads/notify.service';
import { AdminSupport, BASE } from './admin.support';
import { AdminGuard, checkPassword, hashPassword, passwordProblem } from './auth';
import { buildFieldsets, fkOptions, parseForm, UploadedFile } from './forms';
import { ImageQueueService } from './image-queue.service';
import { Column, Field, resourceByKey, Resource, RESOURCES, SETTINGS_FIELDS, SETTINGS_FIELDSETS, SETTINGS_IMAGES } from './resources';

const PER_PAGE = 25;
const filesOf = (req: Request): UploadedFile[] => ((req as any).files ?? []) as UploadedFile[];
const adminOf = (req: Request) => (req as any).admin as { id: number; is_superuser: boolean; email: string; name: string };
const ids = (v: unknown): number[] => (Array.isArray(v) ? v : v ? [v] : []).map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n));
const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

@Controller(BASE)
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService, private readonly s: AdminSupport, private readonly queue: ImageQueueService,
    private readonly seed: SeedService, private readonly notify: NotifyService,
  ) {}

  // ------------------------------------------------------------ dashboard
  @Get()
  async dashboard(@Req() req: Request, @Res() res: Response) {
    const p = this.prisma;
    const week = new Date(Date.now() - 7 * 86400000);
    const [leadsNew, leadsWeek, leadsAll, services, projects, photos, videos, posts, testimonials, faqs, site, latest] = await Promise.all([
      p.lead.count({ where: { status: 'new' } }), p.lead.count({ where: { created_at: { gte: week } } }), p.lead.count(),
      p.service.count(), p.project.count(), p.galleryImage.count(), p.video.count(), p.blogPost.count(), p.testimonial.count(), p.faq.count(),
      p.siteSettings.findUnique({ where: { id: 1 } }), p.lead.findMany({ orderBy: { created_at: 'desc' }, take: 6, include: { event_type: true } }),
    ]);
    const todo: { text: string; href: string }[] = [];
    const set = `${BASE}/site-settings/`;
    if (!site?.phone) todo.push({ text: 'Add your phone and WhatsApp number', href: set });
    if (!site?.email) todo.push({ text: 'Add your email address (enquiries are sent here)', href: set });
    if (!site?.address_line) todo.push({ text: 'Add your address and map', href: set });
    if (!site?.hero_poster) todo.push({ text: 'Upload the home page hero photo', href: set });
    if (!site?.google_rating) todo.push({ text: 'Add your Google rating and review link', href: set });
    if (!photos) todo.push({ text: 'Upload photos of your work', href: `${BASE}/gallery/upload/` });
    if (!videos) todo.push({ text: 'Add a YouTube video', href: `${BASE}/videos/new/` });
    if (!testimonials) todo.push({ text: 'Add a client testimonial', href: `${BASE}/testimonials/new/` });
    return this.s.page(req, res, 'dashboard.html', {
      active: 'dashboard', stats: { leadsNew, leadsWeek, leadsAll, services, projects, photos, videos, posts, testimonials, faqs },
      latest: latest.map((l) => ({ ...l, when: formatDate(l.created_at, 'j M Y'), event: l.event_type?.name ?? '' })),
      todo, can_seed: services === 0, images_pending: this.queue.pending,
    });
  }

  @Post('seed/')
  async runSeed(@Req() req: Request, @Res() res: Response) {
    const r = await this.seed.run();
    this.s.flash(res, 'success', `Starter content added: ${r.services} services, ${r.faqs} FAQs, ${r.articles} articles, ${r.categories} event types. Edit them to match your business.`);
    return res.redirect(302, `${BASE}/`);
  }

  // -------------------------------------------------------------- account
  @Get('account/password/')
  passwordForm(@Req() req: Request, @Res() res: Response) { return this.s.page(req, res, 'password.html', { active: 'account', errors: {} }); }

  @Post('account/password/')
  async changePassword(@Req() req: Request, @Res() res: Response) {
    const user = await this.prisma.adminUser.findUnique({ where: { id: adminOf(req).id } });
    const b = req.body ?? {};
    const errors: Record<string, string> = {};
    if (!user || !(await checkPassword(String(b.current ?? ''), user.password_hash))) errors.current = 'Your current password is not correct.';
    const problem = passwordProblem(String(b.password ?? ''), user?.email);
    if (problem) errors.password = problem; else if (b.password !== b.password2) errors.password2 = 'The two passwords do not match.';
    if (Object.keys(errors).length) return this.s.page(req, res, 'password.html', { active: 'account', errors });
    await this.prisma.adminUser.update({ where: { id: user!.id }, data: { password_hash: await hashPassword(String(b.password)) } });
    this.s.flash(res, 'success', 'Password changed. Please sign in again.');
    res.clearCookie('admin_session', { path: '/' });
    return res.redirect(302, `${BASE}/login/`);
  }

  // ------------------------------------------------------ rich text images
  @Post('upload-image/')
  async uploadEditorImage(@Req() req: Request, @Res() res: Response) {
    const file = filesOf(req).find((f) => f.size > 0);
    if (!file) return res.status(400).json({ error: 'No file received.' });
    try {
      const saved = await saveImage(file.buffer, 'editor/{ym}', 1600);
      return res.json({ url: mediaUrl(saved.rel) });
    } catch (e: any) { return res.status(400).json({ error: e instanceof UploadError ? e.message : 'Upload failed.' }); }
  }

  // ------------------------------------------------------- site settings
  @Get('site-settings/')
  async settingsForm(@Req() req: Request, @Res() res: Response) {
    const row = await this.prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, service_areas: '', about_story: '' } });
    const fieldsets = buildFieldsets(SETTINGS_FIELDS, SETTINGS_FIELDSETS, row as any, {}, {}, 'row');
    return this.s.page(req, res, 'form.html', { active: 'site-settings', title: 'Site settings', blurb: 'Your business details. Changes appear on the website straight away.', fieldsets, action: `${BASE}/site-settings/`, singleton: true, back: `${BASE}/` });
  }

  @Post('site-settings/')
  async settingsSave(@Req() req: Request, @Res() res: Response) {
    const existing = await this.prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, service_areas: '', about_story: '' } });
    const names = SETTINGS_FIELDSETS.flatMap((f) => f.fields);
    const parsed = await parseForm(SETTINGS_FIELDS, names, { body: req.body, files: filesOf(req) }, this.prisma, false, existing as any);
    if (Object.keys(parsed.errors).length) {
      const fieldsets = buildFieldsets(SETTINGS_FIELDS, SETTINGS_FIELDSETS, { ...req.body, ...Object.fromEntries(SETTINGS_FIELDS.filter((f) => f.type === 'image' || f.type === 'video').map((f) => [`__current_${f.name}`, (existing as any)[f.name]])) }, parsed.errors, {}, 'post');
      return this.s.page(req, res, 'form.html', { active: 'site-settings', title: 'Site settings', fieldsets, action: `${BASE}/site-settings/`, singleton: true, back: `${BASE}/`, has_errors: true });
    }
    const data = parsed.data;
    try { await this.applyFiles(parsed, data, existing as any, SETTINGS_IMAGES, SETTINGS_FIELDS); }
    catch (e: any) { return this.uploadFailed(req, res, e, 'site-settings', SETTINGS_FIELDS, SETTINGS_FIELDSETS, SETTINGS_IMAGES, existing, 'Site settings'); }
    await this.prisma.siteSettings.update({ where: { id: 1 }, data });
    await this.s.refresh();
    this.s.flash(res, 'success', 'Site settings saved.');
    return res.redirect(302, `${BASE}/site-settings/`);
  }

  // ---------------------------------------------------------------- leads
  private leadWhere(q: Record<string, any>) {
    const where: any = {};
    if (q.status && STATUSES.some(([k]) => k === q.status)) where.status = q.status;
    if (/^\d+$/.test(String(q.event_type_id ?? ''))) where.event_type_id = Number(q.event_type_id);
    const term = String(q.q ?? '').trim();
    if (term) where.OR = ['name', 'phone', 'city'].map((f) => ({ [f]: { contains: term } }));
    return where;
  }

  @Get('leads/')
  async leads(@Req() req: Request, @Res() res: Response) {
    const where = this.leadWhere(req.query);
    const total = await this.prisma.lead.count({ where });
    const info = pageInfo(req.query.page, total, 30);
    const rows = await this.prisma.lead.findMany({ where, include: { event_type: true, service: true }, orderBy: { created_at: 'desc' }, skip: info.skip, take: info.take });
    const types = await this.prisma.eventCategory.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });
    const qs = new URLSearchParams(Object.entries(req.query).filter(([k, v]) => k !== 'page' && typeof v === 'string' && v) as [string, string][]).toString();
    return this.s.page(req, res, 'leads.html', {
      active: 'leads', total, page: info, q: req.query, qs, statuses: STATUSES, types,
      leads: rows.map((l) => ({ ...l, when: formatDate(l.created_at, 'j M Y'), time: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(l.created_at), event: l.event_type?.name ?? '', budget_label: budgetLabel(l.budget), event_date_text: l.event_date ? formatDate(new DateOnly(l.event_date), 'j M Y') : '' })),
    });
  }

  @Get('leads/export.csv')
  async leadsCsv(@Req() req: Request, @Res() res: Response) {
    const rows = await this.prisma.lead.findMany({ where: this.leadWhere(req.query), include: { event_type: true, service: true }, orderBy: { created_at: 'desc' }, take: 20000 });
    const head = ['Received (IST)', 'Name', 'Phone', 'Event type', 'Event date', 'City', 'Budget', 'Service page', 'Status', 'Notes', 'Source page', 'UTM source', 'UTM medium', 'UTM campaign'];
    const lines = [head.map(csvCell).join(',')];
    for (const l of rows) {
      lines.push([formatDate(l.created_at, 'Y-m-d'), l.name, l.phone, l.event_type?.name ?? '', l.event_date ? new DateOnly(l.event_date).toString() : '', l.city, budgetLabel(l.budget), l.service?.title ?? '', STATUSES.find(([k]) => k === l.status)?.[1] ?? l.status, l.notes, l.source_url, l.utm_source, l.utm_medium, l.utm_campaign]
        .map((v) => csvCell(/^[=+\-@]/.test(String(v ?? '')) ? `'${v}` : v)).join(','));
    }
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="enquiries-${new Date().toISOString().slice(0, 10)}.csv"` });
    return res.send('\ufeff' + lines.join('\r\n'));
  }

  @Post('leads/bulk/')
  async leadsBulk(@Req() req: Request, @Res() res: Response) {
    const picked = ids(req.body?.ids); const action = String(req.body?.action ?? '');
    if (!picked.length) this.s.flash(res, 'info', 'Tick at least one enquiry first.');
    else if (action.startsWith('status:') && STATUSES.some(([k]) => `status:${k}` === action)) {
      await this.prisma.lead.updateMany({ where: { id: { in: picked } }, data: { status: action.slice(7) } });
      this.s.flash(res, 'success', `${picked.length} enquiries updated.`);
    } else if (action === 'delete') { await this.prisma.lead.deleteMany({ where: { id: { in: picked } } }); this.s.flash(res, 'success', `${picked.length} enquiries deleted.`); }
    return res.redirect(302, this.s.back(req, `${BASE}/leads/`));
  }

  @Get('leads/:id/')
  async leadDetail(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const lead = await this.prisma.lead.findUnique({ where: { id: parseInt(id, 10) || 0 }, include: { event_type: true, service: true } });
    if (!lead) throw new NotFoundException();
    return this.s.page(req, res, 'lead.html', {
      active: 'leads', lead: { ...lead, received: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(lead.created_at), budget_label: budgetLabel(lead.budget), event_date_text: lead.event_date ? formatDate(new DateOnly(lead.event_date), 'j F Y') : '' },
      statuses: STATUSES, whatsapp: `https://wa.me/${lead.phone.replace(/\D/g, '')}`, whatsapp_configured: this.notify.whatsappConfigured(),
    });
  }

  @Post('leads/:id/')
  async leadSave(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const leadId = parseInt(id, 10) || 0;
    const status = String(req.body?.status ?? '');
    if (!STATUSES.some(([k]) => k === status)) throw new NotFoundException();
    await this.prisma.lead.update({ where: { id: leadId }, data: { status, notes: String(req.body?.notes ?? '').slice(0, 5000) } });
    this.s.flash(res, 'success', 'Enquiry updated.');
    return res.redirect(302, `${BASE}/leads/${leadId}/`);
  }

  @Post('leads/:id/resend/')
  async leadResend(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const leadId = parseInt(id, 10) || 0;
    await this.prisma.lead.update({ where: { id: leadId }, data: { email_sent: false, whatsapp_sent: false } });
    await this.notify.notifyLead(leadId);
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (lead?.notify_error) this.s.flash(res, 'error', `Could not send: ${truncateChars(lead.notify_error, 220)}`);
    else this.s.flash(res, lead?.email_sent || lead?.whatsapp_sent ? 'success' : 'info', lead?.email_sent || lead?.whatsapp_sent ? 'Notification sent again.' : 'Nothing to send: add a notification email in Site settings first.');
    return res.redirect(302, `${BASE}/leads/${leadId}/`);
  }

  @Post('leads/:id/delete/')
  async leadDelete(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    await this.prisma.lead.delete({ where: { id: parseInt(id, 10) || 0 } }).catch(() => undefined);
    this.s.flash(res, 'success', 'Enquiry deleted.');
    return res.redirect(302, `${BASE}/leads/`);
  }

  // ---------------------------------------------------------- admin users
  @Get('users/')
  async users(@Req() req: Request, @Res() res: Response) {
    if (!adminOf(req).is_superuser) throw new NotFoundException();
    const rows = await this.prisma.adminUser.findMany({ orderBy: { created_at: 'asc' } });
    return this.s.page(req, res, 'users.html', { active: 'users', users: rows.map((u) => ({ ...u, last: u.last_login_at ? formatDate(u.last_login_at, 'j M Y') : 'Never' })) });
  }

  @Get('users/new/')
  newUser(@Req() req: Request, @Res() res: Response) {
    if (!adminOf(req).is_superuser) throw new NotFoundException();
    return this.s.page(req, res, 'user_form.html', { active: 'users', values: { is_active: true }, errors: {}, isNew: true });
  }

  @Post('users/new/')
  async createUser(@Req() req: Request, @Res() res: Response) {
    if (!adminOf(req).is_superuser) throw new NotFoundException();
    const b = req.body ?? {};
    const values = { name: String(b.name ?? '').trim(), email: String(b.email ?? '').trim().toLowerCase(), is_superuser: b.is_superuser === 'on', is_active: true };
    const errors: Record<string, string> = {};
    if (!values.name) errors.name = 'This field is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address.';
    else if (await this.prisma.adminUser.findUnique({ where: { email: values.email } })) errors.email = 'An account with this email already exists.';
    const problem = passwordProblem(String(b.password ?? ''), values.email);
    if (problem) errors.password = problem;
    if (Object.keys(errors).length) return this.s.page(req, res, 'user_form.html', { active: 'users', values, errors, isNew: true });
    await this.prisma.adminUser.create({ data: { ...values, password_hash: await hashPassword(String(b.password)) } });
    this.s.flash(res, 'success', 'Admin account created.');
    return res.redirect(302, `${BASE}/users/`);
  }

  @Get('users/:id/')
  async editUser(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    if (!adminOf(req).is_superuser) throw new NotFoundException();
    const user = await this.prisma.adminUser.findUnique({ where: { id: parseInt(id, 10) || 0 } });
    if (!user) throw new NotFoundException();
    return this.s.page(req, res, 'user_form.html', { active: 'users', values: user, errors: {}, isNew: false, user_id: user.id });
  }

  @Post('users/:id/')
  async updateUser(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    if (!adminOf(req).is_superuser) throw new NotFoundException();
    const userId = parseInt(id, 10) || 0;
    const user = await this.prisma.adminUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    const b = req.body ?? {};
    const values = { name: String(b.name ?? '').trim(), email: String(b.email ?? '').trim().toLowerCase(), is_superuser: b.is_superuser === 'on', is_active: b.is_active === 'on' };
    const errors: Record<string, string> = {};
    if (!values.name) errors.name = 'This field is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address.';
    else { const other = await this.prisma.adminUser.findUnique({ where: { email: values.email } }); if (other && other.id !== userId) errors.email = 'An account with this email already exists.'; }
    const data: any = { ...values };
    if (String(b.password ?? '')) { const pr = passwordProblem(String(b.password), values.email); if (pr) errors.password = pr; else data.password_hash = await hashPassword(String(b.password)); }
    if (userId === adminOf(req).id && (!values.is_active || !values.is_superuser)) errors.is_active = 'You cannot remove your own access.';
    if (Object.keys(errors).length) return this.s.page(req, res, 'user_form.html', { active: 'users', values: { ...user, ...values }, errors, isNew: false, user_id: userId });
    await this.prisma.adminUser.update({ where: { id: userId }, data });
    this.s.flash(res, 'success', 'Admin account saved.');
    return res.redirect(302, `${BASE}/users/`);
  }

  // ---------------------------------------------------------- bulk photos
  @Get('gallery/upload/')
  async bulkForm(@Req() req: Request, @Res() res: Response) {
    const [projects, types] = await Promise.all([
      this.prisma.project.findMany({ orderBy: { title: 'asc' }, select: { id: true, title: true } }), this.prisma.eventCategory.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    ]);
    return this.s.page(req, res, 'bulk_upload.html', { active: 'gallery', projects, types, project_id: String(req.query.project_id ?? ''), event_category_id: String(req.query.event_category_id ?? '') });
  }

  @Post('gallery/upload/')
  async bulkUpload(@Req() req: Request, @Res() res: Response) {
    const files = filesOf(req).filter((f) => f.fieldname === 'photos' && f.size > 0).slice(0, 40);
    if (!files.length) { this.s.flash(res, 'error', 'Choose at least one photo.'); return res.redirect(302, `${BASE}/gallery/upload/`); }
    const projectId = /^\d+$/.test(String(req.body?.project_id ?? '')) ? Number(req.body.project_id) : null;
    let categoryId = /^\d+$/.test(String(req.body?.event_category_id ?? '')) ? Number(req.body.event_category_id) : null;
    const project = projectId ? await this.prisma.project.findUnique({ where: { id: projectId } }) : null;
    if (project && !categoryId) categoryId = project.event_category_id;
    const featured = req.body?.is_featured === 'on';
    let added = 0; const failed: string[] = [];
    for (const f of files) {
      try {
        const saved = await saveImage(f.buffer, 'gallery/{ym}');
        await this.prisma.galleryImage.create({ data: { image: saved.rel, width: saved.width, height: saved.height, project_id: project?.id ?? null, event_category_id: categoryId, alt_text: '', caption: '', is_featured: featured, is_published: true, ordering: 0 } });
        this.queue.enqueue(saved.rel, 'GalleryImage.image');
        added += 1;
      } catch (e: any) { failed.push(`${f.originalname}: ${e instanceof UploadError ? e.message : 'could not be saved'}`); }
    }
    await this.s.refresh();
    if (failed.length) this.s.flash(res, added ? 'info' : 'error', `${added} photos added. Not added: ${failed.join(' | ')}`);
    else this.s.flash(res, 'success', `${added} photos added. Their web sizes are being prepared. Next, add a short description to each photo (helps Google).`);
    return res.redirect(302, `${BASE}/gallery/`);
  }

  // ------------------------------------------------------- generic CRUD
  private resource(key: string): Resource {
    const r = resourceByKey(key);
    if (!r) throw new NotFoundException();
    return r;
  }

  private async applyFiles(parsed: { uploads: { field: string; file: UploadedFile }[]; removals: string[] }, data: Record<string, any>, existing: any, images: Record<string, { folder: string; spec: string; maxSide?: number }>, fields: Field[]) {
    for (const { field, file } of parsed.uploads) {
      const f = fields.find((x) => x.name === field);
      if (f?.type === 'video') { data[field] = saveVideo(file, images[field]?.folder ?? 'site'); if (existing?.[field]) deleteMedia(existing[field]); continue; }
      const cfg = images[field] ?? { folder: 'misc', spec: '' };
      const saved = await saveImage(file.buffer, cfg.folder, cfg.maxSide);
      data[field] = saved.rel;
      if (field === 'image') { data.width = saved.width; data.height = saved.height; }
      if (existing?.[field]) deleteMedia(existing[field]);
      this.queue.enqueue(saved.rel, cfg.spec);
    }
    for (const field of parsed.removals) { if (existing?.[field]) deleteMedia(existing[field]); data[field] = ''; }
  }

  private async uploadFailed(req: Request, res: Response, e: any, key: string, fields: Field[], fieldsets: any[], images: any, existing: any, title: string) {
    const msg = e instanceof UploadError ? e.message : 'The file could not be saved.';
    const errs: Record<string, string> = {};
    const fileField = fields.find((f) => (f.type === 'image' || f.type === 'video') && filesOf(req).some((x) => x.fieldname === f.name && x.size > 0));
    errs[fileField?.name ?? fields[0].name] = msg;
    const values = { ...req.body, ...Object.fromEntries(fields.filter((f) => f.type === 'image' || f.type === 'video').map((f) => [`__current_${f.name}`, existing?.[f.name]])) };
    return this.s.page(req, res, 'form.html', { active: key, title, fieldsets: buildFieldsets(fields, fieldsets, values, errs, await fkOptions(this.prisma, fields), 'post'), action: req.originalUrl, back: `${BASE}/${key}/`, has_errors: true });
  }

  private columnCell(r: Resource, col: Column, row: any) {
    const v = col.field ? row[col.field] : undefined;
    switch (col.kind) {
      case 'title': return { kind: 'title', text: r.titleOf(row), href: `${BASE}/${r.key}/${row.id}/` };
      case 'bool': return { kind: 'bool', value: Boolean(v), field: col.field };
      case 'image': { const name = row[col.image!]; return { kind: 'image', url: name ? mediaUrl(name) : '' }; }
      case 'rel': { const rel = row[col.rel!]; return { kind: 'text', text: rel ? rel[col.relField!] : '-' }; }
      case 'date': return { kind: 'text', text: v ? formatDate(col.field === 'event_date' ? new DateOnly(v) : v, 'j M Y') : '-' };
      case 'number': return { kind: 'text', text: v === null || v === undefined || v === '' ? '-' : String(v) };
      case 'order': return { kind: 'order', value: v ?? 0 };
      default: return { kind: 'text', text: truncateChars(String(v ?? ''), 70) };
    }
  }

  @Get(':resource/')
  async list(@Param('resource') key: string, @Req() req: Request, @Res() res: Response) {
    const r = this.resource(key);
    const q = req.query as Record<string, string>;
    const where: any = {};
    for (const f of r.filters) {
      const v = q[f.name];
      if (!v) continue;
      if (f.kind === 'bool' && (v === '1' || v === '0')) where[f.name] = v === '1';
      if (f.kind === 'fk' && /^\d+$/.test(v)) where[f.name] = Number(v);
    }
    const term = String(q.q ?? '').trim();
    if (term) where.OR = r.search.map((f) => ({ [f]: { contains: term } }));
    const delegate = (this.prisma as any)[r.model];
    const total = await delegate.count({ where });
    const info = pageInfo(q.page, total, PER_PAGE);
    const rows = await delegate.findMany({ where, include: r.include, orderBy: r.orderBy, skip: info.skip, take: info.take });
    const filters: any[] = [];
    for (const f of r.filters) {
      let options: [string, string][] = f.kind === 'bool' ? [['1', 'Yes'], ['0', 'No']] : f.options ?? [];
      if (f.kind === 'fk') { const o = await (this.prisma as any)[f.fk!.model].findMany({ orderBy: [{ [f.fk!.label]: 'asc' }], select: { id: true, [f.fk!.label]: true } }); options = o.map((x: any) => [String(x.id), String(x[f.fk!.label])]); }
      filters.push({ name: f.name, label: f.label, options, value: q[f.name] ?? '' });
    }
    const qs = new URLSearchParams(Object.entries(q).filter(([k, v]) => k !== 'page' && typeof v === 'string' && v) as [string, string][]).toString();
    return this.s.page(req, res, 'list.html', {
      active: r.key, r, filters, q: term, total, page: info, qs, has_order: r.columns.some((c) => c.kind === 'order'),
      columns: r.columns, rows: rows.map((row: any) => ({ id: row.id, cells: r.columns.map((c) => this.columnCell(r, c, row)), view: r.viewUrl ? r.viewUrl(row) : null, title: r.titleOf(row) })),
      extra_actions: r.key === 'gallery' ? [{ label: 'Upload many photos', href: `${BASE}/gallery/upload/` }] : [],
    });
  }

  @Get(':resource/new/')
  async newForm(@Param('resource') key: string, @Req() req: Request, @Res() res: Response) {
    const r = this.resource(key);
    const values: Record<string, any> = { ...r.defaults };
    if (r.key === 'posts') values.published_at = new Date();
    for (const f of r.fields) { if (f.type === 'fk' && /^\d+$/.test(String(req.query[f.name] ?? ''))) values[f.name] = Number(req.query[f.name]); }
    const fieldsets = buildFieldsets(r.fields, r.fieldsets, values, {}, await fkOptions(this.prisma, r.fields), 'row');
    return this.s.page(req, res, 'form.html', { active: r.key, title: `Add ${r.label.toLowerCase()}`, blurb: r.blurb, fieldsets, action: `${BASE}/${r.key}/new/`, back: `${BASE}/${r.key}/`, isNew: true });
  }

  /** Create or update one record from the posted form. */
  private async save(r: Resource, req: Request, res: Response, existing: any | null) {
    const names = r.fieldsets.flatMap((f) => f.fields);
    const parsed = await parseForm(r.fields, names, { body: req.body, files: filesOf(req) }, this.prisma, !existing, existing ?? undefined);
    const data = parsed.data;
    // page address
    if (r.slugSource && !parsed.errors.slug) {
      const wanted = String(data.slug ?? '');
      if (wanted) {
        const clash = await (this.prisma as any)[r.model].findFirst({ where: { slug: wanted, ...(existing ? { NOT: { id: existing.id } } : {}) }, select: { id: true } });
        if (clash) parsed.errors.slug = 'Another page already uses this address. Choose a different one.';
        else if (r.reservedSlugs && RESERVED_SLUGS.has(wanted)) parsed.errors.slug = `"${wanted}" is used by another page on the site. Choose a different address.`;
      } else {
        const source = String((data as any)[r.slugSource] ?? existing?.[r.slugSource] ?? '');
        data.slug = await uniqueSlug((this.prisma as any)[r.model], source, { fallback: r.model.toLowerCase(), reserved: r.reservedSlugs, excludeId: existing?.id });
      }
    }
    const current = existing ? Object.fromEntries(r.fields.filter((f) => f.type === 'image' || f.type === 'video').map((f) => [`__current_${f.name}`, existing[f.name]])) : {};
    const redisplay = async (errors: Record<string, string>) => this.s.page(req, res, 'form.html', {
      active: r.key, title: existing ? `Change ${r.label.toLowerCase()}` : `Add ${r.label.toLowerCase()}`, blurb: r.blurb, has_errors: true, isNew: !existing,
      fieldsets: buildFieldsets(r.fields, r.fieldsets, { ...req.body, ...current }, errors, await fkOptions(this.prisma, r.fields), 'post'),
      action: existing ? `${BASE}/${r.key}/${existing.id}/` : `${BASE}/${r.key}/new/`, back: `${BASE}/${r.key}/`, record: existing, view: existing && r.viewUrl ? r.viewUrl(existing) : null,
    });
    if (Object.keys(parsed.errors).length) return redisplay(parsed.errors);
    try { await this.applyFiles(parsed, data, existing, r.images, r.fields); }
    catch (e: any) { return redisplay({ [r.fields.find((f) => (f.type === 'image' || f.type === 'video'))?.name ?? names[0]]: e instanceof UploadError ? e.message : 'The file could not be saved.' }); }
    const saved = existing
      ? await (this.prisma as any)[r.model].update({ where: { id: existing.id }, data })
      : await (this.prisma as any)[r.model].create({ data: { ...r.defaults, ...data } });
    await this.s.refresh();
    this.s.flash(res, 'success', `${r.label} "${truncateChars(r.titleOf(saved), 60)}" saved.`);
    return res.redirect(302, req.body?._continue !== undefined ? `${BASE}/${r.key}/${saved.id}/` : `${BASE}/${r.key}/`);
  }

  @Post(':resource/new/')
  createRecord(@Param('resource') key: string, @Req() req: Request, @Res() res: Response) { return this.save(this.resource(key), req, res, null); }

  @Post(':resource/order/')
  async saveOrder(@Param('resource') key: string, @Req() req: Request, @Res() res: Response) {
    const r = this.resource(key);
    const delegate = (this.prisma as any)[r.model];
    let changed = 0;
    for (const [name, value] of Object.entries(req.body ?? {})) {
      const m = /^ordering_(\d+)$/.exec(name);
      if (!m || !/^\d{1,6}$/.test(String(value))) continue;
      await delegate.updateMany({ where: { id: Number(m[1]), NOT: { ordering: Number(value) } }, data: { ordering: Number(value) } }).then((x: any) => { changed += x.count; });
    }
    if (changed) { await this.s.refresh(); this.s.flash(res, 'success', 'Order saved.'); }
    return res.redirect(302, this.s.back(req, `${BASE}/${r.key}/`));
  }

  @Post(':resource/bulk/')
  async bulk(@Param('resource') key: string, @Req() req: Request, @Res() res: Response) {
    const r = this.resource(key);
    const picked = ids(req.body?.ids); const action = String(req.body?.action ?? '');
    const delegate = (this.prisma as any)[r.model];
    if (!picked.length) this.s.flash(res, 'info', 'Tick at least one item first.');
    else if (action === 'publish' || action === 'unpublish') {
      await delegate.updateMany({ where: { id: { in: picked } }, data: { is_published: action === 'publish' } });
      await this.s.refresh(); this.s.flash(res, 'success', `${picked.length} item(s) ${action === 'publish' ? 'shown on' : 'hidden from'} the website.`);
    } else if (action === 'delete') {
      const rows = await delegate.findMany({ where: { id: { in: picked } } });
      try {
        await delegate.deleteMany({ where: { id: { in: picked } } });
        for (const row of rows) for (const f of r.fields.filter((x) => x.type === 'image' || x.type === 'video')) deleteMedia(row[f.name]);
        await this.s.refresh(); this.s.flash(res, 'success', `${picked.length} item(s) deleted.`);
      } catch { this.s.flash(res, 'error', 'Some items are still in use, so nothing was deleted.'); }
    }
    return res.redirect(302, this.s.back(req, `${BASE}/${r.key}/`));
  }

  @Get(':resource/:id/')
  async editForm(@Param('resource') key: string, @Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const r = this.resource(key);
    const row = await (this.prisma as any)[r.model].findUnique({ where: { id: parseInt(id, 10) || 0 } });
    if (!row) throw new NotFoundException();
    const fieldsets = buildFieldsets(r.fields, r.fieldsets, row, {}, await fkOptions(this.prisma, r.fields), 'row');
    return this.s.page(req, res, 'form.html', { active: r.key, title: `Change ${r.label.toLowerCase()}`, subtitle: r.titleOf(row), blurb: r.blurb, fieldsets, action: `${BASE}/${r.key}/${row.id}/`, back: `${BASE}/${r.key}/`, record: row, view: r.viewUrl ? r.viewUrl(row) : null });
  }

  @Post(':resource/:id/')
  async updateRecord(@Param('resource') key: string, @Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const r = this.resource(key);
    const row = await (this.prisma as any)[r.model].findUnique({ where: { id: parseInt(id, 10) || 0 } });
    if (!row) throw new NotFoundException();
    return this.save(r, req, res, row);
  }

  @Get(':resource/:id/delete/')
  async confirmDelete(@Param('resource') key: string, @Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const r = this.resource(key);
    const row = await (this.prisma as any)[r.model].findUnique({ where: { id: parseInt(id, 10) || 0 } });
    if (!row) throw new NotFoundException();
    let usage = '';
    if (r.key === 'categories') {
      const [a, b, c] = await Promise.all([this.prisma.service.count({ where: { category_id: row.id } }), this.prisma.project.count({ where: { event_category_id: row.id } }), this.prisma.galleryImage.count({ where: { event_category_id: row.id } })]);
      if (a || b) usage = `This event type is used by ${a} service(s) and ${b} project(s), so it cannot be deleted until they are moved to another type. ${c ? c + ' photo(s) would simply become uncategorised.' : ''}`;
    }
    if (r.key === 'projects') { const n = await this.prisma.galleryImage.count({ where: { project_id: row.id } }); if (n) usage = `${n} photo(s) belong to this project and will be deleted with it.`; }
    return this.s.page(req, res, 'confirm_delete.html', { active: r.key, r, row_title: r.titleOf(row), id: row.id, usage, blocked: usage.includes('cannot be deleted') });
  }

  @Post(':resource/:id/delete/')
  async deleteRecord(@Param('resource') key: string, @Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    const r = this.resource(key);
    const rowId = parseInt(id, 10) || 0;
    const row = await (this.prisma as any)[r.model].findUnique({ where: { id: rowId } });
    if (!row) throw new NotFoundException();
    try {
      let owned: string[] = [];
      if (r.key === 'projects') { const photos = await this.prisma.galleryImage.findMany({ where: { project_id: rowId }, select: { image: true } }); owned = photos.map((p) => p.image); }
      await (this.prisma as any)[r.model].delete({ where: { id: rowId } });
      for (const f of r.fields.filter((x) => x.type === 'image' || x.type === 'video')) deleteMedia(row[f.name]);
      owned.forEach(deleteMedia);
      await this.s.refresh();
      this.s.flash(res, 'success', `${r.label} deleted.`);
    } catch (e: any) {
      this.s.flash(res, 'error', /foreign key|constraint|P2003|P2014/i.test(String(e?.message) + String(e?.code)) ? `This ${r.label.toLowerCase()} is still in use, so it cannot be deleted. Move or delete the items that use it first.` : 'Could not delete this item.');
    }
    return res.redirect(302, `${BASE}/${r.key}/`);
  }

  @Post(':resource/:id/toggle/:field/')
  async toggle(@Param('resource') key: string, @Param('id') id: string, @Param('field') field: string, @Req() req: Request, @Res() res: Response) {
    const r = this.resource(key);
    if (!r.fields.some((f) => f.name === field && f.type === 'bool')) throw new NotFoundException();
    const delegate = (this.prisma as any)[r.model];
    const row = await delegate.findUnique({ where: { id: parseInt(id, 10) || 0 } });
    if (!row) throw new NotFoundException();
    await delegate.update({ where: { id: row.id }, data: { [field]: !row[field] } });
    await this.s.refresh();
    return res.redirect(302, this.s.back(req, `${BASE}/${r.key}/`));
  }
}
