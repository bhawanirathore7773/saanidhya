"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniqueSlug = uniqueSlug;
const navigation_1 = require("./navigation");
const utils_1 = require("./utils");
async function uniqueSlug(model, text, opts) {
    const max = opts.max ?? 90;
    const base = (0, utils_1.slugify)(text).slice(0, max).replace(/^-+|-+$/g, '') || opts.fallback;
    let slug = base;
    let n = 2;
    const taken = async (s) => (opts.reserved && navigation_1.RESERVED_SLUGS.has(s)) || Boolean(await model.findFirst({ where: { slug: s, ...(opts.excludeId ? { NOT: { id: opts.excludeId } } : {}) }, select: { id: true } }));
    while (await taken(slug)) {
        const suffix = `-${n}`;
        slug = `${base.slice(0, max - suffix.length)}${suffix}`;
        n += 1;
    }
    return slug;
}
