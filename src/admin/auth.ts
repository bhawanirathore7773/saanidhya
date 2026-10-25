import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { config } from '../config/config';
import { csrfValid, sign, unsign } from '../common/http';
import { PrismaService } from '../prisma/prisma.service';

export const SESSION_COOKIE = 'admin_session';
const SALT = 'saanidhya.admin-session';
const SESSION_DAYS = 7;

export const hashPassword = (password: string) => bcrypt.hash(password, 11);
export const checkPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export function passwordProblem(password: string, email = ''): string {
  if (password.length < 10) return 'Use at least 10 characters.';
  if (/^\d+$/.test(password)) return 'The password cannot be only numbers.';
  if (email && password.toLowerCase() === email.toLowerCase()) return 'The password cannot be the same as the email.';
  if (/^(password|1234567890|qwertyuiop)/i.test(password)) return 'This password is too common.';
  return '';
}

export function startSession(res: Response, user: { id: number; password_hash: string }) {
  const payload = JSON.stringify({ u: user.id, e: Date.now() + SESSION_DAYS * 86400000, p: user.password_hash.slice(-10) });
  res.cookie(SESSION_COOKIE, sign(payload, SALT), { httpOnly: true, sameSite: 'lax', secure: config.production, maxAge: SESSION_DAYS * 86400000, path: '/' });
}
export const endSession = (res: Response) => res.clearCookie(SESSION_COOKIE, { path: '/' });

/** Cheap check (no database): is there a correctly signed, unexpired admin cookie? Used before accepting large uploads. */
export function hasSessionCookie(req: Request): boolean {
  const raw = unsign(req.cookies?.[SESSION_COOKIE] ?? '', SALT);
  if (!raw) return false;
  try { return JSON.parse(raw).e > Date.now(); } catch { return false; }
}

export async function currentAdmin(req: Request, prisma: PrismaService) {
  const raw = unsign(req.cookies?.[SESSION_COOKIE] ?? '', SALT);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as { u: number; e: number; p: string };
    if (!s.u || s.e < Date.now()) return null;
    const user = await prisma.adminUser.findUnique({ where: { id: s.u } });
    // changing the password signs out every older session
    return user && user.is_active && user.password_hash.slice(-10) === s.p ? user : null;
  } catch { return null; }
}

/** Only signed-in staff get in; every POST must carry the CSRF token. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
    const user = await currentAdmin(req, this.prisma);
    if (!user) {
      const next = req.method === 'GET' ? `?next=${encodeURIComponent(req.originalUrl)}` : '';
      res.redirect(302, `${config.adminBase}/login/${next}`);
      return false;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD' && !csrfValid(req)) throw new ForbiddenException('CSRF verification failed. Request aborted.');
    (req as any).admin = user;
    res.locals.admin = user;
    return true;
  }
}
