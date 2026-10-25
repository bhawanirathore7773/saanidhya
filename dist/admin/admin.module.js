"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_auth_controller_1 = require("./admin-auth.controller");
const admin_controller_1 = require("./admin.controller");
const admin_support_1 = require("./admin.support");
const auth_1 = require("./auth");
const image_queue_service_1 = require("./image-queue.service");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        controllers: [admin_auth_controller_1.AdminAuthController, admin_controller_1.AdminController],
        providers: [admin_support_1.AdminSupport, auth_1.AdminGuard, image_queue_service_1.ImageQueueService],
        exports: [image_queue_service_1.ImageQueueService],
    })
], AdminModule);
