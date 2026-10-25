import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { ContentVersionService } from '../common/cache';
import { ensureCsrf } from '../common/http';
import { ViewService } from '../common/view.service';
import { config } from '../config/config';
import { PrismaService } from '../prisma/prisma.service';
import { RESOURCES } from './resources';

export const BASE = config.adminUrl.replace(/\/$/, '');

/** Shared helpers for the admin pages: layout values, flash messages, cache refresh. */
@Injectable()
export class AdminSupport {
  constructor(readonly prisma: PrismaService, readonly views: ViewService, readonly versions: ContentVersionService) {}

  flash(res: Response, level: 'success' | 'error' | 'info', message: string) {
    res.cookie('admin_flash', Buffer.from(JSON.stringify({ l: level, m: message })).toString('base64url'), { httpOnly: true, sameSite: 'lax', maxAge: 60000, path: '/' });
  }
  private readFlash(req: Request, res: Response) {
    const raw = req.cookies?.admin_flash;
    if (!raw) return null;
    res.clearCookie('admin_flash', { path: '/' });
    try { const f = JSON.parse(Buffer.from(raw, 'base64url').toString()); return { level: f.l, message: f.m }; } catch { return null; }
  }

  async page(req: Request, res: Response, template: string, ctx: Record<string, any> = {}, status = 200) {
    const newLeads = res.locals.admin ? await this.prisma.lead.count({ where: { status: 'new' } }) : 0;
    const active = ctx.active ?? '';
    this.views.render(res, `admin/${template}`, {
      adminBase: BASE, csrf_token: ensureCsrf(req, res), flash: this.readFlash(req, res), new_leads: newLeads, active,
      nav: RESOURCES.map((r) => ({ key: r.key, label: r.plural })), siteUrl: config.siteUrl, ...ctx,
    }, status);
  }

  /** Call after every change that visitors can see: cached pages are refreshed at once. */
  refresh() { return this.versions.bump(); }

  back(req: Request, fallback: string) {
    const ref = req.header('referer') || '';
    try { const u = new URL(ref, config.siteUrl); if (u.pathname.startsWith(BASE + '/')) return u.pathname + u.search; } catch { /* ignore */ }
    return fallback;
  }
}
