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
Object.defineProperty(exports, "__esModule", { value: true });
exports.safe = void 0;
exports.truthy = truthy;
exports.wrapConditions = wrapConditions;
exports.createViewEnv = createViewEnv;
const nunjucks = __importStar(require("nunjucks"));
const config_1 = require("../config/config");
const images_1 = require("./images");
const richtext_1 = require("./richtext");
const static_1 = require("./static");
const utils_1 = require("./utils");
const fs = __importStar(require("fs"));
const safe = (html) => new nunjucks.runtime.SafeString(html);
exports.safe = safe;
function kwargs(args) {
    const last = args[args.length - 1];
    if (last && typeof last === 'object' && last.__keywords) {
        const { __keywords, ...kw } = last;
        return { positional: args.slice(0, -1), kw };
    }
    return { positional: args, kw: {} };
}
const attr = (name, value) => ` ${name}="${(0, utils_1.escapeHtml)(value)}"`;
const srcset = (list) => list.map((r) => `${r.url} ${r.width}w`).join(', ');
function sourceName(obj, source) {
    const field = obj?.[source];
    return field && typeof field === 'object' ? field.name : field || '';
}
function responsiveImage(...args) {
    const { positional, kw } = kwargs(args);
    const [obj, source] = positional;
    const o = { alt: '', sizes: '100vw', priority: false, css_class: '', ratio: '', eager: false, ...kw };
    const name = sourceName(obj, source);
    const specKey = `${obj?.__model}.${source}`;
    if (!name || !images_1.IMAGE_SPECS[specKey])
        return '';
    let list = (0, images_1.renditions)(name, specKey);
    if (!list.length) {
        if (!fs.existsSync((0, images_1.mediaFile)(name)))
            return '';
        return (0, exports.safe)(`<img src="${(0, utils_1.escapeHtml)('/media/' + name)}" alt="${(0, utils_1.escapeHtml)(o.alt)}" loading="${o.priority ? 'eager' : 'lazy'}" decoding="async"${o.css_class ? attr('class', o.css_class) : ''}>`);
    }
    const largest = list[list.length - 1].width;
    const attrs = [
        ['src', list[Math.floor(list.length / 2)].url], ['srcset', srcset(list)], ['sizes', o.sizes], ['alt', o.alt], ['decoding', 'async'],
    ];
    if (o.priority)
        attrs.push(['loading', 'eager'], ['fetchpriority', 'high']);
    else if (o.eager)
        attrs.push(['loading', 'eager']);
    else
        attrs.push(['loading', 'lazy']);
    const srcW = obj.width;
    const srcH = obj.height;
    if (srcW && srcH) {
        const width = Math.min(largest, srcW);
        attrs.push(['width', width], ['height', Math.round((width * srcH) / srcW)]);
    }
    else if (o.ratio) {
        const [num, den] = String(o.ratio).split('/').map(Number);
        attrs.push(['width', largest], ['height', Math.round((largest * den) / num)]);
    }
    if (o.css_class)
        attrs.push(['class', o.css_class]);
    const img = `<img${attrs.map(([k, v]) => attr(k, v)).join('')}>`;
    const avif = (0, images_1.renditions)(name, specKey, true);
    if (!avif.length)
        return (0, exports.safe)(img);
    return (0, exports.safe)(`<picture><source type="image/avif" srcset="${(0, utils_1.escapeHtml)(srcset(avif))}" sizes="${(0, utils_1.escapeHtml)(o.sizes)}">${img}</picture>`);
}
function imageSrcset(...args) {
    const { positional } = kwargs(args);
    const [obj, source] = positional;
    const name = sourceName(obj, source);
    const specKey = `${obj?.__model}.${source}`;
    if (!name)
        return null;
    const avif = (0, images_1.renditions)(name, specKey, true);
    if (avif.length)
        return { src: avif[Math.floor(avif.length / 2)].url, srcset: srcset(avif), type: 'image/avif' };
    const list = (0, images_1.renditions)(name, specKey);
    if (!list.length)
        return null;
    return { src: list[Math.floor(list.length / 2)].url, srcset: srcset(list), type: 'image/webp' };
}
const JSON_ESCAPES = { '<': '\\u003C', '>': '\\u003E', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029' };
function truthy(v) {
    if (v === null || v === undefined || v === false || v === 0 || v === '')
        return false;
    if (Array.isArray(v))
        return v.length > 0;
    if (v instanceof nunjucks.runtime.SafeString)
        return String(v).length > 0;
    if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype)
        return Object.keys(v).length > 0;
    return true;
}
const KEYWORDS = new Set(['true', 'false', 'none', 'null', 'undefined']);
function wrapConditions(source) {
    return source.replace(/\{%(-?)\s*(if|elif)\s+([\s\S]*?)\s*(-?)%\}/g, (_m, l, kw, cond, r) => {
        const parts = cond.split(/\s+(and|or)\s+/);
        const wrapped = parts.map((part, i) => {
            if (i % 2)
                return part;
            const m = /^(not\s+)?([A-Za-z_][\w.]*)$/.exec(part.trim());
            return m && !KEYWORDS.has(m[2]) ? `${m[1] || ''}truthy(${m[2]})` : part;
        });
        return `{%${l} ${kw} ${wrapped.join(' ')} ${r}%}`;
    });
}
class ViewLoader extends nunjucks.FileSystemLoader {
    getSource(name) {
        const found = super.getSource(name);
        if (found)
            found.src = wrapConditions(found.src);
        return found;
    }
}
function createViewEnv() {
    const env = new nunjucks.Environment(new ViewLoader(config_1.config.viewsDir, { noCache: !config_1.config.production }), { autoescape: true, throwOnUndefined: false });
    env.addGlobal('truthy', truthy);
    env.addGlobal('static', (rel) => (0, static_1.staticUrl)(rel));
    env.addGlobal('inline_css', (rel) => (0, exports.safe)((0, static_1.inlineCss)(rel)));
    env.addGlobal('icon', (name, css = 'h-5 w-5') => (0, exports.safe)(`<svg class="icon ${(0, utils_1.escapeHtml)(css)}" aria-hidden="true" focusable="false"><use href="#i-${(0, utils_1.escapeHtml)(name)}"></use></svg>`));
    env.addGlobal('stars', (rating, css = 'h-4 w-4') => {
        let r = Number(rating);
        r = Number.isFinite(r) ? Math.max(0, Math.min(5, Math.trunc(r))) : 0;
        const icons = Array.from({ length: 5 }, (_, i) => `<svg class="icon ${(0, utils_1.escapeHtml)(css)} ${i < r ? 'fill-gold-500 text-gold-500' : 'text-maroon-200'}" aria-hidden="true" focusable="false"><use href="#i-star"></use></svg>`).join('');
        return (0, exports.safe)(`<span class="inline-flex gap-0.5" role="img" aria-label="Rated ${r} out of 5">${icons}</span>`);
    });
    env.addGlobal('responsive_image', responsiveImage);
    env.addGlobal('image_srcset', imageSrcset);
    env.addGlobal('json_ld', (data) => {
        const text = JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (c) => JSON_ESCAPES[c]);
        return (0, exports.safe)(`<script type="application/ld+json">${text}</script>`);
    });
    env.addGlobal('now', (fmt) => (0, utils_1.formatDate)(new Date(), fmt));
    env.addGlobal('footer_services', function () { return this.ctx?.footer_services_list ?? []; });
    env.addFilter('date', (value, fmt) => (0, utils_1.formatDate)(value, fmt));
    env.addFilter('inr', (value) => (0, utils_1.inr)(value));
    env.addFilter('rich_text', (html) => (0, exports.safe)((0, richtext_1.sanitize)(html)));
    env.addFilter('truncatewords', (value, n) => (0, utils_1.truncateWords)(value, n));
    env.addFilter('slice_to', (value, n) => (typeof value === 'string' ? value.slice(0, n) : Array.from(value || []).slice(0, n)));
    env.addFilter('linebreaks', (value) => (0, exports.safe)((0, utils_1.linebreaks)(value)));
    env.addFilter('heading_ids', (html) => (0, richtext_1.addHeadingIds)(html));
    return env;
}
