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
exports.mediaFile = exports.mediaUrl = exports.IMAGE_SPECS = void 0;
exports.renditionRel = renditionRel;
exports.generateRenditions = generateRenditions;
exports.renditions = renditions;
exports.renditionUrl = renditionUrl;
exports.shareImageUrl = shareImageUrl;
exports.deleteMedia = deleteMedia;
exports.imageDimensions = imageDimensions;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const image_size_1 = require("image-size");
const sharp_1 = __importDefault(require("sharp"));
const config_1 = require("../config/config");
sharp_1.default.cache(false);
sharp_1.default.concurrency(1);
exports.IMAGE_SPECS = {
    'EventCategory.cover_image': { widths: { sm: 480, md: 800, lg: 1200 } },
    'Service.cover_image': { widths: { sm: 480, md: 800, lg: 1200 }, share: true },
    'Project.cover_image': { widths: { sm: 480, md: 800, lg: 1200 }, share: true },
    'GalleryImage.image': { widths: { sm: 480, md: 800, lg: 1400 } },
    'Video.custom_thumbnail': { widths: { sm: 480, md: 800 } },
    'BlogPost.cover_image': { widths: { sm: 480, md: 800, lg: 1200 }, share: true },
    'Testimonial.photo': { widths: { sm: 96, md: 192 }, square: true, avif: false },
    'SiteSettings.hero_poster': { widths: { sm: 480, md: 900, lg: 1600 } },
    'SiteSettings.about_photo': { widths: { sm: 480, md: 800, lg: 1200 } },
};
const LABELS = ['sm', 'md', 'lg'];
const mediaUrl = (rel) => (rel ? config_1.config.mediaUrl + rel.replace(/^\/+/, '') : '');
exports.mediaUrl = mediaUrl;
const mediaFile = (rel) => path.join(config_1.config.uploadDir, rel);
exports.mediaFile = mediaFile;
function renditionRel(rel, label, ext) {
    const p = path.posix.parse(rel);
    return path.posix.join(p.dir, `${p.name}.${label}.${ext}`);
}
const exists = (rel) => { try {
    return fs.existsSync((0, exports.mediaFile)(rel));
}
catch {
    return false;
} };
const size = (rel) => fs.statSync((0, exports.mediaFile)(rel)).size;
async function generateRenditions(rel, specKey) {
    const spec = exports.IMAGE_SPECS[specKey];
    if (!rel || !spec)
        return;
    const source = (0, exports.mediaFile)(rel);
    const buffer = fs.readFileSync(source);
    for (const [label, width] of Object.entries(spec.widths)) {
        const base = () => {
            const img = (0, sharp_1.default)(buffer).rotate();
            return spec.square ? img.resize(width, width, { fit: 'cover' }) : img.resize({ width, fit: 'inside', withoutEnlargement: true });
        };
        await base().webp({ quality: config_1.config.images.webpQuality }).toFile((0, exports.mediaFile)(renditionRel(rel, label, 'webp')));
        if (spec.avif !== false) {
            try {
                await base().avif({ quality: config_1.config.images.avifQuality, effort: config_1.config.images.avifEffort }).toFile((0, exports.mediaFile)(renditionRel(rel, label, 'avif')));
            }
            catch { }
        }
    }
    if (spec.share) {
        await (0, sharp_1.default)(buffer).rotate().resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 80, mozjpeg: true }).toFile((0, exports.mediaFile)(renditionRel(rel, 'share', 'jpg')));
    }
    memo.clear();
}
const memo = new Map();
function renditions(rel, specKey, avif = false) {
    const spec = exports.IMAGE_SPECS[specKey];
    if (!rel || !spec)
        return [];
    if (avif && spec.avif === false)
        return [];
    const memoKey = `${rel}|${specKey}|${avif}`;
    const hit = memo.get(memoKey);
    if (hit)
        return hit;
    const found = [];
    let complete = true;
    for (const label of LABELS) {
        const width = spec.widths[label];
        if (!width)
            continue;
        const file = renditionRel(rel, label, avif ? 'avif' : 'webp');
        if (!exists(file)) {
            complete = false;
            continue;
        }
        if (avif) {
            const webp = renditionRel(rel, label, 'webp');
            if (exists(webp) && size(file) > size(webp) * (1 - config_1.config.images.avifMinSaving))
                continue;
        }
        found.push({ width, url: (0, exports.mediaUrl)(file) });
    }
    found.sort((a, b) => a.width - b.width);
    if (complete && found.length) {
        if (memo.size > 20000)
            memo.clear();
        memo.set(memoKey, found);
    }
    return found;
}
function renditionUrl(rel, specKey, label) {
    if (!rel)
        return '';
    const file = renditionRel(rel, label, 'webp');
    return exists(file) ? (0, exports.mediaUrl)(file) : (0, exports.mediaUrl)(rel);
}
function shareImageUrl(rel) {
    if (!rel)
        return '';
    const file = renditionRel(rel, 'share', 'jpg');
    return exists(file) ? (0, exports.mediaUrl)(file) : (0, exports.mediaUrl)(rel);
}
function deleteMedia(rel) {
    if (!rel)
        return;
    try {
        const p = path.posix.parse(rel);
        const dir = (0, exports.mediaFile)(p.dir);
        for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
            if (name === p.base || name.startsWith(`${p.name}.`))
                fs.unlinkSync(path.join(dir, name));
        }
        memo.clear();
    }
    catch { }
}
const dims = new Map();
function imageDimensions(rel) {
    if (!rel)
        return null;
    if (dims.has(rel))
        return dims.get(rel);
    let result = null;
    try {
        const d = (0, image_size_1.imageSize)(fs.readFileSync((0, exports.mediaFile)(rel)));
        if (d.width && d.height)
            result = { width: d.width, height: d.height };
    }
    catch { }
    if (dims.size > 20000)
        dims.clear();
    dims.set(rel, result);
    return result;
}
