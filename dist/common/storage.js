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
exports.UploadError = void 0;
exports.saveImage = saveImage;
exports.saveVideo = saveVideo;
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const config_1 = require("../config/config");
const images_1 = require("./images");
class UploadError extends Error {
}
exports.UploadError = UploadError;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'heif']);
const monthFolder = () => {
    const d = new Date();
    return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const ensureDir = (rel) => fs.mkdirSync(path.dirname((0, images_1.mediaFile)(rel)), { recursive: true });
async function saveImage(buffer, folder, maxSide = config_1.config.images.maxStoredSide) {
    let meta;
    try {
        meta = await (0, sharp_1.default)(buffer).metadata();
    }
    catch {
        throw new UploadError('This file is not a picture we can read. Please upload a JPG, PNG or WebP photo.');
    }
    if (!meta.format || !ALLOWED_FORMATS.has(meta.format))
        throw new UploadError('Please upload a JPG, PNG or WebP photo.');
    const hasAlpha = Boolean(meta.hasAlpha) && meta.format !== 'jpeg';
    const pipeline = (0, sharp_1.default)(buffer).rotate().resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true });
    const ext = hasAlpha ? 'png' : 'jpg';
    const rel = `${folder.replace('{ym}', monthFolder())}/${(0, crypto_1.randomBytes)(6).toString('hex')}.${ext}`;
    ensureDir(rel);
    const info = hasAlpha ? await pipeline.png({ compressionLevel: 9 }).toFile((0, images_1.mediaFile)(rel)) : await pipeline.jpeg({ quality: 86, progressive: true, mozjpeg: true }).toFile((0, images_1.mediaFile)(rel));
    return { rel, width: info.width, height: info.height };
}
function saveVideo(file, folder, maxMb = 8) {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (!['mp4', 'webm'].includes(ext))
        throw new UploadError('Please upload an MP4 or WebM video.');
    if (file.buffer.length > maxMb * 1024 * 1024) {
        throw new UploadError(`This file is ${(file.buffer.length / 1048576).toFixed(1)} MB. Please compress it to under ${maxMb} MB (a short muted hero video should be 2-4 MB).`);
    }
    const rel = `${folder}/${(0, crypto_1.randomBytes)(6).toString('hex')}.${ext}`;
    ensureDir(rel);
    fs.writeFileSync((0, images_1.mediaFile)(rel), file.buffer);
    return rel;
}
