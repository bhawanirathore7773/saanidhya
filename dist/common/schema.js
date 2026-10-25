"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.faqNode = exports.breadcrumbNode = exports.websiteNode = exports.businessId = void 0;
exports.businessNode = businessNode;
exports.serviceNode = serviceNode;
exports.videoNode = videoNode;
exports.articleNode = articleNode;
exports.buildGraph = buildGraph;
const config_1 = require("../config/config");
const images_1 = require("./images");
const seo_1 = require("./seo");
const utils_1 = require("./utils");
const CONTEXT = 'https://schema.org';
const base = () => config_1.config.siteUrl;
const businessId = () => `${base()}/#business`;
exports.businessId = businessId;
const media = (url) => (0, seo_1.absoluteUrl)(url);
function businessNode(site) {
    const node = {
        '@type': ['LocalBusiness', 'ProfessionalService'],
        '@id': (0, exports.businessId)(),
        name: site.business_name,
        url: `${base()}/`,
        description: site.tagline,
        image: site.hero_poster ? media((0, images_1.renditionUrl)(site.hero_poster.name, 'SiteSettings.hero_poster', 'lg')) : (0, seo_1.absoluteUrl)((0, seo_1.defaultImage)(site)),
        logo: (0, seo_1.absoluteUrl)('/static/img/apple-touch-icon.png'),
        priceRange: site.price_range,
        areaServed: (site.service_area_list.length ? site.service_area_list : [site.city]).map((name) => ({ '@type': 'City', name })),
    };
    if (site.phone)
        node.telephone = `+${(0, utils_1.normalizePhone)(site.phone)}`;
    if (site.email)
        node.email = site.email;
    const street = [site.address_line, site.locality].filter(Boolean).join(', ');
    if (street || site.city) {
        const address = { '@type': 'PostalAddress', addressLocality: site.city, addressRegion: site.state, addressCountry: 'IN' };
        if (street)
            address.streetAddress = street;
        if (site.postal_code)
            address.postalCode = site.postal_code;
        node.address = address;
    }
    if (site.latitude !== null && site.longitude !== null)
        node.geo = { '@type': 'GeoCoordinates', latitude: site.latitude, longitude: site.longitude };
    if (site.opening_hours)
        node.openingHours = site.opening_hours;
    if (site.founded_year)
        node.foundingDate = String(site.founded_year);
    const sameAs = [...site.social_links, site.google_business_profile_url].filter(Boolean);
    if (sameAs.length)
        node.sameAs = sameAs;
    if (site.google_maps_url)
        node.hasMap = site.google_maps_url;
    if (site.schema_show_rating && site.google_rating && site.google_review_count) {
        node.aggregateRating = { '@type': 'AggregateRating', ratingValue: site.google_rating, reviewCount: site.google_review_count, bestRating: 5, worstRating: 1 };
    }
    return node;
}
const websiteNode = (site) => ({
    '@type': 'WebSite', '@id': `${base()}/#website`, url: `${base()}/`, name: site.business_name, inLanguage: 'en-IN', publisher: { '@id': (0, exports.businessId)() },
});
exports.websiteNode = websiteNode;
const breadcrumbNode = (crumbs) => ({
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: (0, seo_1.absoluteUrl)(c.url) })),
});
exports.breadcrumbNode = breadcrumbNode;
function serviceNode(service) {
    const url = (0, seo_1.absoluteUrl)(service.get_absolute_url);
    const node = {
        '@type': 'Service', '@id': `${url}#service`, name: service.title, description: service.short_description,
        serviceType: service.category.name, url, provider: { '@id': (0, exports.businessId)() }, areaServed: { '@type': 'City', name: service.city_display },
    };
    if (service.cover_image)
        node.image = media((0, images_1.renditionUrl)(service.cover_image.name, 'Service.cover_image', 'lg'));
    if (service.starting_price) {
        node.offers = { '@type': 'Offer', priceCurrency: 'INR', url, priceSpecification: { '@type': 'PriceSpecification', minPrice: service.starting_price, priceCurrency: 'INR' } };
    }
    return node;
}
const faqNode = (faqs) => ({
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
});
exports.faqNode = faqNode;
function videoNode(video) {
    const thumb = video.custom_thumbnail ? media((0, images_1.renditionUrl)(video.custom_thumbnail.name, 'Video.custom_thumbnail', 'md')) : video.youtube_thumbnail_url;
    const node = {
        '@type': 'VideoObject', name: video.title, description: video.description || video.title, thumbnailUrl: [thumb],
        uploadDate: (0, utils_1.isoDate)(video.created_at), embedUrl: `https://www.youtube.com/embed/${video.youtube_id}`,
    };
    if (video.duration_iso)
        node.duration = video.duration_iso;
    return node;
}
function articleNode(post, site, canonical) {
    const modified = new Date(Math.max(post.updated_at.getTime(), post.published_at.getTime()));
    const node = {
        '@type': 'BlogPosting', headline: (0, utils_1.truncateChars)(post.title, 110), description: post.meta_description,
        datePublished: (0, utils_1.isoDate)(post.published_at), dateModified: (0, utils_1.isoDate)(modified),
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        author: post.author_name === 'Team Saanidhya' ? { '@type': 'Organization', name: site.business_name } : { '@type': 'Person', name: post.author_name },
        publisher: { '@id': (0, exports.businessId)() },
        image: [post.cover_image ? media((0, images_1.shareImageUrl)(post.cover_image.name)) : (0, seo_1.absoluteUrl)((0, seo_1.defaultImage)(site))],
        inLanguage: 'en-IN',
    };
    if (post.event_category)
        node.articleSection = post.event_category.name;
    return node;
}
function buildGraph(site, nodes = [], opts = {}) {
    const graph = [businessNode(site)];
    if (opts.website)
        graph.push((0, exports.websiteNode)(site));
    if (opts.breadcrumbs && opts.breadcrumbs.length > 1)
        graph.push((0, exports.breadcrumbNode)(opts.breadcrumbs));
    graph.push(...nodes.filter(Boolean));
    return { '@context': CONTEXT, '@graph': graph };
}
