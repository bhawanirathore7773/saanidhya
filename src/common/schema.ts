import { config } from '../config/config';
import { renditionUrl, shareImageUrl } from './images';
import { absoluteUrl, defaultImage } from './seo';
import { isoDate, normalizePhone, truncateChars } from './utils';

const CONTEXT = 'https://schema.org';
const base = () => config.siteUrl;
export const businessId = () => `${base()}/#business`;
const media = (url: string) => absoluteUrl(url);

export function businessNode(site: any) {
  const node: Record<string, any> = {
    '@type': ['LocalBusiness', 'ProfessionalService'],
    '@id': businessId(),
    name: site.business_name,
    url: `${base()}/`,
    description: site.tagline,
    image: site.hero_poster ? media(renditionUrl(site.hero_poster.name, 'SiteSettings.hero_poster', 'lg')) : absoluteUrl(defaultImage(site)),
    logo: absoluteUrl('/static/img/apple-touch-icon.png'),
    priceRange: site.price_range,
    areaServed: (site.service_area_list.length ? site.service_area_list : [site.city]).map((name: string) => ({ '@type': 'City', name })),
  };
  if (site.phone) node.telephone = `+${normalizePhone(site.phone)}`;
  if (site.email) node.email = site.email;
  const street = [site.address_line, site.locality].filter(Boolean).join(', ');
  if (street || site.city) {
    const address: Record<string, any> = { '@type': 'PostalAddress', addressLocality: site.city, addressRegion: site.state, addressCountry: 'IN' };
    if (street) address.streetAddress = street;
    if (site.postal_code) address.postalCode = site.postal_code;
    node.address = address;
  }
  if (site.latitude !== null && site.longitude !== null) node.geo = { '@type': 'GeoCoordinates', latitude: site.latitude, longitude: site.longitude };
  if (site.opening_hours) node.openingHours = site.opening_hours;
  if (site.founded_year) node.foundingDate = String(site.founded_year);
  const sameAs = [...site.social_links, site.google_business_profile_url].filter(Boolean);
  if (sameAs.length) node.sameAs = sameAs;
  if (site.google_maps_url) node.hasMap = site.google_maps_url;
  if (site.schema_show_rating && site.google_rating && site.google_review_count) {
    node.aggregateRating = { '@type': 'AggregateRating', ratingValue: site.google_rating, reviewCount: site.google_review_count, bestRating: 5, worstRating: 1 };
  }
  return node;
}

export const websiteNode = (site: any) => ({
  '@type': 'WebSite', '@id': `${base()}/#website`, url: `${base()}/`, name: site.business_name, inLanguage: 'en-IN', publisher: { '@id': businessId() },
});

export const breadcrumbNode = (crumbs: { name: string; url: string }[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absoluteUrl(c.url) })),
});

export function serviceNode(service: any) {
  const url = absoluteUrl(service.get_absolute_url);
  const node: Record<string, any> = {
    '@type': 'Service', '@id': `${url}#service`, name: service.title, description: service.short_description,
    serviceType: service.category.name, url, provider: { '@id': businessId() }, areaServed: { '@type': 'City', name: service.city_display },
  };
  if (service.cover_image) node.image = media(renditionUrl(service.cover_image.name, 'Service.cover_image', 'lg'));
  if (service.starting_price) {
    node.offers = { '@type': 'Offer', priceCurrency: 'INR', url, priceSpecification: { '@type': 'PriceSpecification', minPrice: service.starting_price, priceCurrency: 'INR' } };
  }
  return node;
}

export const faqNode = (faqs: any[]) => ({
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
});

export function videoNode(video: any) {
  const thumb = video.custom_thumbnail ? media(renditionUrl(video.custom_thumbnail.name, 'Video.custom_thumbnail', 'md')) : video.youtube_thumbnail_url;
  const node: Record<string, any> = {
    '@type': 'VideoObject', name: video.title, description: video.description || video.title, thumbnailUrl: [thumb],
    uploadDate: isoDate(video.created_at), embedUrl: `https://www.youtube.com/embed/${video.youtube_id}`,
  };
  if (video.duration_iso) node.duration = video.duration_iso;
  return node;
}

export function articleNode(post: any, site: any, canonical: string) {
  const modified = new Date(Math.max(post.updated_at.getTime(), post.published_at.getTime()));
  const node: Record<string, any> = {
    '@type': 'BlogPosting', headline: truncateChars(post.title, 110), description: post.meta_description,
    datePublished: isoDate(post.published_at), dateModified: isoDate(modified),
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    author: post.author_name === 'Team Saanidhya' ? { '@type': 'Organization', name: site.business_name } : { '@type': 'Person', name: post.author_name },
    publisher: { '@id': businessId() },
    image: [post.cover_image ? media(shareImageUrl(post.cover_image.name)) : absoluteUrl(defaultImage(site))],
    inLanguage: 'en-IN',
  };
  if (post.event_category) node.articleSection = post.event_category.name;
  return node;
}

export function buildGraph(site: any, nodes: any[] = [], opts: { breadcrumbs?: { name: string; url: string }[]; website?: boolean } = {}) {
  const graph: any[] = [businessNode(site)];
  if (opts.website) graph.push(websiteNode(site));
  if (opts.breadcrumbs && opts.breadcrumbs.length > 1) graph.push(breadcrumbNode(opts.breadcrumbs));
  graph.push(...nodes.filter(Boolean));
  return { '@context': CONTEXT, '@graph': graph };
}
