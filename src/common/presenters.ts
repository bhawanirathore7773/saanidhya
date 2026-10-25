/**
 * Turn database rows into the plain objects the templates use. Field names stay snake_case so the
 * templates read exactly like the original site (service.short_description, project.event_category.name ...).
 */
import { imageDimensions, mediaUrl, renditionUrl } from './images';
import { DateOnly, lines, normalizePhone, plain, stripTags, telUrl, truncateChars, whatsappUrl } from './utils';

export type Vm = Record<string, any>;

export interface ImageRef { name: string; url: string }
export const img = (name?: string | null): ImageRef | null => (name ? { name, url: mediaUrl(name) } : null);
const dateOnly = (d?: Date | null) => (d ? new DateOnly(d) : null);
const num = (d: any) => (d === null || d === undefined ? null : Number(d));

export function presentSite(row: Vm): Vm {
  const wa = row.whatsapp_number || row.phone;
  const notify = (row.lead_notification_emails || row.email || '').split(',').map((e: string) => e.trim()).filter(Boolean);
  return {
    ...row,
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    google_rating: num(row.google_rating),
    google_rating_text: row.google_rating === null || row.google_rating === undefined ? '' : Number(row.google_rating).toFixed(1),
    hero_poster: img(row.hero_poster),
    hero_video: img(row.hero_video),
    about_photo: img(row.about_photo),
    default_og_image: img(row.default_og_image),
    hero_video_type: row.hero_video && String(row.hero_video).toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4',
    phone_tel: telUrl(row.phone),
    whatsapp_digits: normalizePhone(wa),
    whatsapp_link: whatsappUrl(wa, row.whatsapp_message),
    full_address: [row.address_line, row.locality, row.city, row.state, row.postal_code].filter(Boolean).join(', '),
    social_links: [row.instagram_url, row.facebook_url, row.youtube_url].filter(Boolean),
    service_area_list: lines(row.service_areas),
    notification_email_list: notify,
    __model: 'SiteSettings',
  };
}

export function presentCategory(row: Vm): Vm {
  return { ...row, pk: row.id, cover_image: img(row.cover_image), __model: 'EventCategory' };
}

export function presentService(row: Vm, defaultCity = ''): Vm {
  return {
    ...row,
    cover_image: img(row.cover_image),
    get_absolute_url: `/${row.slug}/`,
    highlight_list: lines(row.highlights),
    city_display: row.city || defaultCity,
    category: row.category ? presentCategory(row.category) : row.category,
    meta_title: row.seo_title || truncateChars(row.title, 60),
    meta_description: row.seo_description || truncateChars(stripTags(row.short_description), 155),
    __model: 'Service',
  };
}

export function presentProject(row: Vm): Vm {
  return {
    ...row,
    cover_image: img(row.cover_image),
    event_date: dateOnly(row.event_date),
    get_absolute_url: `/gallery/${row.slug}/`,
    event_category: row.event_category ? presentCategory(row.event_category) : row.event_category,
    service: row.service ? presentService(row.service) : row.service,
    meta_title: row.seo_title || truncateChars(row.title, 60),
    meta_description: row.seo_description || truncateChars(stripTags(row.short_description), 155),
    __model: 'Project',
  };
}

export function presentPhoto(row: Vm): Vm {
  const project = row.project ? presentProject(row.project) : row.project;
  const alt = row.alt_text || row.caption || (project ? `${project.title} - event decoration` : 'Event decoration by Saanidhya Events');
  const name: string = row.image;
  const size = row.width && row.height ? { width: row.width, height: row.height } : imageDimensions(name);
  return {
    ...row,
    width: size?.width ?? null,
    height: size?.height ?? null,
    project,
    image: img(name),
    alt,
    thumb_lg: { url: renditionUrl(name, 'GalleryImage.image', 'lg') },
    __model: 'GalleryImage',
  };
}

export function presentVideo(row: Vm): Vm {
  const secs: number | null = row.duration_seconds;
  let duration = '';
  if (secs) {
    const h = Math.floor(secs / 3600); const m = Math.floor((secs % 3600) / 60); const s = secs % 60;
    duration = 'PT' + (h ? `${h}H` : '') + (m ? `${m}M` : '') + (s || !(h || m) ? `${s}S` : '');
  }
  return {
    ...row,
    custom_thumbnail: img(row.custom_thumbnail),
    watch_url: `https://www.youtube.com/watch?v=${row.youtube_id}`,
    embed_url: `https://www.youtube-nocookie.com/embed/${row.youtube_id}?autoplay=1&rel=0&modestbranding=1`,
    youtube_thumbnail_url: `https://i.ytimg.com/vi_webp/${row.youtube_id}/mqdefault.webp`,
    duration_iso: duration,
    event_category: row.event_category ? presentCategory(row.event_category) : row.event_category,
    meta_title: row.seo_title || truncateChars(row.title, 60),
    meta_description: row.seo_description || truncateChars(stripTags(row.description), 155),
    __model: 'Video',
  };
}

export function presentPost(row: Vm): Vm {
  const words = plain(row.body).split(' ').filter(Boolean).length;
  return {
    ...row,
    cover_image: img(row.cover_image),
    get_absolute_url: `/blog/${row.slug}/`,
    reading_time_minutes: Math.max(1, Math.ceil(words / 200)),
    event_category: row.event_category ? presentCategory(row.event_category) : row.event_category,
    related_service: row.related_service ? presentService(row.related_service) : row.related_service,
    meta_title: row.seo_title || truncateChars(row.title, 60),
    meta_description: row.seo_description || truncateChars(stripTags(row.excerpt), 155),
    __model: 'BlogPost',
  };
}

export function presentTestimonial(row: Vm): Vm {
  return {
    ...row,
    photo: img(row.photo),
    event_category: row.event_category ? presentCategory(row.event_category) : row.event_category,
    __model: 'Testimonial',
  };
}

export const presentFaq = (row: Vm): Vm => ({ ...row, category: row.category ? presentCategory(row.category) : row.category, service: row.service ? presentService(row.service) : row.service });
