"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presentFaq = exports.img = void 0;
exports.presentSite = presentSite;
exports.presentCategory = presentCategory;
exports.presentService = presentService;
exports.presentProject = presentProject;
exports.presentPhoto = presentPhoto;
exports.presentVideo = presentVideo;
exports.presentPost = presentPost;
exports.presentTestimonial = presentTestimonial;
const images_1 = require("./images");
const utils_1 = require("./utils");
const img = (name) => (name ? { name, url: (0, images_1.mediaUrl)(name) } : null);
exports.img = img;
const dateOnly = (d) => (d ? new utils_1.DateOnly(d) : null);
const num = (d) => (d === null || d === undefined ? null : Number(d));
function presentSite(row) {
    const wa = row.whatsapp_number || row.phone;
    const notify = (row.lead_notification_emails || row.email || '').split(',').map((e) => e.trim()).filter(Boolean);
    return {
        ...row,
        latitude: num(row.latitude),
        longitude: num(row.longitude),
        google_rating: num(row.google_rating),
        google_rating_text: row.google_rating === null || row.google_rating === undefined ? '' : Number(row.google_rating).toFixed(1),
        hero_poster: (0, exports.img)(row.hero_poster),
        hero_video: (0, exports.img)(row.hero_video),
        about_photo: (0, exports.img)(row.about_photo),
        default_og_image: (0, exports.img)(row.default_og_image),
        hero_video_type: row.hero_video && String(row.hero_video).toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4',
        phone_tel: (0, utils_1.telUrl)(row.phone),
        whatsapp_digits: (0, utils_1.normalizePhone)(wa),
        whatsapp_link: (0, utils_1.whatsappUrl)(wa, row.whatsapp_message),
        full_address: [row.address_line, row.locality, row.city, row.state, row.postal_code].filter(Boolean).join(', '),
        social_links: [row.instagram_url, row.facebook_url, row.youtube_url].filter(Boolean),
        service_area_list: (0, utils_1.lines)(row.service_areas),
        notification_email_list: notify,
        __model: 'SiteSettings',
    };
}
function presentCategory(row) {
    return { ...row, pk: row.id, cover_image: (0, exports.img)(row.cover_image), __model: 'EventCategory' };
}
function presentService(row, defaultCity = '') {
    return {
        ...row,
        cover_image: (0, exports.img)(row.cover_image),
        get_absolute_url: `/${row.slug}/`,
        highlight_list: (0, utils_1.lines)(row.highlights),
        city_display: row.city || defaultCity,
        category: row.category ? presentCategory(row.category) : row.category,
        meta_title: row.seo_title || (0, utils_1.truncateChars)(row.title, 60),
        meta_description: row.seo_description || (0, utils_1.truncateChars)((0, utils_1.stripTags)(row.short_description), 155),
        __model: 'Service',
    };
}
function presentProject(row) {
    return {
        ...row,
        cover_image: (0, exports.img)(row.cover_image),
        event_date: dateOnly(row.event_date),
        get_absolute_url: `/gallery/${row.slug}/`,
        event_category: row.event_category ? presentCategory(row.event_category) : row.event_category,
        service: row.service ? presentService(row.service) : row.service,
        meta_title: row.seo_title || (0, utils_1.truncateChars)(row.title, 60),
        meta_description: row.seo_description || (0, utils_1.truncateChars)((0, utils_1.stripTags)(row.short_description), 155),
        __model: 'Project',
    };
}
function presentPhoto(row) {
    const project = row.project ? presentProject(row.project) : row.project;
    const alt = row.alt_text || row.caption || (project ? `${project.title} - event decoration` : 'Event decoration by Saanidhya Events');
    const name = row.image;
    const size = row.width && row.height ? { width: row.width, height: row.height } : (0, images_1.imageDimensions)(name);
    return {
        ...row,
        width: size?.width ?? null,
        height: size?.height ?? null,
        project,
        image: (0, exports.img)(name),
        alt,
        thumb_lg: { url: (0, images_1.renditionUrl)(name, 'GalleryImage.image', 'lg') },
        __model: 'GalleryImage',
    };
}
function presentVideo(row) {
    const secs = row.duration_seconds;
    let duration = '';
    if (secs) {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        duration = 'PT' + (h ? `${h}H` : '') + (m ? `${m}M` : '') + (s || !(h || m) ? `${s}S` : '');
    }
    return {
        ...row,
        custom_thumbnail: (0, exports.img)(row.custom_thumbnail),
        watch_url: `https://www.youtube.com/watch?v=${row.youtube_id}`,
        embed_url: `https://www.youtube-nocookie.com/embed/${row.youtube_id}?autoplay=1&rel=0&modestbranding=1`,
        youtube_thumbnail_url: `https://i.ytimg.com/vi_webp/${row.youtube_id}/mqdefault.webp`,
        duration_iso: duration,
        event_category: row.event_category ? presentCategory(row.event_category) : row.event_category,
        meta_title: row.seo_title || (0, utils_1.truncateChars)(row.title, 60),
        meta_description: row.seo_description || (0, utils_1.truncateChars)((0, utils_1.stripTags)(row.description), 155),
        __model: 'Video',
    };
}
function presentPost(row) {
    const words = (0, utils_1.plain)(row.body).split(' ').filter(Boolean).length;
    return {
        ...row,
        cover_image: (0, exports.img)(row.cover_image),
        get_absolute_url: `/blog/${row.slug}/`,
        reading_time_minutes: Math.max(1, Math.ceil(words / 200)),
        event_category: row.event_category ? presentCategory(row.event_category) : row.event_category,
        related_service: row.related_service ? presentService(row.related_service) : row.related_service,
        meta_title: row.seo_title || (0, utils_1.truncateChars)(row.title, 60),
        meta_description: row.seo_description || (0, utils_1.truncateChars)((0, utils_1.stripTags)(row.excerpt), 155),
        __model: 'BlogPost',
    };
}
function presentTestimonial(row) {
    return {
        ...row,
        photo: (0, exports.img)(row.photo),
        event_category: row.event_category ? presentCategory(row.event_category) : row.event_category,
        __model: 'Testimonial',
    };
}
const presentFaq = (row) => ({ ...row, category: row.category ? presentCategory(row.category) : row.category, service: row.service ? presentService(row.service) : row.service });
exports.presentFaq = presentFaq;
