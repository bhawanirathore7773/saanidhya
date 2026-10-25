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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminGuard = exports.endSession = exports.checkPassword = exports.hashPassword = exports.SESSION_COOKIE = void 0;
exports.passwordProblem = passwordProblem;
exports.startSession = startSession;
exports.hasSessionCookie = hasSessionCookie;
exports.currentAdmin = currentAdmin;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcryptjs"));
const config_1 = require("../config/config");
const http_1 = require("../common/http");
const prisma_service_1 = require("../prisma/prisma.service");
exports.SESSION_COOKIE = 'admin_session';
const SALT = 'saanidhya.admin-session';
const SESSION_DAYS = 7;
const hashPassword = (password) => bcrypt.hash(password, 11);
exports.hashPassword = hashPassword;
const checkPassword = (password, hash) => bcrypt.compare(password, hash);
exports.checkPassword = checkPassword;
function passwordProblem(password, email = '') {
    if (password.length < 10)
        return 'Use at least 10 characters.';
    if (/^\d+$/.test(password))
        return 'The password cannot be only numbers.';
    if (email && password.toLowerCase() === email.toLowerCase())
        return 'The password cannot be the same as the email.';
    if (/^(password|1234567890|qwertyuiop)/i.test(password))
        return 'This password is too common.';
    return '';
}
function startSession(res, user) {
    const payload = JSON.stringify({ u: user.id, e: Date.now() + SESSION_DAYS * 86400000, p: user.password_hash.slice(-10) });
    res.cookie(exports.SESSION_COOKIE, (0, http_1.sign)(payload, SALT), { httpOnly: true, sameSite: 'lax', secure: config_1.config.production, maxAge: SESSION_DAYS * 86400000, path: '/' });
}
const endSession = (res) => res.clearCookie(exports.SESSION_COOKIE, { path: '/' });
exports.endSession = endSession;
function hasSessionCookie(req) {
    const raw = (0, http_1.unsign)(req.cookies?.[exports.SESSION_COOKIE] ?? '', SALT);
    if (!raw)
        return false;
    try {
        return JSON.parse(raw).e > Date.now();
    }
    catch {
        return false;
    }
}
async function currentAdmin(req, prisma) {
    const raw = (0, http_1.unsign)(req.cookies?.[exports.SESSION_COOKIE] ?? '', SALT);
    if (!raw)
        return null;
    try {
        const s = JSON.parse(raw);
        if (!s.u || s.e < Date.now())
            return null;
        const user = await prisma.adminUser.findUnique({ where: { id: s.u } });
        return user && user.is_active && user.password_hash.slice(-10) === s.p ? user : null;
    }
    catch {
        return null;
    }
}
let AdminGuard = class AdminGuard {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        const http = context.switchToHttp();
        const req = http.getRequest();
        const res = http.getResponse();
        res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
        const user = await currentAdmin(req, this.prisma);
        if (!user) {
            const next = req.method === 'GET' ? `?next=${encodeURIComponent(req.originalUrl)}` : '';
            res.redirect(302, `${config_1.config.adminBase}/login/${next}`);
            return false;
        }
        if (req.method !== 'GET' && req.method !== 'HEAD' && !(0, http_1.csrfValid)(req))
            throw new common_1.ForbiddenException('CSRF verification failed. Request aborted.');
        req.admin = user;
        res.locals.admin = user;
        return true;
    }
};
exports.AdminGuard = AdminGuard;
exports.AdminGuard = AdminGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminGuard);
