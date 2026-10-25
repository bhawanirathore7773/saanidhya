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
exports.staticUrl = staticUrl;
exports.inlineCss = inlineCss;
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = require("../config/config");
const memo = new Map();
function staticUrl(rel) {
    rel = rel.replace(/^\/+/, '');
    const hit = memo.get(rel);
    if (hit && config_1.config.production)
        return hit;
    let url = `/static/${rel}`;
    try {
        const file = path.join(config_1.config.staticDir, rel);
        url += `?v=${(0, crypto_1.createHash)('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 10)}`;
    }
    catch { }
    memo.set(rel, url);
    return url;
}
const cssMemo = new Map();
function inlineCss(rel) {
    if (config_1.config.production && cssMemo.has(rel))
        return cssMemo.get(rel);
    let css = '';
    try {
        css = fs.readFileSync(path.join(config_1.config.staticDir, rel.replace(/^\/+/, '')), 'utf8');
    }
    catch {
        console.warn(`${rel} not found. Run: npm run css:build`);
    }
    cssMemo.set(rel, css);
    return css;
}
