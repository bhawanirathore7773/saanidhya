"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESERVED_SLUGS = exports.FOOTER_LINKS = exports.QUOTE_PATH = exports.NAV_ITEMS = void 0;
exports.NAV_ITEMS = [
    { key: 'services', label: 'Services', path: '/services/' },
    { key: 'gallery', label: 'Portfolio', path: '/gallery/' },
    { key: 'videos', label: 'Videos', path: '/videos/' },
    { key: 'packages', label: 'Packages', path: '/packages/' },
    { key: 'about', label: 'About', path: '/about/' },
    { key: 'blog', label: 'Blog', path: '/blog/' },
];
exports.QUOTE_PATH = '/contact/';
exports.FOOTER_LINKS = [
    { label: 'Testimonials', path: '/testimonials/' },
    { label: 'FAQ', path: '/faq/' },
    { label: 'Get a quote', path: exports.QUOTE_PATH },
    { label: 'Privacy policy', path: '/privacy/' },
    { label: 'Terms', path: '/terms/' },
];
exports.RESERVED_SLUGS = new Set([
    'about', 'services', 'gallery', 'videos', 'packages', 'testimonials', 'blog', 'contact', 'faq', 'privacy', 'terms',
    'admin', 'static', 'media', 'healthz', 'sitemap', 'robots', 'favicon', 'thanks', 'setup',
]);
