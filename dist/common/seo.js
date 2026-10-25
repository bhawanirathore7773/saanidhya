"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultImage = exports.defaultDescription = exports.absoluteUrl = exports.DESCRIPTION_LIMIT = exports.TITLE_LIMIT = void 0;
exports.composeTitle = composeTitle;
exports.buildSeo = buildSeo;
exports.defaultSeo = defaultSeo;
const config_1 = require("../config/config");
const static_1 = require("./static");
const utils_1 = require("./utils");
exports.TITLE_LIMIT = 60;
exports.DESCRIPTION_LIMIT = 155;
const absoluteUrl = (value) => (/^https?:\/\//.test(value) ? value : `${config_1.config.siteUrl}/${value.replace(/^\/+/, '')}`);
exports.absoluteUrl = absoluteUrl;
function composeTitle(pageTitle, brand, limit = exports.TITLE_LIMIT) {
    pageTitle = (pageTitle || '').split(/\s+/).filter(Boolean).join(' ');
    if (!pageTitle)
        return (0, utils_1.truncateChars)(brand, limit);
    const full = pageTitle.toLowerCase().includes(brand.toLowerCase()) ? pageTitle : `${pageTitle} | ${brand}`;
    return full.length <= limit ? full : (0, utils_1.truncateChars)(pageTitle, limit);
}
const defaultDescription = (site) => `${site.tagline} in ${site.city}. Call or WhatsApp ${site.business_name} for a free quote.`;
exports.defaultDescription = defaultDescription;
const defaultImage = (site) => (site.default_og_image ? site.default_og_image.url : (0, static_1.staticUrl)('img/og-default.jpg').split('?')[0]);
exports.defaultImage = defaultImage;
function buildSeo(path, site, o) {
    const brand = o.brand ?? true;
    return {
        title: brand ? composeTitle(o.title, site.business_name) : (0, utils_1.truncateChars)(o.title, exports.TITLE_LIMIT),
        description: (0, utils_1.truncateChars)(o.description || (0, exports.defaultDescription)(site), exports.DESCRIPTION_LIMIT),
        canonical: (0, exports.absoluteUrl)(o.canonical ?? path),
        image: (0, exports.absoluteUrl)(o.image || (0, exports.defaultImage)(site)),
        og_type: o.og_type ?? 'website',
        noindex: o.noindex ?? false,
        published: o.published ?? '',
        modified: o.modified ?? '',
    };
}
function defaultSeo(path, site) {
    return buildSeo(path, site, { title: site.default_seo_title || `Event Management & Decoration in ${site.city}`, description: site.default_seo_description });
}
