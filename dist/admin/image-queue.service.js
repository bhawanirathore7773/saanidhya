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
exports.ImageQueueService = void 0;
const common_1 = require("@nestjs/common");
const cache_1 = require("../common/cache");
const images_1 = require("../common/images");
let ImageQueueService = class ImageQueueService {
    versions;
    log = new common_1.Logger('Images');
    jobs = [];
    running = false;
    constructor(versions) {
        this.versions = versions;
    }
    enqueue(rel, spec) {
        if (!rel || !spec)
            return;
        this.jobs.push({ rel, spec });
        if (!this.running)
            setImmediate(() => void this.drain());
    }
    get pending() { return this.jobs.length + (this.running ? 1 : 0); }
    async drain() {
        this.running = true;
        let made = 0;
        while (this.jobs.length) {
            const job = this.jobs.shift();
            try {
                await (0, images_1.generateRenditions)(job.rel, job.spec);
                made += 1;
            }
            catch (e) {
                this.log.warn(`Could not resize ${job.rel}: ${e.message}`);
            }
        }
        this.running = false;
        if (made)
            await this.versions.bump().catch(() => undefined);
    }
    async idle() { while (this.running || this.jobs.length)
        await new Promise((r) => setTimeout(r, 25)); }
};
exports.ImageQueueService = ImageQueueService;
exports.ImageQueueService = ImageQueueService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cache_1.ContentVersionService])
], ImageQueueService);
