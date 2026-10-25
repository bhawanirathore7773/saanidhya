"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientIp = void 0;
exports.attemptsExceeded = attemptsExceeded;
exports.savedLimitReached = savedLimitReached;
exports.findDuplicate = findDuplicate;
const config_1 = require("../config/config");
const http_1 = require("../common/http");
Object.defineProperty(exports, "clientIp", { enumerable: true, get: function () { return http_1.clientIp; } });
const attempts = new http_1.HitCounter(3600 * 1000);
function attemptsExceeded(ip) {
    if (!ip)
        return false;
    return attempts.hit(`lead-attempts:${ip}`) > config_1.config.lead.attemptsPerHour;
}
async function savedLimitReached(prisma, ip) {
    if (!ip)
        return false;
    const since = new Date(Date.now() - 3600 * 1000);
    return (await prisma.lead.count({ where: { ip_address: ip, created_at: { gte: since } } })) >= config_1.config.lead.rateLimitPerHour;
}
async function findDuplicate(prisma, phone, eventTypeId) {
    const since = new Date(Date.now() - config_1.config.lead.duplicateWindowMinutes * 60 * 1000);
    return prisma.lead.findFirst({ where: { phone, event_type_id: eventTypeId, created_at: { gte: since } }, include: { event_type: true }, orderBy: { created_at: 'desc' } });
}
