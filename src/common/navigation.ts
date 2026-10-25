export const NAV_ITEMS = [
  { key: 'services', label: 'Services', path: '/services/' },
  { key: 'gallery', label: 'Portfolio', path: '/gallery/' },
  { key: 'videos', label: 'Videos', path: '/videos/' },
  { key: 'packages', label: 'Packages', path: '/packages/' },
  { key: 'about', label: 'About', path: '/about/' },
  { key: 'blog', label: 'Blog', path: '/blog/' },
];
export const QUOTE_PATH = '/contact/';
export const FOOTER_LINKS = [
  { label: 'Testimonials', path: '/testimonials/' },
  { label: 'FAQ', path: '/faq/' },
  { label: 'Get a quote', path: QUOTE_PATH },
  { label: 'Privacy policy', path: '/privacy/' },
  { label: 'Terms', path: '/terms/' },
];
/** Slugs that would clash with other URLs: service pages live at the site root (/<slug>/). */
export const RESERVED_SLUGS = new Set([
  'about', 'services', 'gallery', 'videos', 'packages', 'testimonials', 'blog', 'contact', 'faq', 'privacy', 'terms',
  'admin', 'static', 'media', 'healthz', 'sitemap', 'robots', 'favicon', 'thanks', 'setup',
]);
