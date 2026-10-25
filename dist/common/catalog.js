"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presentServices = exports.livePosts = exports.FEATURED_FIRST = exports.BY_ORDER = exports.PUBLISHED = void 0;
exports.pyRound = pyRound;
exports.buildTrustItems = buildTrustItems;
exports.generalFaqs = generalFaqs;
exports.firstThen = firstThen;
const presenters_1 = require("./presenters");
const utils_1 = require("./utils");
exports.PUBLISHED = { is_published: true };
exports.BY_ORDER = [{ ordering: 'asc' }, { created_at: 'desc' }, { id: 'asc' }];
exports.FEATURED_FIRST = [{ is_featured: 'desc' }, { ordering: 'asc' }, { created_at: 'desc' }, { id: 'asc' }];
const livePosts = () => ({ is_published: true, published_at: { lte: new Date() } });
exports.livePosts = livePosts;
function pyRound(n) {
    const f = Math.floor(n);
    const diff = n - f;
    if (diff === 0.5)
        return f % 2 === 0 ? f : f + 1;
    return Math.round(n);
}
function buildTrustItems(site) {
    const items = [];
    if (site.events_completed)
        items.push({ value: `${(0, utils_1.inr)(site.events_completed)}+`, label: 'Events delivered' });
    if (site.years_experience)
        items.push({ value: `${site.years_experience}+`, label: 'Years of experience' });
    if (site.google_rating) {
        let label = 'Google rating';
        if (site.google_review_count)
            label = `Google rating (${(0, utils_1.inr)(site.google_review_count)} reviews)`;
        items.push({ value: site.google_rating_text, label, stars: pyRound(site.google_rating), href: site.google_business_profile_url || site.google_review_url });
    }
    return items;
}
async function generalFaqs(prisma, limit = 8) {
    const rows = await prisma.faq.findMany({ where: { ...exports.PUBLISHED, category_id: null, service_id: null }, orderBy: exports.BY_ORDER, take: limit });
    return rows.map(presenters_1.presentFaq);
}
function firstThen(rows, isFirst, limit) {
    return [...rows.filter(isFirst), ...rows.filter((r) => !isFirst(r))].slice(0, limit);
}
const presentServices = (rows, city) => rows.map((r) => (0, presenters_1.presentService)(r, city));
exports.presentServices = presentServices;
