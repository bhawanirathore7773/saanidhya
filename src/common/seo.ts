import { config } from '../config/config';
import { staticUrl } from './static';
import { truncateChars } from './utils';

export const TITLE_LIMIT = 60;
export const DESCRIPTION_LIMIT = 155;

export interface Seo {
  title: string; description: string; canonical: string; image: string; og_type: string; noindex: boolean; published: string; modified: string;
}

export const absoluteUrl = (value: string) => (/^https?:\/\//.test(value) ? value : `${config.siteUrl}/${value.replace(/^\/+/, '')}`);

export function composeTitle(pageTitle: string, brand: string, limit = TITLE_LIMIT): string {
  pageTitle = (pageTitle || '').split(/\s+/).filter(Boolean).join(' ');
  if (!pageTitle) return truncateChars(brand, limit);
  const full = pageTitle.toLowerCase().includes(brand.toLowerCase()) ? pageTitle : `${pageTitle} | ${brand}`;
  return full.length <= limit ? full : truncateChars(pageTitle, limit);
}

export const defaultDescription = (site: any) => `${site.tagline} in ${site.city}. Call or WhatsApp ${site.business_name} for a free quote.`;
export const defaultImage = (site: any) => (site.default_og_image ? site.default_og_image.url : staticUrl('img/og-default.jpg').split('?')[0]);

export interface SeoInput {
  title: string; description?: string; image?: string; og_type?: string; noindex?: boolean; canonical?: string | null;
  brand?: boolean; published?: string; modified?: string;
}

export function buildSeo(path: string, site: any, o: SeoInput): Seo {
  const brand = o.brand ?? true;
  return {
    title: brand ? composeTitle(o.title, site.business_name) : truncateChars(o.title, TITLE_LIMIT),
    description: truncateChars(o.description || defaultDescription(site), DESCRIPTION_LIMIT),
    canonical: absoluteUrl(o.canonical ?? path),
    image: absoluteUrl(o.image || defaultImage(site)),
    og_type: o.og_type ?? 'website',
    noindex: o.noindex ?? false,
    published: o.published ?? '',
    modified: o.modified ?? '',
  };
}

export function defaultSeo(path: string, site: any): Seo {
  return buildSeo(path, site, { title: site.default_seo_title || `Event Management & Decoration in ${site.city}`, description: site.default_seo_description });
}
