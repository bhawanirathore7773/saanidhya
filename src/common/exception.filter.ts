import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { buildSeo } from './seo';
import { ViewService } from './view.service';

const FALLBACK_500 = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Something went wrong</title><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;line-height:1.6"><h1>Something went wrong</h1><p>Sorry, we hit a problem. Please try again in a minute.</p><p><a href="/">Back to the home page</a></p></body></html>';

@Catch()
export class SiteExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger('Error');
  constructor(private readonly views: ViewService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    if (res.headersSent) return;
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const wantsHtml = (req.header('accept') || '').includes('html') || !req.header('accept');
    if (status >= 500) this.log.error(`${req.method} ${req.originalUrl}: ${(exception as Error)?.stack || exception}`);
    if (status === 404 && wantsHtml && res.locals.site) {
      try {
        return this.views.render(res, '404.html', { seo: buildSeo(req.path, res.locals.site, { title: 'Page not found', noindex: true }) }, 404);
      } catch { /* fall through to plain text */ }
    }
    if (status === 403 && req.method === 'POST') return void res.status(403).type('text').send('CSRF verification failed. Request aborted.');
    if (status >= 500 && wantsHtml) return void res.status(500).type('html').send(FALLBACK_500);
    res.status(status).type('text').send(status === 404 ? 'Not found' : exception instanceof HttpException ? String(exception.message) : 'Server error');
  }
}
