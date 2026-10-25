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
exports.ContentVersionService = exports.LruCache = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
class LruCache {
    max;
    map = new Map();
    constructor(max = 300) {
        this.max = max;
    }
    get(key) {
        const hit = this.map.get(key);
        if (!hit)
            return undefined;
        if (hit.expires < Date.now()) {
            this.map.delete(key);
            return undefined;
        }
        this.map.delete(key);
        this.map.set(key, hit);
        return hit.value;
    }
    set(key, value, ttlSeconds) {
        this.map.delete(key);
        this.map.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
        while (this.map.size > this.max)
            this.map.delete(this.map.keys().next().value);
    }
    delete(key) { this.map.delete(key); }
    clear() { this.map.clear(); }
    get size() { return this.map.size; }
}
exports.LruCache = LruCache;
let ContentVersionService = class ContentVersionService {
    prisma;
    value = 1;
    checkedAt = 0;
    refreshing = null;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async current() {
        if (Date.now() - this.checkedAt > 3000) {
            this.refreshing ??= this.refresh().finally(() => { this.refreshing = null; });
            await this.refreshing;
        }
        return this.value;
    }
    async refresh() {
        try {
            const row = await this.prisma.contentVersion.upsert({ where: { id: 1 }, update: {}, create: { id: 1, version: 1 } });
            this.value = row.version;
        }
        catch {
        }
        this.checkedAt = Date.now();
    }
    async bump() {
        const row = await this.prisma.contentVersion.upsert({ where: { id: 1 }, update: { version: { increment: 1 } }, create: { id: 1, version: 2 } });
        this.value = row.version;
        this.checkedAt = Date.now();
    }
};
exports.ContentVersionService = ContentVersionService;
exports.ContentVersionService = ContentVersionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ContentVersionService);
