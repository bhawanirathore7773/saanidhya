import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
import * as express from 'express';
import * as fs from 'fs';
import helmet from 'helmet';
import multer from 'multer';
import { AppModule } from './app.module';
import { hasSessionCookie } from './admin/auth';
import { ContextMiddleware } from './common/context.middleware';
import { SiteExceptionFilter } from './common/exception.filter';
import { PageCacheMiddleware } from './common/page-cache.middleware';
import { ViewService } from './common/view.service';
import { config } from './config/config';

export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: config.production ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug'] });
  fs.mkdirSync(config.uploadDir, { recursive: true });

  const trust = /^\d+$/.test(config.trustProxy) ? parseInt(config.trustProxy, 10) : config.trustProxy === 'true' ? true : config.trustProxy === 'false' ? false : config.trustProxy;
  app.set('trust proxy', trust);
  app.disable('x-powered-by');
  app.set('etag', 'weak');

  app.use(helmet({
    contentSecurityPolicy: false, // inline critical CSS and a tiny inline loader are part of the design
    crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' }, // photos may be shown in link previews
    hsts: config.production ? { maxAge: parseInt(process.env.HSTS_SECONDS || '3600', 10), includeSubDomains: false } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, frameguard: { action: 'deny' },
  }));
  app.use(compression());

  // Add the trailing slash like the original site (/about -> /about/), except for files.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if ((req.method === 'GET' || req.method === 'HEAD') && !req.path.endsWith('/') && !/\.[a-z0-9]+$/i.test(req.path) && req.path !== '/') {
      const q = req.originalUrl.slice(req.path.length);
      return res.redirect(301, `${req.path}/${q}`);
    }
    next();
  });

  app.use('/static', express.static(config.staticDir, { maxAge: '365d', immutable: true, index: false, fallthrough: false }));
  app.use('/media', express.static(config.uploadDir, { maxAge: '180d', index: false, fallthrough: true }));

  app.use(cookieParser());
  // Admin forms may carry photos: parse multipart bodies before the guards run (so CSRF can be checked).
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 45, fields: 400 } }).any();
  app.use(config.adminBase + '/', (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'POST' || !(req.headers['content-type'] || '').startsWith('multipart/form-data')) return next();
    if (!hasSessionCookie(req)) return void res.status(401).type('text').send('Please sign in first.'); // no big uploads for strangers
    upload(req, res, (err: any) => {
      if (!err) return next();
      res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).type('text').send(err.code === 'LIMIT_FILE_SIZE' ? 'A file is too large (25 MB at most per photo).' : 'The upload could not be read.');
    });
  });
  app.use(express.urlencoded({ extended: false, limit: '200kb' }));
  app.use(express.json({ limit: '200kb' }));

  // Whole-page cache first (a hit needs no database work), then the per-request page values.
  const pageCache = app.get(PageCacheMiddleware);
  const context = app.get(ContextMiddleware);
  app.use((req: Request, res: Response, next: NextFunction) => pageCache.use(req, res, next));
  app.use((req: Request, res: Response, next: NextFunction) => (req.path.startsWith(config.adminBase + '/') || req.path === '/healthz/' ? next() : context.use(req, res, next)));

  app.useGlobalFilters(new SiteExceptionFilter(app.get(ViewService)));
  app.enableShutdownHooks();
  return app;
}

export async function bootstrap() {
  process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));
  const app = await createApp();
  await app.listen(config.port, '0.0.0.0');
  console.log(`Saanidhya Events running on port ${config.port} (${config.production ? 'production' : 'development'})`);
}

if (require.main === module) {
  bootstrap().catch((err) => { console.error(err); process.exit(1); });
}
