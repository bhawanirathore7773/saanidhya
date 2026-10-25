import { Controller, ForbiddenException, Get, NotFoundException, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { clientIp, csrfValid, ensureCsrf, HitCounter } from '../common/http';
import { config } from '../config/config';
import { PrismaService } from '../prisma/prisma.service';
import { AdminSupport, BASE } from './admin.support';
import { checkPassword, currentAdmin, endSession, hashPassword, passwordProblem, startSession } from './auth';

const attempts = new HitCounter(15 * 60 * 1000);

/** Login, logout and the one-time "create the first admin" page. No guard here. */
@Controller(BASE)
export class AdminAuthController {
  constructor(private readonly prisma: PrismaService, private readonly support: AdminSupport) {}

  private noindex(res: Response) { res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }); }
  private safeNext(next: unknown) { const n = String(next ?? ''); return n.startsWith(BASE + '/') && !n.startsWith('//') ? n : `${BASE}/`; }

  @Get('login/')
  async loginForm(@Req() req: Request, @Res() res: Response) {
    this.noindex(res);
    if (await currentAdmin(req, this.prisma)) return res.redirect(302, this.safeNext(req.query.next));
    const hasAdmin = (await this.prisma.adminUser.count()) > 0;
    return this.support.page(req, res, 'login.html', { next: String(req.query.next ?? ''), needs_setup: !hasAdmin, setup_ready: Boolean(config.setupKey), email: '' });
  }

  @Post('login/')
  async login(@Req() req: Request, @Res() res: Response) {
    this.noindex(res);
    if (!csrfValid(req)) throw new ForbiddenException('CSRF verification failed. Request aborted.');
    const ip = clientIp(req) ?? 'unknown';
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const fail = (message: string, status = 200) => this.support.page(req, res, 'login.html', { error: message, email, next: String(req.body?.next ?? ''), needs_setup: false }, status);
    if (attempts.hit(ip) > 10) return fail('Too many attempts. Please wait 15 minutes and try again.', 429);
    const user = email ? await this.prisma.adminUser.findUnique({ where: { email } }) : null;
    const ok = user && user.is_active && (await checkPassword(String(req.body?.password ?? ''), user.password_hash));
    if (!user || !ok) { await hashPassword('timing-equaliser'); return fail('Wrong email or password.'); }
    await this.prisma.adminUser.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
    startSession(res, user);
    return res.redirect(302, this.safeNext(req.body?.next));
  }

  @Post('logout/')
  logout(@Req() req: Request, @Res() res: Response) {
    if (!csrfValid(req)) throw new ForbiddenException('CSRF verification failed. Request aborted.');
    endSession(res);
    return res.redirect(302, `${BASE}/login/`);
  }

  @Get('setup/')
  async setupForm(@Req() req: Request, @Res() res: Response) {
    this.noindex(res);
    if ((await this.prisma.adminUser.count()) > 0) throw new NotFoundException();
    return this.support.page(req, res, 'setup.html', { setup_ready: Boolean(config.setupKey), values: {}, errors: {} });
  }

  @Post('setup/')
  async setup(@Req() req: Request, @Res() res: Response) {
    this.noindex(res);
    if (!csrfValid(req)) throw new ForbiddenException('CSRF verification failed. Request aborted.');
    if ((await this.prisma.adminUser.count()) > 0) throw new NotFoundException();
    const b = req.body ?? {};
    const values = { name: String(b.name ?? '').trim(), email: String(b.email ?? '').trim().toLowerCase() };
    const errors: Record<string, string> = {};
    if (!config.setupKey) errors.setup_key = 'SETUP_KEY is not set on the server yet.';
    else if (String(b.setup_key ?? '') !== config.setupKey) errors.setup_key = 'The setup key is not correct.';
    if (!values.name) errors.name = 'This field is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address.';
    const problem = passwordProblem(String(b.password ?? ''), values.email);
    if (problem) errors.password = problem;
    else if (b.password !== b.password2) errors.password2 = 'The two passwords do not match.';
    if (Object.keys(errors).length) return this.support.page(req, res, 'setup.html', { setup_ready: Boolean(config.setupKey), values, errors });
    const user = await this.prisma.adminUser.create({ data: { name: values.name, email: values.email, password_hash: await hashPassword(String(b.password)), is_superuser: true } });
    startSession(res, user);
    this.support.flash(res, 'success', 'Your admin account is ready. Start with Site settings.');
    return res.redirect(302, `${BASE}/site-settings/`);
  }
}
