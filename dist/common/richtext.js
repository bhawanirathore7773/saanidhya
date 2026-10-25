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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addImageDimensions = addImageDimensions;
exports.sanitize = sanitize;
exports.addHeadingIds = addHeadingIds;
const fs = __importStar(require("fs"));
const image_size_1 = require("image-size");
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const config_1 = require("../config/config");
const images_1 = require("./images");
const utils_1 = require("./utils");
const TAGS = ['a', 'b', 'blockquote', 'br', 'em', 'figcaption', 'figure', 'h2', 'h3', 'h4', 'i', 'img', 'li', 'ol', 'p', 's', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul'];
const ATTRS = {
    a: ['href', 'title', 'rel'], img: ['src', 'alt', 'width', 'height'], figure: ['class'], table: ['class'],
    td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'],
};
const IMG = /<img\b[^>]*>/g;
const SRC = /\ssrc="([^"]+)"/;
const SIZED = /\s(width|height)=/;
const sizes = new Map();
function localImageSize(src) {
    if (!src.startsWith(config_1.config.mediaUrl) || src.includes('..'))
        return null;
    const rel = decodeURIComponent(src.slice(config_1.config.mediaUrl.length).split('?')[0]);
    if (sizes.has(rel))
        return sizes.get(rel);
    let result = null;
    try {
        const dim = (0, image_size_1.imageSize)(fs.readFileSync((0, images_1.mediaFile)(rel)));
        if (dim.width && dim.height)
            result = [dim.width, dim.height];
    }
    catch { }
    if (sizes.size > 5000)
        sizes.clear();
    if (result)
        sizes.set(rel, result);
    return result;
}
function addImageDimensions(html) {
    return html.replace(IMG, (tag) => {
        const src = SRC.exec(tag);
        if (!src || SIZED.test(tag))
            return tag;
        const size = localImageSize(src[1]);
        return size ? tag.replace(/\s*\/?>$/, '') + ` width="${size[0]}" height="${size[1]}">` : tag;
    });
}
function sanitize(html) {
    const cleaned = (0, sanitize_html_1.default)(html || '', {
        allowedTags: TAGS,
        allowedAttributes: ATTRS,
        allowedSchemes: ['http', 'https', 'mailto', 'tel'],
        allowedSchemesAppliedToAttributes: ['href', 'src'],
        transformTags: { a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } }) },
    });
    return addImageDimensions(cleaned).replace(/<img\b/g, '<img loading="lazy" decoding="async"');
}
const HEADING = /<(h[23])>([\s\S]*?)<\/\1>/g;
function addHeadingIds(html) {
    const used = new Set();
    const toc = [];
    const out = html.replace(HEADING, (_m, tag, inner) => {
        const text = (0, utils_1.stripTags)(inner).split(/\s+/).filter(Boolean).join(' ');
        const base = (0, utils_1.slugify)(text).slice(0, 60) || 'section';
        let slug = base;
        let n = 2;
        while (used.has(slug)) {
            slug = `${base}-${n}`;
            n += 1;
        }
        used.add(slug);
        if (tag === 'h2')
            toc.push({ id: slug, text });
        return `<${tag} id="${slug}">${inner}</${tag}>`;
    });
    return { html: out, toc };
}
