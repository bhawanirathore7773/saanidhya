"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SETTINGS_IMAGES = exports.SETTINGS_FIELDSETS = exports.SETTINGS_FIELDS = exports.resourceByKey = exports.RESOURCES = exports.SOURCES = exports.INTENTS = void 0;
const PUBLISH = { title: 'Visibility', fields: ['is_published', 'ordering'] };
const SEO = { title: 'Search engines (optional)', fields: ['slug', 'seo_title', 'seo_description'], collapsed: true };
const published = { name: 'is_published', label: 'Show on website', type: 'bool', help: 'Untick to hide from the website without deleting.', default: true };
const ordering = { name: 'ordering', label: 'Display order', type: 'int', min: 0, help: 'Lower numbers appear first.', default: 0, half: true };
const slug = { name: 'slug', label: 'Page address (slug)', type: 'slug', max: 90, help: 'Part of the page URL. Leave blank to generate it from the title.' };
const seoTitle = { name: 'seo_title', label: 'SEO title', type: 'text', max: 60, help: 'Google shows about 60 characters. Blank = the title is used.' };
const seoDesc = { name: 'seo_description', label: 'SEO description', type: 'textarea', max: 155, rows: 2, help: 'Google shows about 155 characters. Blank = built from the short description.' };
const featured = (help) => ({ name: 'is_featured', label: 'Featured', type: 'bool', help });
const catFk = (name, label, required = false) => ({ name, label, type: 'fk', required, fk: { model: 'eventCategory', label: 'name', order: [{ ordering: 'asc' }, { name: 'asc' }] }, half: true });
const serviceFk = (name, label) => ({ name, label, type: 'fk', fk: { model: 'service', label: 'title', order: [{ title: 'asc' }] }, half: true });
const projectFk = { name: 'project_id', label: 'Project', type: 'fk', fk: { model: 'project', label: 'title', order: [{ title: 'asc' }] }, half: true };
const withId = (f) => ({ ...f, name: f.name.endsWith('_id') ? f.name : f.name });
const catFilter = { name: 'event_category_id', label: 'Event type', kind: 'fk', fk: { model: 'eventCategory', label: 'name' } };
const pubFilter = { name: 'is_published', label: 'Visible', kind: 'bool' };
const featFilter = { name: 'is_featured', label: 'Featured', kind: 'bool' };
const PUB_COLS = [{ label: 'Visible', field: 'is_published', kind: 'bool' }, { label: 'Order', field: 'ordering', kind: 'order' }];
exports.INTENTS = [
    ['informational', 'Informational (how / what / ideas)'], ['commercial', 'Commercial (best / cost / compare)'], ['transactional', 'Transactional (book / hire)'],
];
exports.SOURCES = [
    ['google', 'Google review'], ['facebook', 'Facebook'], ['instagram', 'Instagram'], ['whatsapp', 'WhatsApp message'], ['direct', 'Told us directly'],
];
exports.RESOURCES = [
    {
        key: 'services', model: 'service', label: 'Service', plural: 'Services', blurb: 'Each service gets its own page at /<page address>/.',
        fields: [
            catFk('category_id', 'Event type', true), { name: 'title', label: 'Title', type: 'text', required: true, max: 120, placeholder: 'Wedding Decoration in Jaipur', half: true },
            { name: 'city', label: 'City', type: 'text', max: 80, help: 'Blank = the city from Site settings.', half: true },
            { name: 'short_description', label: 'Short description', type: 'textarea', required: true, max: 220, rows: 2, help: 'Shown on cards and in Google results.' },
            { name: 'description', label: 'Full description', type: 'richtext' },
            { name: 'highlights', label: 'Highlights', type: 'textarea', rows: 5, help: 'One point per line. Shown as a tick list.' },
            { name: 'focus_keyword', label: 'Focus keyword', type: 'text', max: 120, help: 'The main phrase this page should rank for (for your own reference).' },
            { name: 'starting_price', label: 'Starting price (₹)', type: 'int', min: 0, help: 'Blank = shown as "ask for a quote".', half: true },
            { name: 'price_note', label: 'Price note', type: 'text', max: 120, help: 'e.g. "Depends on venue and flowers".', half: true },
            { name: 'show_in_packages', label: 'Show on Packages page', type: 'bool' }, featured('Show on the home page first.'),
            { name: 'cover_image', label: 'Cover photo', type: 'image', help: 'Wide photo, at least 1200 px.' }, { name: 'cover_alt', label: 'Photo description (alt text)', type: 'text', max: 140 },
            published, ordering, slug, seoTitle, seoDesc,
        ],
        fieldsets: [
            { title: 'Service', fields: ['category_id', 'title', 'city', 'short_description', 'description', 'highlights', 'focus_keyword'] },
            { title: 'Price', fields: ['starting_price', 'price_note', 'show_in_packages', 'is_featured'] },
            { title: 'Photo', fields: ['cover_image', 'cover_alt'] }, PUBLISH, SEO,
        ],
        columns: [{ label: 'Service', kind: 'title' }, { label: 'Event type', kind: 'rel', rel: 'category', relField: 'name' }, { label: 'Price', field: 'starting_price', kind: 'number' },
            { label: 'Featured', field: 'is_featured', kind: 'bool' }, ...PUB_COLS],
        search: ['title', 'short_description', 'focus_keyword'],
        filters: [pubFilter, featFilter, { name: 'category_id', label: 'Event type', kind: 'fk', fk: { model: 'eventCategory', label: 'name' } }],
        include: { category: true }, orderBy: [{ ordering: 'asc' }, { title: 'asc' }], publishable: true, slugSource: 'title', reservedSlugs: true,
        viewUrl: (r) => `/${r.slug}/`, images: { cover_image: { folder: 'services', spec: 'Service.cover_image' } },
        defaults: { is_published: true, ordering: 0, city: '', highlights: '', focus_keyword: '', price_note: '', show_in_packages: false, is_featured: false },
        titleOf: (r) => r.title,
    },
    {
        key: 'categories', model: 'eventCategory', label: 'Event type', plural: 'Event types', blurb: 'Wedding, Birthday, Haldi ... used for filters, forms and grouping.',
        fields: [
            { name: 'name', label: 'Name', type: 'text', required: true, max: 80, half: true }, { name: 'icon', label: 'Icon name', type: 'text', max: 40, help: 'Optional. Used by the theme.', half: true },
            { name: 'short_description', label: 'Short description', type: 'textarea', max: 200, rows: 2 }, { name: 'description', label: 'Description', type: 'richtext' },
            { name: 'cover_image', label: 'Cover photo', type: 'image' }, { name: 'cover_alt', label: 'Photo description (alt text)', type: 'text', max: 140 },
            published, ordering, slug, seoTitle, seoDesc,
        ],
        fieldsets: [{ title: 'Event type', fields: ['name', 'icon', 'short_description', 'description'] }, { title: 'Photo', fields: ['cover_image', 'cover_alt'] }, PUBLISH, SEO],
        columns: [{ label: 'Name', kind: 'title' }, { label: 'Photo', kind: 'image', image: 'cover_image' }, ...PUB_COLS],
        search: ['name'], filters: [pubFilter], include: {}, orderBy: [{ ordering: 'asc' }, { name: 'asc' }], publishable: true, slugSource: 'name',
        images: { cover_image: { folder: 'categories', spec: 'EventCategory.cover_image' } },
        defaults: { is_published: true, ordering: 0, icon: '', description: '', short_description: '', cover_alt: '' }, titleOf: (r) => r.name,
    },
    {
        key: 'projects', model: 'project', label: 'Project', plural: 'Projects', blurb: 'A finished event. Shown in Portfolio with its own page.',
        fields: [
            { name: 'title', label: 'Title', type: 'text', required: true, max: 140 }, catFk('event_category_id', 'Event type', true), serviceFk('service_id', 'Related service'),
            { name: 'short_description', label: 'Short description', type: 'textarea', required: true, max: 220, rows: 2 }, { name: 'description', label: 'Story', type: 'richtext' },
            { name: 'venue', label: 'Venue', type: 'text', max: 150, half: true }, { name: 'city', label: 'City', type: 'text', max: 80, half: true },
            { name: 'event_date', label: 'Event date', type: 'date', half: true }, { name: 'guest_count', label: 'Guests', type: 'int', min: 0, half: true },
            featured('Show on the home page first.'), { name: 'cover_image', label: 'Cover photo', type: 'image', required: true }, { name: 'cover_alt', label: 'Photo description (alt text)', type: 'text', max: 140 },
            published, ordering, slug, seoTitle, seoDesc,
        ],
        fieldsets: [
            { title: 'Project', fields: ['title', 'event_category_id', 'service_id', 'short_description', 'description'] },
            { title: 'Details', fields: ['venue', 'city', 'event_date', 'guest_count', 'is_featured'] }, { title: 'Cover photo', fields: ['cover_image', 'cover_alt'] }, PUBLISH, SEO,
        ],
        columns: [{ label: 'Project', kind: 'title' }, { label: 'Photo', kind: 'image', image: 'cover_image' }, { label: 'Event type', kind: 'rel', rel: 'event_category', relField: 'name' },
            { label: 'Date', field: 'event_date', kind: 'date' }, { label: 'Featured', field: 'is_featured', kind: 'bool' }, ...PUB_COLS],
        search: ['title', 'venue', 'city'], filters: [pubFilter, featFilter, catFilter], include: { event_category: true },
        orderBy: [{ ordering: 'asc' }, { event_date: 'desc' }, { id: 'desc' }], publishable: true, slugSource: 'title', viewUrl: (r) => `/gallery/${r.slug}/`,
        images: { cover_image: { folder: 'projects', spec: 'Project.cover_image' } },
        defaults: { is_published: true, ordering: 0, description: '', venue: '', city: '', is_featured: false, cover_alt: '' }, titleOf: (r) => r.title,
    },
    {
        key: 'gallery', model: 'galleryImage', label: 'Photo', plural: 'Gallery photos', blurb: 'Photos shown in the Portfolio gallery. Use "Upload many photos" to add several at once.',
        fields: [
            { name: 'image', label: 'Photo', type: 'image', required: true }, { name: 'alt_text', label: 'Photo description (alt text)', type: 'text', max: 140, help: 'Describe what is in the picture. Helps Google and screen readers.' },
            { name: 'caption', label: 'Caption', type: 'text', max: 200 }, projectFk, catFk('event_category_id', 'Event type'), featured('Show in the home page gallery first.'), published, ordering,
        ],
        fieldsets: [{ title: 'Photo', fields: ['image', 'alt_text', 'caption'] }, { title: 'Belongs to', fields: ['project_id', 'event_category_id', 'is_featured'] }, PUBLISH],
        columns: [{ label: 'Photo', kind: 'image', image: 'image', field: 'image' }, { label: 'Description', field: 'alt_text', kind: 'title' }, { label: 'Event type', kind: 'rel', rel: 'event_category', relField: 'name' },
            { label: 'Project', kind: 'rel', rel: 'project', relField: 'title' }, { label: 'Featured', field: 'is_featured', kind: 'bool' }, ...PUB_COLS],
        search: ['alt_text', 'caption'], filters: [pubFilter, featFilter, catFilter, { name: 'project_id', label: 'Project', kind: 'fk', fk: { model: 'project', label: 'title' } }],
        include: { event_category: true, project: true }, orderBy: [{ ordering: 'asc' }, { created_at: 'desc' }], publishable: true,
        images: { image: { folder: 'gallery/{ym}', spec: 'GalleryImage.image' } },
        defaults: { is_published: true, ordering: 0, alt_text: '', caption: '', is_featured: false }, titleOf: (r) => r.alt_text || r.caption || `Photo ${r.id}`,
    },
    {
        key: 'videos', model: 'video', label: 'Video', plural: 'Videos', blurb: 'YouTube videos. Visitors see a picture first and the video loads only when they press play.',
        fields: [
            { name: 'title', label: 'Title', type: 'text', required: true, max: 140 }, { name: 'youtube_id', label: 'YouTube link or ID', type: 'youtube', required: true, help: 'Paste the full YouTube link or the 11-character video ID.' },
            { name: 'description', label: 'Description', type: 'textarea', rows: 3, help: 'Optional. Shown under the video and used by Google.' },
            catFk('event_category_id', 'Event type'), projectFk, { name: 'custom_thumbnail', label: 'Custom picture', type: 'image', help: 'Optional. Blank = the YouTube picture is used.' },
            { name: 'duration_seconds', label: 'Length (seconds)', type: 'int', min: 0, half: true }, featured('Show on the home page first.'), published, ordering, slug, seoTitle, seoDesc,
        ],
        fieldsets: [{ title: 'Video', fields: ['title', 'youtube_id', 'description', 'event_category_id', 'project_id', 'custom_thumbnail', 'duration_seconds', 'is_featured'] }, PUBLISH, SEO],
        columns: [{ label: 'Video', kind: 'title' }, { label: 'YouTube ID', field: 'youtube_id', kind: 'text' }, { label: 'Event type', kind: 'rel', rel: 'event_category', relField: 'name' },
            { label: 'Featured', field: 'is_featured', kind: 'bool' }, ...PUB_COLS],
        search: ['title', 'youtube_id'], filters: [pubFilter, featFilter, catFilter], include: { event_category: true }, orderBy: [{ ordering: 'asc' }, { created_at: 'desc' }],
        publishable: true, slugSource: 'title', images: { custom_thumbnail: { folder: 'videos', spec: 'Video.custom_thumbnail' } },
        defaults: { is_published: true, ordering: 0, description: '', is_featured: false }, titleOf: (r) => r.title,
    },
    {
        key: 'posts', model: 'blogPost', label: 'Article', plural: 'Blog articles', blurb: 'Guides and ideas. Use a future date to schedule an article.',
        fields: [
            { name: 'title', label: 'Title', type: 'text', required: true, max: 150 }, { name: 'excerpt', label: 'Short summary', type: 'textarea', required: true, max: 300, rows: 2, help: 'Shown on the blog list and in Google results.' },
            { name: 'body', label: 'Article', type: 'richtext', required: true, help: 'Use Heading 2 for sections. With 3 or more, a table of contents is added automatically.' },
            { name: 'author_name', label: 'Author', type: 'text', max: 80, half: true }, { name: 'published_at', label: 'Publish date and time (India time)', type: 'datetime', required: true, half: true },
            { name: 'focus_keyword', label: 'Focus keyword', type: 'text', max: 120, help: 'Main phrase this article should rank for.', half: true },
            { name: 'search_intent', label: 'Search intent', type: 'select', options: exports.INTENTS, half: true },
            catFk('event_category_id', 'Event type'), serviceFk('related_service_id', 'Related service'),
            { name: 'cover_image', label: 'Cover photo', type: 'image' }, { name: 'cover_alt', label: 'Photo description (alt text)', type: 'text', max: 140 }, published, ordering, slug, seoTitle, seoDesc,
        ],
        fieldsets: [
            { title: 'Article', fields: ['title', 'excerpt', 'body'] }, { title: 'Publishing', fields: ['author_name', 'published_at', 'is_published'] },
            { title: 'Search and links', fields: ['focus_keyword', 'search_intent', 'event_category_id', 'related_service_id'] }, { title: 'Cover photo', fields: ['cover_image', 'cover_alt'] },
            { title: 'More', fields: ['ordering'] }, SEO,
        ],
        columns: [{ label: 'Article', kind: 'title' }, { label: 'Published', field: 'published_at', kind: 'date' }, { label: 'Event type', kind: 'rel', rel: 'event_category', relField: 'name' },
            { label: 'Visible', field: 'is_published', kind: 'bool' }],
        search: ['title', 'excerpt', 'focus_keyword'], filters: [pubFilter, catFilter], include: { event_category: true }, orderBy: [{ published_at: 'desc' }], publishable: true, slugSource: 'title',
        viewUrl: (r) => `/blog/${r.slug}/`, images: { cover_image: { folder: 'blog', spec: 'BlogPost.cover_image' } },
        defaults: { is_published: true, ordering: 0, author_name: 'Team Saanidhya', search_intent: 'informational', focus_keyword: '', cover_alt: '' }, titleOf: (r) => r.title,
    },
    {
        key: 'testimonials', model: 'testimonial', label: 'Testimonial', plural: 'Testimonials', blurb: 'Client reviews. Ask permission before adding a client photo.',
        fields: [
            { name: 'client_name', label: 'Client name', type: 'text', required: true, max: 100, half: true }, { name: 'client_title', label: 'Who they are', type: 'text', max: 120, help: 'e.g. "Bride" or "Birthday host".', half: true },
            catFk('event_category_id', 'Event type'), { name: 'city', label: 'City', type: 'text', max: 80, half: true }, { name: 'event_date', label: 'Event date', type: 'date', half: true },
            { name: 'rating', label: 'Rating', type: 'select', required: true, options: [['5', '5 stars'], ['4', '4 stars'], ['3', '3 stars'], ['2', '2 stars'], ['1', '1 star']], half: true },
            { name: 'text', label: 'Review', type: 'textarea', required: true, rows: 5 }, { name: 'photo', label: 'Client photo', type: 'image', help: 'With their permission. Square works best.' },
            { name: 'source', label: 'Where it came from', type: 'select', options: exports.SOURCES, half: true }, { name: 'source_url', label: 'Link to the original review', type: 'url', max: 200, half: true },
            featured('Show on the home page.'), published, ordering,
        ],
        fieldsets: [{ title: 'Client', fields: ['client_name', 'client_title', 'event_category_id', 'city', 'event_date'] }, { title: 'Review', fields: ['rating', 'text', 'photo', 'source', 'source_url', 'is_featured'] }, PUBLISH],
        columns: [{ label: 'Client', kind: 'title' }, { label: 'Photo', kind: 'image', image: 'photo', field: 'photo' }, { label: 'Rating', field: 'rating', kind: 'number' }, { label: 'Event type', kind: 'rel', rel: 'event_category', relField: 'name' },
            { label: 'Featured', field: 'is_featured', kind: 'bool' }, ...PUB_COLS],
        search: ['client_name', 'text', 'city'], filters: [pubFilter, featFilter, catFilter], include: { event_category: true }, orderBy: [{ ordering: 'asc' }, { created_at: 'desc' }], publishable: true,
        images: { photo: { folder: 'testimonials', spec: 'Testimonial.photo', maxSide: 1000 } },
        defaults: { is_published: true, ordering: 0, client_title: '', city: '', source: 'direct', source_url: '', is_featured: false, rating: 5 }, titleOf: (r) => r.client_name,
    },
    {
        key: 'faqs', model: 'faq', label: 'FAQ', plural: 'FAQs', blurb: 'Questions and answers. Link one to a service or event type to show it on those pages.',
        fields: [
            { name: 'question', label: 'Question', type: 'text', required: true, max: 250 }, { name: 'answer', label: 'Answer', type: 'textarea', required: true, rows: 5 },
            catFk('category_id', 'Event type'), serviceFk('service_id', 'Service'), { name: 'show_on_home', label: 'Show on the home page', type: 'bool' }, published, ordering,
        ],
        fieldsets: [{ title: 'FAQ', fields: ['question', 'answer', 'category_id', 'service_id', 'show_on_home'] }, PUBLISH],
        columns: [{ label: 'Question', kind: 'title' }, { label: 'Event type', kind: 'rel', rel: 'category', relField: 'name' }, { label: 'Service', kind: 'rel', rel: 'service', relField: 'title' },
            { label: 'On home', field: 'show_on_home', kind: 'bool' }, ...PUB_COLS],
        search: ['question', 'answer'], filters: [pubFilter, { name: 'show_on_home', label: 'On home page', kind: 'bool' }, { name: 'category_id', label: 'Event type', kind: 'fk', fk: { model: 'eventCategory', label: 'name' } }],
        include: { category: true, service: true }, orderBy: [{ ordering: 'asc' }, { id: 'asc' }], publishable: true, images: {},
        defaults: { is_published: true, ordering: 0, show_on_home: false }, titleOf: (r) => r.question,
    },
];
const resourceByKey = (key) => exports.RESOURCES.find((r) => r.key === key);
exports.resourceByKey = resourceByKey;
const txt = (name, label, max, extra = {}) => ({ name, label, type: 'text', max, half: true, ...extra });
exports.SETTINGS_FIELDS = [
    txt('business_name', 'Business name', 100, { required: true }), txt('tagline', 'Tagline', 160), { name: 'founded_year', label: 'Founded (year)', type: 'int', min: 1900, max: 2100, half: true },
    txt('price_range', 'Price range symbol', 10, { help: 'Used in Google structured data, e.g. ₹₹.' }),
    { name: 'events_completed', label: 'Events delivered', type: 'int', min: 0, half: true, help: 'Shown in the trust bar. Blank hides it.' }, { name: 'years_experience', label: 'Years of experience', type: 'int', min: 0, max: 200, half: true },
    txt('phone', 'Phone number', 20, { help: 'e.g. +91 98290 12345' }), txt('whatsapp_number', 'WhatsApp number', 20, { help: 'Blank = the phone number is used.' }),
    { name: 'whatsapp_message', label: 'WhatsApp starting message', type: 'text', max: 200, help: 'Pre-filled text when a visitor taps a WhatsApp button.' },
    { name: 'email', label: 'Email', type: 'email', max: 254, half: true },
    txt('lead_notification_emails', 'Send new enquiries to', 300, { help: 'Comma-separated emails. Blank = the email on the left.' }),
    txt('address_line', 'Street address', 200), txt('locality', 'Area / locality', 100), txt('city', 'City', 80, { required: true }), txt('state', 'State', 80), txt('postal_code', 'PIN code', 10),
    { name: 'latitude', label: 'Latitude', type: 'decimal', min: -90, max: 90, half: true }, { name: 'longitude', label: 'Longitude', type: 'decimal', min: -180, max: 180, half: true },
    { name: 'service_areas', label: 'Areas you serve', type: 'textarea', rows: 4, help: 'One per line. Used for local SEO.' }, txt('opening_hours', 'Opening hours', 120, { help: 'schema.org format, e.g. Mo-Sa 10:00-20:00.' }),
    { name: 'google_maps_embed_url', label: 'Google Maps embed URL', type: 'url', max: 600, help: 'Google Maps > Share > Embed a map > copy only the src="..." URL.' },
    { name: 'google_maps_url', label: 'Google Maps link', type: 'url', max: 400, half: true }, { name: 'google_business_profile_url', label: 'Google Business Profile link', type: 'url', max: 400, half: true },
    { name: 'google_review_url', label: 'Google "write a review" link', type: 'url', max: 400, half: true },
    { name: 'google_rating', label: 'Google rating', type: 'decimal', min: 0, max: 5, half: true, help: 'Your real rating, e.g. 4.8. Blank hides the badge.' },
    { name: 'google_review_count', label: 'Number of Google reviews', type: 'int', min: 0, half: true },
    { name: 'schema_show_rating', label: 'Send the rating to Google (structured data)', type: 'bool', help: 'Google usually ignores a business rating on its own site. Leave off unless you know you want this.' },
    txt('google_site_verification', 'Search Console verification code', 100, { help: 'The content value only.' }), txt('ga4_measurement_id', 'Google Analytics 4 ID', 20, { help: 'e.g. G-ABC123XYZ' }),
    { name: 'instagram_url', label: 'Instagram', type: 'url', max: 200, half: true }, { name: 'facebook_url', label: 'Facebook', type: 'url', max: 200, half: true }, { name: 'youtube_url', label: 'YouTube channel', type: 'url', max: 200, half: true },
    { name: 'hero_headline', label: 'Home page headline', type: 'text', max: 120 }, { name: 'hero_subheadline', label: 'Home page sub-headline', type: 'textarea', max: 220, rows: 2 },
    { name: 'hero_poster', label: 'Hero photo', type: 'image', help: 'Wide photo, at least 1600 px. Also the video poster.' }, txt('hero_poster_alt', 'Hero photo description', 140),
    { name: 'hero_video', label: 'Hero video (optional)', type: 'video', help: 'Short (8-15 s) muted MP4 or WebM, ideally 2-4 MB (8 MB maximum). Plays on desktop only.' },
    { name: 'about_story', label: 'Our story', type: 'richtext', help: 'In your own words: who you are, why you started, what you care about.' },
    { name: 'about_photo', label: 'About page photo', type: 'image' }, txt('about_photo_alt', 'About photo description', 140),
    { name: 'default_seo_title', label: 'Home page SEO title', type: 'text', max: 60 }, { name: 'default_seo_description', label: 'Home page SEO description', type: 'textarea', max: 155, rows: 2 },
    { name: 'default_og_image', label: 'Share picture (WhatsApp / Facebook)', type: 'image', help: '1200x630 image for link previews.' },
];
exports.SETTINGS_FIELDSETS = [
    { title: 'Business', fields: ['business_name', 'tagline', 'founded_year', 'price_range', 'events_completed', 'years_experience'] },
    { title: 'Contact and enquiries', fields: ['phone', 'whatsapp_number', 'whatsapp_message', 'email', 'lead_notification_emails'] },
    { title: 'Address and service area', fields: ['address_line', 'locality', 'city', 'state', 'postal_code', 'latitude', 'longitude', 'service_areas', 'opening_hours', 'google_maps_embed_url', 'google_maps_url'] },
    { title: 'Google reviews and tracking', fields: ['google_business_profile_url', 'google_review_url', 'google_rating', 'google_review_count', 'schema_show_rating', 'google_site_verification', 'ga4_measurement_id'] },
    { title: 'Social media', fields: ['instagram_url', 'facebook_url', 'youtube_url'] },
    { title: 'Home page hero', fields: ['hero_headline', 'hero_subheadline', 'hero_poster', 'hero_poster_alt', 'hero_video'] },
    { title: 'About page', fields: ['about_story', 'about_photo', 'about_photo_alt'] },
    { title: 'Default search and sharing', fields: ['default_seo_title', 'default_seo_description', 'default_og_image'], collapsed: true },
];
exports.SETTINGS_IMAGES = {
    hero_poster: { folder: 'site', spec: 'SiteSettings.hero_poster' }, about_photo: { folder: 'site', spec: 'SiteSettings.about_photo' },
    default_og_image: { folder: 'site', spec: '' },
};
