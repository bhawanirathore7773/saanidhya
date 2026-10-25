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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
exports.parseDatabaseUrl = parseDatabaseUrl;
const common_1 = require("@nestjs/common");
const adapter_mariadb_1 = require("@prisma/adapter-mariadb");
const client_1 = require("../generated/prisma/client");
const config_1 = require("../config/config");
function parseDatabaseUrl(url) {
    if (!url)
        throw new Error('DATABASE_URL is missing. Example: mysql://user:password@localhost:3306/database');
    const u = new URL(url);
    return {
        host: u.hostname === 'localhost' ? '127.0.0.1' : u.hostname,
        port: u.port ? parseInt(u.port, 10) : 3306,
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        database: decodeURIComponent(u.pathname.replace(/^\//, '')),
        ...(process.env.DB_SOCKET ? { socketPath: process.env.DB_SOCKET } : {}),
    };
}
let PrismaService = class PrismaService extends client_1.PrismaClient {
    constructor() {
        const db = parseDatabaseUrl(config_1.config.databaseUrl);
        super({
            adapter: new adapter_mariadb_1.PrismaMariaDb({
                ...db,
                timezone: 'Z',
                connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '5', 10),
                connectTimeout: 10000,
                acquireTimeout: 15000,
            }),
        });
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
