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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.bootstrap = bootstrap;
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express = __importStar(require("express"));
const fs = __importStar(require("fs"));
const helmet_1 = __importDefault(require("helmet"));
const multer_1 = __importDefault(require("multer"));
const app_module_1 = require("./app.module");
const auth_1 = require("./admin/auth");
const context_middleware_1 = require("./common/context.middleware");
const exception_filter_1 = require("./common/exception.filter");
const page_cache_middleware_1 = require("./common/page-cache.middleware");
const view_service_1 = require("./common/view.service");
const config_1 = require("./config/config");
async function createApp() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { logger: config_1.config.production ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug'] });
    fs.mkdirSync(config_1.config.uploadDir, { recursive: true });
    const trust = /^\d+$/.test(config_1.config.trustProxy) ? parseInt(config_1.config.trustProxy, 10) : config_1.config.trustProxy === 'true' ? true : config_1.config.trustProxy === 'false' ? false : config_1.config.trustProxy;
    app.set('trust proxy', trust);
    app.disable('x-powered-by');
    app.set('etag', 'weak');
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' },
        hsts: config_1.config.production ? { maxAge: parseInt(process.env.HSTS_SECONDS || '3600', 10), includeSubDomains: false } : false,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, frameguard: { action: 'deny' },
    }));
    app.use((0, compression_1.default)());
    app.use((req, res, next) => {
        if ((req.method === 'GET' || req.method === 'HEAD') && !req.path.endsWith('/') && !/\.[a-z0-9]+$/i.test(req.path) && req.path !== '/') {
            const q = req.originalUrl.slice(req.path.length);
            return res.redirect(301, `${req.path}/${q}`);
        }
        next();
    });
    app.use('/static', express.static(config_1.config.staticDir, { maxAge: '365d', immutable: true, index: false, fallthrough: false }));
    app.use('/media', express.static(config_1.config.uploadDir, { maxAge: '180d', index: false, fallthrough: true }));
    app.use((0, cookie_parser_1.default)());
    const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 45, fields: 400 } }).any();
    app.use(config_1.config.adminBase + '/', (req, res, next) => {
        if (req.method !== 'POST' || !(req.headers['content-type'] || '').startsWith('multipart/form-data'))
            return next();
        if (!(0, auth_1.hasSessionCookie)(req))
            return void res.status(401).type('text').send('Please sign in first.');
        upload(req, res, (err) => {
            if (!err)
                return next();
            res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).type('text').send(err.code === 'LIMIT_FILE_SIZE' ? 'A file is too large (25 MB at most per photo).' : 'The upload could not be read.');
        });
    });
    app.use(express.urlencoded({ extended: false, limit: '200kb' }));
    app.use(express.json({ limit: '200kb' }));
    const pageCache = app.get(page_cache_middleware_1.PageCacheMiddleware);
    const context = app.get(context_middleware_1.ContextMiddleware);
    app.use((req, res, next) => pageCache.use(req, res, next));
    app.use((req, res, next) => (req.path.startsWith(config_1.config.adminBase + '/') || req.path === '/healthz/' ? next() : context.use(req, res, next)));
    app.useGlobalFilters(new exception_filter_1.SiteExceptionFilter(app.get(view_service_1.ViewService)));
    app.enableShutdownHooks();
    return app;
}
async function bootstrap() {
    process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));
    const app = await createApp();
    await app.listen(config_1.config.port, '0.0.0.0');
    console.log(`Saanidhya Events running on port ${config_1.config.port} (${config_1.config.production ? 'production' : 'development'})`);
}
if (require.main === module) {
    bootstrap().catch((err) => { console.error(err); process.exit(1); });
}
