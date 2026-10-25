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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const images_1 = require("../common/images");
const http_1 = require("../common/http");
const storage_1 = require("../common/storage");
const slug_1 = require("../common/slug");
const utils_1 = require("../common/utils");
const navigation_1 = require("../common/navigation");
const prisma_service_1 = require("../prisma/prisma.service");
const seed_service_1 = require("../seed/seed.service");
const enquiry_form_1 = require("../leads/enquiry-form");
const notify_service_1 = require("../leads/notify.service");
const admin_support_1 = require("./admin.support");
const auth_1 = require("./auth");
const forms_1 = require("./forms");
const image_queue_service_1 = require("./image-queue.service");
const resources_1 = require("./resources");
const PER_PAGE = 25;
const filesOf = (req) => (req.files ?? []);
const adminOf = (req) => req.admin;
const ids = (v) => (Array.isArray(v) ? v : v ? [v] : []).map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n));
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
let AdminController = class AdminController {
    prisma;
    s;
    queue;
    seed;
    notify;
    constructor(prisma, s, queue, seed, notify) {
        this.prisma = prisma;
        this.s = s;
        this.queue = queue;
        this.seed = seed;
        this.notify = notify;
    }
    async dashboard(req, res) {
        const p = this.prisma;
        const week = new Date(Date.now() - 7 * 86400000);
        const [leadsNew, leadsWeek, leadsAll, services, projects, photos, videos, posts, testimonials, faqs, site, latest] = await Promise.all([
            p.lead.count({ where: { status: 'new' } }), p.lead.count({ where: { created_at: { gte: week } } }), p.lead.count(),
            p.service.count(), p.project.count(), p.galleryImage.count(), p.video.count(), p.blogPost.count(), p.testimonial.count(), p.faq.count(),
            p.siteSettings.findUnique({ where: { id: 1 } }), p.lead.findMany({ orderBy: { created_at: 'desc' }, take: 6, include: { event_type: true } }),
        ]);
        const todo = [];
        const set = `${admin_support_1.BASE}/site-settings/`;
        if (!site?.phone)
            todo.push({ text: 'Add your phone and WhatsApp number', href: set });
        if (!site?.email)
            todo.push({ text: 'Add your email address (enquiries are sent here)', href: set });
        if (!site?.address_line)
            todo.push({ text: 'Add your address and map', href: set });
        if (!site?.hero_poster)
            todo.push({ text: 'Upload the home page hero photo', href: set });
        if (!site?.google_rating)
            todo.push({ text: 'Add your Google rating and review link', href: set });
        if (!photos)
            todo.push({ text: 'Upload photos of your work', href: `${admin_support_1.BASE}/gallery/upload/` });
        if (!videos)
            todo.push({ text: 'Add a YouTube video', href: `${admin_support_1.BASE}/videos/new/` });
        if (!testimonials)
            todo.push({ text: 'Add a client testimonial', href: `${admin_support_1.BASE}/testimonials/new/` });
        return this.s.page(req, res, 'dashboard.html', {
            active: 'dashboard', stats: { leadsNew, leadsWeek, leadsAll, services, projects, photos, videos, posts, testimonials, faqs },
            latest: latest.map((l) => ({ ...l, when: (0, utils_1.formatDate)(l.created_at, 'j M Y'), event: l.event_type?.name ?? '' })),
            todo, can_seed: services === 0, images_pending: this.queue.pending,
        });
    }
    async runSeed(req, res) {
        const r = await this.seed.run();
        this.s.flash(res, 'success', `Starter content added: ${r.services} services, ${r.faqs} FAQs, ${r.articles} articles, ${r.categories} event types. Edit them to match your business.`);
        return res.redirect(302, `${admin_support_1.BASE}/`);
    }
    passwordForm(req, res) { return this.s.page(req, res, 'password.html', { active: 'account', errors: {} }); }
    async changePassword(req, res) {
        const user = await this.prisma.adminUser.findUnique({ where: { id: adminOf(req).id } });
        const b = req.body ?? {};
        const errors = {};
        if (!user || !(await (0, auth_1.checkPassword)(String(b.current ?? ''), user.password_hash)))
            errors.current = 'Your current password is not correct.';
        const problem = (0, auth_1.passwordProblem)(String(b.password ?? ''), user?.email);
        if (problem)
            errors.password = problem;
        else if (b.password !== b.password2)
            errors.password2 = 'The two passwords do not match.';
        if (Object.keys(errors).length)
            return this.s.page(req, res, 'password.html', { active: 'account', errors });
        await this.prisma.adminUser.update({ where: { id: user.id }, data: { password_hash: await (0, auth_1.hashPassword)(String(b.password)) } });
        this.s.flash(res, 'success', 'Password changed. Please sign in again.');
        res.clearCookie('admin_session', { path: '/' });
        return res.redirect(302, `${admin_support_1.BASE}/login/`);
    }
    async uploadEditorImage(req, res) {
        const file = filesOf(req).find((f) => f.size > 0);
        if (!file)
            return res.status(400).json({ error: 'No file received.' });
        try {
            const saved = await (0, storage_1.saveImage)(file.buffer, 'editor/{ym}', 1600);
            return res.json({ url: (0, images_1.mediaUrl)(saved.rel) });
        }
        catch (e) {
            return res.status(400).json({ error: e instanceof storage_1.UploadError ? e.message : 'Upload failed.' });
        }
    }
    async settingsForm(req, res) {
        const row = await this.prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, service_areas: '', about_story: '' } });
        const fieldsets = (0, forms_1.buildFieldsets)(resources_1.SETTINGS_FIELDS, resources_1.SETTINGS_FIELDSETS, row, {}, {}, 'row');
        return this.s.page(req, res, 'form.html', { active: 'site-settings', title: 'Site settings', blurb: 'Your business details. Changes appear on the website straight away.', fieldsets, action: `${admin_support_1.BASE}/site-settings/`, singleton: true, back: `${admin_support_1.BASE}/` });
    }
    async settingsSave(req, res) {
        const existing = await this.prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, service_areas: '', about_story: '' } });
        const names = resources_1.SETTINGS_FIELDSETS.flatMap((f) => f.fields);
        const parsed = await (0, forms_1.parseForm)(resources_1.SETTINGS_FIELDS, names, { body: req.body, files: filesOf(req) }, this.prisma, false, existing);
        if (Object.keys(parsed.errors).length) {
            const fieldsets = (0, forms_1.buildFieldsets)(resources_1.SETTINGS_FIELDS, resources_1.SETTINGS_FIELDSETS, { ...req.body, ...Object.fromEntries(resources_1.SETTINGS_FIELDS.filter((f) => f.type === 'image' || f.type === 'video').map((f) => [`__current_${f.name}`, existing[f.name]])) }, parsed.errors, {}, 'post');
            return this.s.page(req, res, 'form.html', { active: 'site-settings', title: 'Site settings', fieldsets, action: `${admin_support_1.BASE}/site-settings/`, singleton: true, back: `${admin_support_1.BASE}/`, has_errors: true });
        }
        const data = parsed.data;
        try {
            await this.applyFiles(parsed, data, existing, resources_1.SETTINGS_IMAGES, resources_1.SETTINGS_FIELDS);
        }
        catch (e) {
            return this.uploadFailed(req, res, e, 'site-settings', resources_1.SETTINGS_FIELDS, resources_1.SETTINGS_FIELDSETS, resources_1.SETTINGS_IMAGES, existing, 'Site settings');
        }
        await this.prisma.siteSettings.update({ where: { id: 1 }, data });
        await this.s.refresh();
        this.s.flash(res, 'success', 'Site settings saved.');
        return res.redirect(302, `${admin_support_1.BASE}/site-settings/`);
    }
    leadWhere(q) {
        const where = {};
        if (q.status && enquiry_form_1.STATUSES.some(([k]) => k === q.status))
            where.status = q.status;
        if (/^\d+$/.test(String(q.event_type_id ?? '')))
            where.event_type_id = Number(q.event_type_id);
        const term = String(q.q ?? '').trim();
        if (term)
            where.OR = ['name', 'phone', 'city'].map((f) => ({ [f]: { contains: term } }));
        return where;
    }
    async leads(req, res) {
        const where = this.leadWhere(req.query);
        const total = await this.prisma.lead.count({ where });
        const info = (0, http_1.pageInfo)(req.query.page, total, 30);
        const rows = await this.prisma.lead.findMany({ where, include: { event_type: true, service: true }, orderBy: { created_at: 'desc' }, skip: info.skip, take: info.take });
        const types = await this.prisma.eventCategory.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });
        const qs = new URLSearchParams(Object.entries(req.query).filter(([k, v]) => k !== 'page' && typeof v === 'string' && v)).toString();
        return this.s.page(req, res, 'leads.html', {
            active: 'leads', total, page: info, q: req.query, qs, statuses: enquiry_form_1.STATUSES, types,
            leads: rows.map((l) => ({ ...l, when: (0, utils_1.formatDate)(l.created_at, 'j M Y'), time: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(l.created_at), event: l.event_type?.name ?? '', budget_label: (0, enquiry_form_1.budgetLabel)(l.budget), event_date_text: l.event_date ? (0, utils_1.formatDate)(new utils_1.DateOnly(l.event_date), 'j M Y') : '' })),
        });
    }
    async leadsCsv(req, res) {
        const rows = await this.prisma.lead.findMany({ where: this.leadWhere(req.query), include: { event_type: true, service: true }, orderBy: { created_at: 'desc' }, take: 20000 });
        const head = ['Received (IST)', 'Name', 'Phone', 'Event type', 'Event date', 'City', 'Budget', 'Service page', 'Status', 'Notes', 'Source page', 'UTM source', 'UTM medium', 'UTM campaign'];
        const lines = [head.map(csvCell).join(',')];
        for (const l of rows) {
            lines.push([(0, utils_1.formatDate)(l.created_at, 'Y-m-d'), l.name, l.phone, l.event_type?.name ?? '', l.event_date ? new utils_1.DateOnly(l.event_date).toString() : '', l.city, (0, enquiry_form_1.budgetLabel)(l.budget), l.service?.title ?? '', enquiry_form_1.STATUSES.find(([k]) => k === l.status)?.[1] ?? l.status, l.notes, l.source_url, l.utm_source, l.utm_medium, l.utm_campaign]
                .map((v) => csvCell(/^[=+\-@]/.test(String(v ?? '')) ? `'${v}` : v)).join(','));
        }
        res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="enquiries-${new Date().toISOString().slice(0, 10)}.csv"` });
        return res.send('\ufeff' + lines.join('\r\n'));
    }
    async leadsBulk(req, res) {
        const picked = ids(req.body?.ids);
        const action = String(req.body?.action ?? '');
        if (!picked.length)
            this.s.flash(res, 'info', 'Tick at least one enquiry first.');
        else if (action.startsWith('status:') && enquiry_form_1.STATUSES.some(([k]) => `status:${k}` === action)) {
            await this.prisma.lead.updateMany({ where: { id: { in: picked } }, data: { status: action.slice(7) } });
            this.s.flash(res, 'success', `${picked.length} enquiries updated.`);
        }
        else if (action === 'delete') {
            await this.prisma.lead.deleteMany({ where: { id: { in: picked } } });
            this.s.flash(res, 'success', `${picked.length} enquiries deleted.`);
        }
        return res.redirect(302, this.s.back(req, `${admin_support_1.BASE}/leads/`));
    }
    async leadDetail(id, req, res) {
        const lead = await this.prisma.lead.findUnique({ where: { id: parseInt(id, 10) || 0 }, include: { event_type: true, service: true } });
        if (!lead)
            throw new common_1.NotFoundException();
        return this.s.page(req, res, 'lead.html', {
            active: 'leads', lead: { ...lead, received: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(lead.created_at), budget_label: (0, enquiry_form_1.budgetLabel)(lead.budget), event_date_text: lead.event_date ? (0, utils_1.formatDate)(new utils_1.DateOnly(lead.event_date), 'j F Y') : '' },
            statuses: enquiry_form_1.STATUSES, whatsapp: `https://wa.me/${lead.phone.replace(/\D/g, '')}`, whatsapp_configured: this.notify.whatsappConfigured(),
        });
    }
    async leadSave(id, req, res) {
        const leadId = parseInt(id, 10) || 0;
        const status = String(req.body?.status ?? '');
        if (!enquiry_form_1.STATUSES.some(([k]) => k === status))
            throw new common_1.NotFoundException();
        await this.prisma.lead.update({ where: { id: leadId }, data: { status, notes: String(req.body?.notes ?? '').slice(0, 5000) } });
        this.s.flash(res, 'success', 'Enquiry updated.');
        return res.redirect(302, `${admin_support_1.BASE}/leads/${leadId}/`);
    }
    async leadResend(id, req, res) {
        const leadId = parseInt(id, 10) || 0;
        await this.prisma.lead.update({ where: { id: leadId }, data: { email_sent: false, whatsapp_sent: false } });
        await this.notify.notifyLead(leadId);
        const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
        if (lead?.notify_error)
            this.s.flash(res, 'error', `Could not send: ${(0, utils_1.truncateChars)(lead.notify_error, 220)}`);
        else
            this.s.flash(res, lead?.email_sent || lead?.whatsapp_sent ? 'success' : 'info', lead?.email_sent || lead?.whatsapp_sent ? 'Notification sent again.' : 'Nothing to send: add a notification email in Site settings first.');
        return res.redirect(302, `${admin_support_1.BASE}/leads/${leadId}/`);
    }
    async leadDelete(id, req, res) {
        await this.prisma.lead.delete({ where: { id: parseInt(id, 10) || 0 } }).catch(() => undefined);
        this.s.flash(res, 'success', 'Enquiry deleted.');
        return res.redirect(302, `${admin_support_1.BASE}/leads/`);
    }
    async users(req, res) {
        if (!adminOf(req).is_superuser)
            throw new common_1.NotFoundException();
        const rows = await this.prisma.adminUser.findMany({ orderBy: { created_at: 'asc' } });
        return this.s.page(req, res, 'users.html', { active: 'users', users: rows.map((u) => ({ ...u, last: u.last_login_at ? (0, utils_1.formatDate)(u.last_login_at, 'j M Y') : 'Never' })) });
    }
    newUser(req, res) {
        if (!adminOf(req).is_superuser)
            throw new common_1.NotFoundException();
        return this.s.page(req, res, 'user_form.html', { active: 'users', values: { is_active: true }, errors: {}, isNew: true });
    }
    async createUser(req, res) {
        if (!adminOf(req).is_superuser)
            throw new common_1.NotFoundException();
        const b = req.body ?? {};
        const values = { name: String(b.name ?? '').trim(), email: String(b.email ?? '').trim().toLowerCase(), is_superuser: b.is_superuser === 'on', is_active: true };
        const errors = {};
        if (!values.name)
            errors.name = 'This field is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
            errors.email = 'Enter a valid email address.';
        else if (await this.prisma.adminUser.findUnique({ where: { email: values.email } }))
            errors.email = 'An account with this email already exists.';
        const problem = (0, auth_1.passwordProblem)(String(b.password ?? ''), values.email);
        if (problem)
            errors.password = problem;
        if (Object.keys(errors).length)
            return this.s.page(req, res, 'user_form.html', { active: 'users', values, errors, isNew: true });
        await this.prisma.adminUser.create({ data: { ...values, password_hash: await (0, auth_1.hashPassword)(String(b.password)) } });
        this.s.flash(res, 'success', 'Admin account created.');
        return res.redirect(302, `${admin_support_1.BASE}/users/`);
    }
    async editUser(id, req, res) {
        if (!adminOf(req).is_superuser)
            throw new common_1.NotFoundException();
        const user = await this.prisma.adminUser.findUnique({ where: { id: parseInt(id, 10) || 0 } });
        if (!user)
            throw new common_1.NotFoundException();
        return this.s.page(req, res, 'user_form.html', { active: 'users', values: user, errors: {}, isNew: false, user_id: user.id });
    }
    async updateUser(id, req, res) {
        if (!adminOf(req).is_superuser)
            throw new common_1.NotFoundException();
        const userId = parseInt(id, 10) || 0;
        const user = await this.prisma.adminUser.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException();
        const b = req.body ?? {};
        const values = { name: String(b.name ?? '').trim(), email: String(b.email ?? '').trim().toLowerCase(), is_superuser: b.is_superuser === 'on', is_active: b.is_active === 'on' };
        const errors = {};
        if (!values.name)
            errors.name = 'This field is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
            errors.email = 'Enter a valid email address.';
        else {
            const other = await this.prisma.adminUser.findUnique({ where: { email: values.email } });
            if (other && other.id !== userId)
                errors.email = 'An account with this email already exists.';
        }
        const data = { ...values };
        if (String(b.password ?? '')) {
            const pr = (0, auth_1.passwordProblem)(String(b.password), values.email);
            if (pr)
                errors.password = pr;
            else
                data.password_hash = await (0, auth_1.hashPassword)(String(b.password));
        }
        if (userId === adminOf(req).id && (!values.is_active || !values.is_superuser))
            errors.is_active = 'You cannot remove your own access.';
        if (Object.keys(errors).length)
            return this.s.page(req, res, 'user_form.html', { active: 'users', values: { ...user, ...values }, errors, isNew: false, user_id: userId });
        await this.prisma.adminUser.update({ where: { id: userId }, data });
        this.s.flash(res, 'success', 'Admin account saved.');
        return res.redirect(302, `${admin_support_1.BASE}/users/`);
    }
    async bulkForm(req, res) {
        const [projects, types] = await Promise.all([
            this.prisma.project.findMany({ orderBy: { title: 'asc' }, select: { id: true, title: true } }), this.prisma.eventCategory.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
        ]);
        return this.s.page(req, res, 'bulk_upload.html', { active: 'gallery', projects, types, project_id: String(req.query.project_id ?? ''), event_category_id: String(req.query.event_category_id ?? '') });
    }
    async bulkUpload(req, res) {
        const files = filesOf(req).filter((f) => f.fieldname === 'photos' && f.size > 0).slice(0, 40);
        if (!files.length) {
            this.s.flash(res, 'error', 'Choose at least one photo.');
            return res.redirect(302, `${admin_support_1.BASE}/gallery/upload/`);
        }
        const projectId = /^\d+$/.test(String(req.body?.project_id ?? '')) ? Number(req.body.project_id) : null;
        let categoryId = /^\d+$/.test(String(req.body?.event_category_id ?? '')) ? Number(req.body.event_category_id) : null;
        const project = projectId ? await this.prisma.project.findUnique({ where: { id: projectId } }) : null;
        if (project && !categoryId)
            categoryId = project.event_category_id;
        const featured = req.body?.is_featured === 'on';
        let added = 0;
        const failed = [];
        for (const f of files) {
            try {
                const saved = await (0, storage_1.saveImage)(f.buffer, 'gallery/{ym}');
                await this.prisma.galleryImage.create({ data: { image: saved.rel, width: saved.width, height: saved.height, project_id: project?.id ?? null, event_category_id: categoryId, alt_text: '', caption: '', is_featured: featured, is_published: true, ordering: 0 } });
                this.queue.enqueue(saved.rel, 'GalleryImage.image');
                added += 1;
            }
            catch (e) {
                failed.push(`${f.originalname}: ${e instanceof storage_1.UploadError ? e.message : 'could not be saved'}`);
            }
        }
        await this.s.refresh();
        if (failed.length)
            this.s.flash(res, added ? 'info' : 'error', `${added} photos added. Not added: ${failed.join(' | ')}`);
        else
            this.s.flash(res, 'success', `${added} photos added. Their web sizes are being prepared. Next, add a short description to each photo (helps Google).`);
        return res.redirect(302, `${admin_support_1.BASE}/gallery/`);
    }
    resource(key) {
        const r = (0, resources_1.resourceByKey)(key);
        if (!r)
            throw new common_1.NotFoundException();
        return r;
    }
    async applyFiles(parsed, data, existing, images, fields) {
        for (const { field, file } of parsed.uploads) {
            const f = fields.find((x) => x.name === field);
            if (f?.type === 'video') {
                data[field] = (0, storage_1.saveVideo)(file, images[field]?.folder ?? 'site');
                if (existing?.[field])
                    (0, images_1.deleteMedia)(existing[field]);
                continue;
            }
            const cfg = images[field] ?? { folder: 'misc', spec: '' };
            const saved = await (0, storage_1.saveImage)(file.buffer, cfg.folder, cfg.maxSide);
            data[field] = saved.rel;
            if (field === 'image') {
                data.width = saved.width;
                data.height = saved.height;
            }
            if (existing?.[field])
                (0, images_1.deleteMedia)(existing[field]);
            this.queue.enqueue(saved.rel, cfg.spec);
        }
        for (const field of parsed.removals) {
            if (existing?.[field])
                (0, images_1.deleteMedia)(existing[field]);
            data[field] = '';
        }
    }
    async uploadFailed(req, res, e, key, fields, fieldsets, images, existing, title) {
        const msg = e instanceof storage_1.UploadError ? e.message : 'The file could not be saved.';
        const errs = {};
        const fileField = fields.find((f) => (f.type === 'image' || f.type === 'video') && filesOf(req).some((x) => x.fieldname === f.name && x.size > 0));
        errs[fileField?.name ?? fields[0].name] = msg;
        const values = { ...req.body, ...Object.fromEntries(fields.filter((f) => f.type === 'image' || f.type === 'video').map((f) => [`__current_${f.name}`, existing?.[f.name]])) };
        return this.s.page(req, res, 'form.html', { active: key, title, fieldsets: (0, forms_1.buildFieldsets)(fields, fieldsets, values, errs, await (0, forms_1.fkOptions)(this.prisma, fields), 'post'), action: req.originalUrl, back: `${admin_support_1.BASE}/${key}/`, has_errors: true });
    }
    columnCell(r, col, row) {
        const v = col.field ? row[col.field] : undefined;
        switch (col.kind) {
            case 'title': return { kind: 'title', text: r.titleOf(row), href: `${admin_support_1.BASE}/${r.key}/${row.id}/` };
            case 'bool': return { kind: 'bool', value: Boolean(v), field: col.field };
            case 'image': {
                const name = row[col.image];
                return { kind: 'image', url: name ? (0, images_1.mediaUrl)(name) : '' };
            }
            case 'rel': {
                const rel = row[col.rel];
                return { kind: 'text', text: rel ? rel[col.relField] : '-' };
            }
            case 'date': return { kind: 'text', text: v ? (0, utils_1.formatDate)(col.field === 'event_date' ? new utils_1.DateOnly(v) : v, 'j M Y') : '-' };
            case 'number': return { kind: 'text', text: v === null || v === undefined || v === '' ? '-' : String(v) };
            case 'order': return { kind: 'order', value: v ?? 0 };
            default: return { kind: 'text', text: (0, utils_1.truncateChars)(String(v ?? ''), 70) };
        }
    }
    async list(key, req, res) {
        const r = this.resource(key);
        const q = req.query;
        const where = {};
        for (const f of r.filters) {
            const v = q[f.name];
            if (!v)
                continue;
            if (f.kind === 'bool' && (v === '1' || v === '0'))
                where[f.name] = v === '1';
            if (f.kind === 'fk' && /^\d+$/.test(v))
                where[f.name] = Number(v);
        }
        const term = String(q.q ?? '').trim();
        if (term)
            where.OR = r.search.map((f) => ({ [f]: { contains: term } }));
        const delegate = this.prisma[r.model];
        const total = await delegate.count({ where });
        const info = (0, http_1.pageInfo)(q.page, total, PER_PAGE);
        const rows = await delegate.findMany({ where, include: r.include, orderBy: r.orderBy, skip: info.skip, take: info.take });
        const filters = [];
        for (const f of r.filters) {
            let options = f.kind === 'bool' ? [['1', 'Yes'], ['0', 'No']] : f.options ?? [];
            if (f.kind === 'fk') {
                const o = await this.prisma[f.fk.model].findMany({ orderBy: [{ [f.fk.label]: 'asc' }], select: { id: true, [f.fk.label]: true } });
                options = o.map((x) => [String(x.id), String(x[f.fk.label])]);
            }
            filters.push({ name: f.name, label: f.label, options, value: q[f.name] ?? '' });
        }
        const qs = new URLSearchParams(Object.entries(q).filter(([k, v]) => k !== 'page' && typeof v === 'string' && v)).toString();
        return this.s.page(req, res, 'list.html', {
            active: r.key, r, filters, q: term, total, page: info, qs, has_order: r.columns.some((c) => c.kind === 'order'),
            columns: r.columns, rows: rows.map((row) => ({ id: row.id, cells: r.columns.map((c) => this.columnCell(r, c, row)), view: r.viewUrl ? r.viewUrl(row) : null, title: r.titleOf(row) })),
            extra_actions: r.key === 'gallery' ? [{ label: 'Upload many photos', href: `${admin_support_1.BASE}/gallery/upload/` }] : [],
        });
    }
    async newForm(key, req, res) {
        const r = this.resource(key);
        const values = { ...r.defaults };
        if (r.key === 'posts')
            values.published_at = new Date();
        for (const f of r.fields) {
            if (f.type === 'fk' && /^\d+$/.test(String(req.query[f.name] ?? '')))
                values[f.name] = Number(req.query[f.name]);
        }
        const fieldsets = (0, forms_1.buildFieldsets)(r.fields, r.fieldsets, values, {}, await (0, forms_1.fkOptions)(this.prisma, r.fields), 'row');
        return this.s.page(req, res, 'form.html', { active: r.key, title: `Add ${r.label.toLowerCase()}`, blurb: r.blurb, fieldsets, action: `${admin_support_1.BASE}/${r.key}/new/`, back: `${admin_support_1.BASE}/${r.key}/`, isNew: true });
    }
    async save(r, req, res, existing) {
        const names = r.fieldsets.flatMap((f) => f.fields);
        const parsed = await (0, forms_1.parseForm)(r.fields, names, { body: req.body, files: filesOf(req) }, this.prisma, !existing, existing ?? undefined);
        const data = parsed.data;
        if (r.slugSource && !parsed.errors.slug) {
            const wanted = String(data.slug ?? '');
            if (wanted) {
                const clash = await this.prisma[r.model].findFirst({ where: { slug: wanted, ...(existing ? { NOT: { id: existing.id } } : {}) }, select: { id: true } });
                if (clash)
                    parsed.errors.slug = 'Another page already uses this address. Choose a different one.';
                else if (r.reservedSlugs && navigation_1.RESERVED_SLUGS.has(wanted))
                    parsed.errors.slug = `"${wanted}" is used by another page on the site. Choose a different address.`;
            }
            else {
                const source = String(data[r.slugSource] ?? existing?.[r.slugSource] ?? '');
                data.slug = await (0, slug_1.uniqueSlug)(this.prisma[r.model], source, { fallback: r.model.toLowerCase(), reserved: r.reservedSlugs, excludeId: existing?.id });
            }
        }
        const current = existing ? Object.fromEntries(r.fields.filter((f) => f.type === 'image' || f.type === 'video').map((f) => [`__current_${f.name}`, existing[f.name]])) : {};
        const redisplay = async (errors) => this.s.page(req, res, 'form.html', {
            active: r.key, title: existing ? `Change ${r.label.toLowerCase()}` : `Add ${r.label.toLowerCase()}`, blurb: r.blurb, has_errors: true, isNew: !existing,
            fieldsets: (0, forms_1.buildFieldsets)(r.fields, r.fieldsets, { ...req.body, ...current }, errors, await (0, forms_1.fkOptions)(this.prisma, r.fields), 'post'),
            action: existing ? `${admin_support_1.BASE}/${r.key}/${existing.id}/` : `${admin_support_1.BASE}/${r.key}/new/`, back: `${admin_support_1.BASE}/${r.key}/`, record: existing, view: existing && r.viewUrl ? r.viewUrl(existing) : null,
        });
        if (Object.keys(parsed.errors).length)
            return redisplay(parsed.errors);
        try {
            await this.applyFiles(parsed, data, existing, r.images, r.fields);
        }
        catch (e) {
            return redisplay({ [r.fields.find((f) => (f.type === 'image' || f.type === 'video'))?.name ?? names[0]]: e instanceof storage_1.UploadError ? e.message : 'The file could not be saved.' });
        }
        const saved = existing
            ? await this.prisma[r.model].update({ where: { id: existing.id }, data })
            : await this.prisma[r.model].create({ data: { ...r.defaults, ...data } });
        await this.s.refresh();
        this.s.flash(res, 'success', `${r.label} "${(0, utils_1.truncateChars)(r.titleOf(saved), 60)}" saved.`);
        return res.redirect(302, req.body?._continue !== undefined ? `${admin_support_1.BASE}/${r.key}/${saved.id}/` : `${admin_support_1.BASE}/${r.key}/`);
    }
    createRecord(key, req, res) { return this.save(this.resource(key), req, res, null); }
    async saveOrder(key, req, res) {
        const r = this.resource(key);
        const delegate = this.prisma[r.model];
        let changed = 0;
        for (const [name, value] of Object.entries(req.body ?? {})) {
            const m = /^ordering_(\d+)$/.exec(name);
            if (!m || !/^\d{1,6}$/.test(String(value)))
                continue;
            await delegate.updateMany({ where: { id: Number(m[1]), NOT: { ordering: Number(value) } }, data: { ordering: Number(value) } }).then((x) => { changed += x.count; });
        }
        if (changed) {
            await this.s.refresh();
            this.s.flash(res, 'success', 'Order saved.');
        }
        return res.redirect(302, this.s.back(req, `${admin_support_1.BASE}/${r.key}/`));
    }
    async bulk(key, req, res) {
        const r = this.resource(key);
        const picked = ids(req.body?.ids);
        const action = String(req.body?.action ?? '');
        const delegate = this.prisma[r.model];
        if (!picked.length)
            this.s.flash(res, 'info', 'Tick at least one item first.');
        else if (action === 'publish' || action === 'unpublish') {
            await delegate.updateMany({ where: { id: { in: picked } }, data: { is_published: action === 'publish' } });
            await this.s.refresh();
            this.s.flash(res, 'success', `${picked.length} item(s) ${action === 'publish' ? 'shown on' : 'hidden from'} the website.`);
        }
        else if (action === 'delete') {
            const rows = await delegate.findMany({ where: { id: { in: picked } } });
            try {
                await delegate.deleteMany({ where: { id: { in: picked } } });
                for (const row of rows)
                    for (const f of r.fields.filter((x) => x.type === 'image' || x.type === 'video'))
                        (0, images_1.deleteMedia)(row[f.name]);
                await this.s.refresh();
                this.s.flash(res, 'success', `${picked.length} item(s) deleted.`);
            }
            catch {
                this.s.flash(res, 'error', 'Some items are still in use, so nothing was deleted.');
            }
        }
        return res.redirect(302, this.s.back(req, `${admin_support_1.BASE}/${r.key}/`));
    }
    async editForm(key, id, req, res) {
        const r = this.resource(key);
        const row = await this.prisma[r.model].findUnique({ where: { id: parseInt(id, 10) || 0 } });
        if (!row)
            throw new common_1.NotFoundException();
        const fieldsets = (0, forms_1.buildFieldsets)(r.fields, r.fieldsets, row, {}, await (0, forms_1.fkOptions)(this.prisma, r.fields), 'row');
        return this.s.page(req, res, 'form.html', { active: r.key, title: `Change ${r.label.toLowerCase()}`, subtitle: r.titleOf(row), blurb: r.blurb, fieldsets, action: `${admin_support_1.BASE}/${r.key}/${row.id}/`, back: `${admin_support_1.BASE}/${r.key}/`, record: row, view: r.viewUrl ? r.viewUrl(row) : null });
    }
    async updateRecord(key, id, req, res) {
        const r = this.resource(key);
        const row = await this.prisma[r.model].findUnique({ where: { id: parseInt(id, 10) || 0 } });
        if (!row)
            throw new common_1.NotFoundException();
        return this.save(r, req, res, row);
    }
    async confirmDelete(key, id, req, res) {
        const r = this.resource(key);
        const row = await this.prisma[r.model].findUnique({ where: { id: parseInt(id, 10) || 0 } });
        if (!row)
            throw new common_1.NotFoundException();
        let usage = '';
        if (r.key === 'categories') {
            const [a, b, c] = await Promise.all([this.prisma.service.count({ where: { category_id: row.id } }), this.prisma.project.count({ where: { event_category_id: row.id } }), this.prisma.galleryImage.count({ where: { event_category_id: row.id } })]);
            if (a || b)
                usage = `This event type is used by ${a} service(s) and ${b} project(s), so it cannot be deleted until they are moved to another type. ${c ? c + ' photo(s) would simply become uncategorised.' : ''}`;
        }
        if (r.key === 'projects') {
            const n = await this.prisma.galleryImage.count({ where: { project_id: row.id } });
            if (n)
                usage = `${n} photo(s) belong to this project and will be deleted with it.`;
        }
        return this.s.page(req, res, 'confirm_delete.html', { active: r.key, r, row_title: r.titleOf(row), id: row.id, usage, blocked: usage.includes('cannot be deleted') });
    }
    async deleteRecord(key, id, req, res) {
        const r = this.resource(key);
        const rowId = parseInt(id, 10) || 0;
        const row = await this.prisma[r.model].findUnique({ where: { id: rowId } });
        if (!row)
            throw new common_1.NotFoundException();
        try {
            let owned = [];
            if (r.key === 'projects') {
                const photos = await this.prisma.galleryImage.findMany({ where: { project_id: rowId }, select: { image: true } });
                owned = photos.map((p) => p.image);
            }
            await this.prisma[r.model].delete({ where: { id: rowId } });
            for (const f of r.fields.filter((x) => x.type === 'image' || x.type === 'video'))
                (0, images_1.deleteMedia)(row[f.name]);
            owned.forEach(images_1.deleteMedia);
            await this.s.refresh();
            this.s.flash(res, 'success', `${r.label} deleted.`);
        }
        catch (e) {
            this.s.flash(res, 'error', /foreign key|constraint|P2003|P2014/i.test(String(e?.message) + String(e?.code)) ? `This ${r.label.toLowerCase()} is still in use, so it cannot be deleted. Move or delete the items that use it first.` : 'Could not delete this item.');
        }
        return res.redirect(302, `${admin_support_1.BASE}/${r.key}/`);
    }
    async toggle(key, id, field, req, res) {
        const r = this.resource(key);
        if (!r.fields.some((f) => f.name === field && f.type === 'bool'))
            throw new common_1.NotFoundException();
        const delegate = this.prisma[r.model];
        const row = await delegate.findUnique({ where: { id: parseInt(id, 10) || 0 } });
        if (!row)
            throw new common_1.NotFoundException();
        await delegate.update({ where: { id: row.id }, data: { [field]: !row[field] } });
        await this.s.refresh();
        return res.redirect(302, this.s.back(req, `${admin_support_1.BASE}/${r.key}/`));
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Post)('seed/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "runSeed", null);
__decorate([
    (0, common_1.Get)('account/password/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "passwordForm", null);
__decorate([
    (0, common_1.Post)('account/password/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('upload-image/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "uploadEditorImage", null);
__decorate([
    (0, common_1.Get)('site-settings/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "settingsForm", null);
__decorate([
    (0, common_1.Post)('site-settings/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "settingsSave", null);
__decorate([
    (0, common_1.Get)('leads/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "leads", null);
__decorate([
    (0, common_1.Get)('leads/export.csv'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "leadsCsv", null);
__decorate([
    (0, common_1.Post)('leads/bulk/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "leadsBulk", null);
__decorate([
    (0, common_1.Get)('leads/:id/'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "leadDetail", null);
__decorate([
    (0, common_1.Post)('leads/:id/'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "leadSave", null);
__decorate([
    (0, common_1.Post)('leads/:id/resend/'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "leadResend", null);
__decorate([
    (0, common_1.Post)('leads/:id/delete/'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "leadDelete", null);
__decorate([
    (0, common_1.Get)('users/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "users", null);
__decorate([
    (0, common_1.Get)('users/new/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "newUser", null);
__decorate([
    (0, common_1.Post)('users/new/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createUser", null);
__decorate([
    (0, common_1.Get)('users/:id/'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "editUser", null);
__decorate([
    (0, common_1.Post)('users/:id/'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Get)('gallery/upload/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "bulkForm", null);
__decorate([
    (0, common_1.Post)('gallery/upload/'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "bulkUpload", null);
__decorate([
    (0, common_1.Get)(':resource/'),
    __param(0, (0, common_1.Param)('resource')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':resource/new/'),
    __param(0, (0, common_1.Param)('resource')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "newForm", null);
__decorate([
    (0, common_1.Post)(':resource/new/'),
    __param(0, (0, common_1.Param)('resource')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createRecord", null);
__decorate([
    (0, common_1.Post)(':resource/order/'),
    __param(0, (0, common_1.Param)('resource')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "saveOrder", null);
__decorate([
    (0, common_1.Post)(':resource/bulk/'),
    __param(0, (0, common_1.Param)('resource')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "bulk", null);
__decorate([
    (0, common_1.Get)(':resource/:id/'),
    __param(0, (0, common_1.Param)('resource')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "editForm", null);
__decorate([
    (0, common_1.Post)(':resource/:id/'),
    __param(0, (0, common_1.Param)('resource')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateRecord", null);
__decorate([
    (0, common_1.Get)(':resource/:id/delete/'),
    __param(0, (0, common_1.Param)('resource')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "confirmDelete", null);
__decorate([
    (0, common_1.Post)(':resource/:id/delete/'),
    __param(0, (0, common_1.Param)('resource')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteRecord", null);
__decorate([
    (0, common_1.Post)(':resource/:id/toggle/:field/'),
    __param(0, (0, common_1.Param)('resource')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('field')),
    __param(3, (0, common_1.Req)()),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "toggle", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)(admin_support_1.BASE),
    (0, common_1.UseGuards)(auth_1.AdminGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, admin_support_1.AdminSupport, image_queue_service_1.ImageQueueService,
        seed_service_1.SeedService, notify_service_1.NotifyService])
], AdminController);
