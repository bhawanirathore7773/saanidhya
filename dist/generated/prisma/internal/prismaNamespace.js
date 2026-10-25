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
exports.defineExtension = exports.LeadOrderByRelevanceFieldEnum = exports.TestimonialOrderByRelevanceFieldEnum = exports.BlogPostOrderByRelevanceFieldEnum = exports.VideoOrderByRelevanceFieldEnum = exports.GalleryImageOrderByRelevanceFieldEnum = exports.ProjectOrderByRelevanceFieldEnum = exports.FaqOrderByRelevanceFieldEnum = exports.ServiceOrderByRelevanceFieldEnum = exports.EventCategoryOrderByRelevanceFieldEnum = exports.AdminUserOrderByRelevanceFieldEnum = exports.SiteSettingsOrderByRelevanceFieldEnum = exports.NullsOrder = exports.SortOrder = exports.LeadScalarFieldEnum = exports.TestimonialScalarFieldEnum = exports.BlogPostScalarFieldEnum = exports.VideoScalarFieldEnum = exports.GalleryImageScalarFieldEnum = exports.ProjectScalarFieldEnum = exports.FaqScalarFieldEnum = exports.ServiceScalarFieldEnum = exports.EventCategoryScalarFieldEnum = exports.AdminUserScalarFieldEnum = exports.ContentVersionScalarFieldEnum = exports.SiteSettingsScalarFieldEnum = exports.TransactionIsolationLevel = exports.ModelName = exports.AnyNull = exports.JsonNull = exports.DbNull = exports.NullTypes = exports.prismaVersion = exports.getExtensionContext = exports.Decimal = exports.Sql = exports.raw = exports.join = exports.empty = exports.sql = exports.PrismaClientValidationError = exports.PrismaClientInitializationError = exports.PrismaClientRustPanicError = exports.PrismaClientUnknownRequestError = exports.PrismaClientKnownRequestError = void 0;
const runtime = __importStar(require("@prisma/client/runtime/client"));
exports.PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError;
exports.PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError;
exports.PrismaClientRustPanicError = runtime.PrismaClientRustPanicError;
exports.PrismaClientInitializationError = runtime.PrismaClientInitializationError;
exports.PrismaClientValidationError = runtime.PrismaClientValidationError;
exports.sql = runtime.sqltag;
exports.empty = runtime.empty;
exports.join = runtime.join;
exports.raw = runtime.raw;
exports.Sql = runtime.Sql;
exports.Decimal = runtime.Decimal;
exports.getExtensionContext = runtime.Extensions.getExtensionContext;
exports.prismaVersion = {
    client: "6.19.3",
    engine: "c2990dca591cba766e3b7ef5d9e8a84796e47ab7"
};
exports.NullTypes = {
    DbNull: runtime.objectEnumValues.classes.DbNull,
    JsonNull: runtime.objectEnumValues.classes.JsonNull,
    AnyNull: runtime.objectEnumValues.classes.AnyNull,
};
exports.DbNull = runtime.objectEnumValues.instances.DbNull;
exports.JsonNull = runtime.objectEnumValues.instances.JsonNull;
exports.AnyNull = runtime.objectEnumValues.instances.AnyNull;
exports.ModelName = {
    SiteSettings: 'SiteSettings',
    ContentVersion: 'ContentVersion',
    AdminUser: 'AdminUser',
    EventCategory: 'EventCategory',
    Service: 'Service',
    Faq: 'Faq',
    Project: 'Project',
    GalleryImage: 'GalleryImage',
    Video: 'Video',
    BlogPost: 'BlogPost',
    Testimonial: 'Testimonial',
    Lead: 'Lead'
};
exports.TransactionIsolationLevel = runtime.makeStrictEnum({
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
});
exports.SiteSettingsScalarFieldEnum = {
    id: 'id',
    business_name: 'business_name',
    tagline: 'tagline',
    founded_year: 'founded_year',
    price_range: 'price_range',
    phone: 'phone',
    whatsapp_number: 'whatsapp_number',
    email: 'email',
    address_line: 'address_line',
    locality: 'locality',
    city: 'city',
    state: 'state',
    postal_code: 'postal_code',
    latitude: 'latitude',
    longitude: 'longitude',
    service_areas: 'service_areas',
    opening_hours: 'opening_hours',
    google_maps_embed_url: 'google_maps_embed_url',
    google_maps_url: 'google_maps_url',
    google_business_profile_url: 'google_business_profile_url',
    google_review_url: 'google_review_url',
    google_rating: 'google_rating',
    google_review_count: 'google_review_count',
    google_site_verification: 'google_site_verification',
    ga4_measurement_id: 'ga4_measurement_id',
    instagram_url: 'instagram_url',
    facebook_url: 'facebook_url',
    youtube_url: 'youtube_url',
    events_completed: 'events_completed',
    years_experience: 'years_experience',
    hero_headline: 'hero_headline',
    hero_subheadline: 'hero_subheadline',
    hero_poster: 'hero_poster',
    hero_poster_alt: 'hero_poster_alt',
    hero_video: 'hero_video',
    whatsapp_message: 'whatsapp_message',
    lead_notification_emails: 'lead_notification_emails',
    about_story: 'about_story',
    about_photo: 'about_photo',
    about_photo_alt: 'about_photo_alt',
    default_seo_title: 'default_seo_title',
    default_seo_description: 'default_seo_description',
    schema_show_rating: 'schema_show_rating',
    default_og_image: 'default_og_image',
    created_at: 'created_at',
    updated_at: 'updated_at'
};
exports.ContentVersionScalarFieldEnum = {
    id: 'id',
    version: 'version'
};
exports.AdminUserScalarFieldEnum = {
    id: 'id',
    email: 'email',
    name: 'name',
    password_hash: 'password_hash',
    is_active: 'is_active',
    is_superuser: 'is_superuser',
    last_login_at: 'last_login_at',
    created_at: 'created_at',
    updated_at: 'updated_at'
};
exports.EventCategoryScalarFieldEnum = {
    id: 'id',
    is_published: 'is_published',
    ordering: 'ordering',
    slug: 'slug',
    seo_title: 'seo_title',
    seo_description: 'seo_description',
    name: 'name',
    short_description: 'short_description',
    description: 'description',
    icon: 'icon',
    cover_image: 'cover_image',
    cover_alt: 'cover_alt',
    created_at: 'created_at',
    updated_at: 'updated_at'
};
exports.ServiceScalarFieldEnum = {
    id: 'id',
    is_published: 'is_published',
    ordering: 'ordering',
    slug: 'slug',
    seo_title: 'seo_title',
    seo_description: 'seo_description',
    category_id: 'category_id',
    title: 'title',
    city: 'city',
    short_description: 'short_description',
    description: 'description',
    highlights: 'highlights',
    focus_keyword: 'focus_keyword',
    starting_price: 'starting_price',
    price_note: 'price_note',
    show_in_packages: 'show_in_packages',
    is_featured: 'is_featured',
    cover_image: 'cover_image',
    cover_alt: 'cover_alt',
    created_at: 'created_at',
    updated_at: 'updated_at'
};
exports.FaqScalarFieldEnum = {
    id: 'id',
    is_published: 'is_published',
    ordering: 'ordering',
    question: 'question',
    answer: 'answer',
    category_id: 'category_id',
    service_id: 'service_id',
    show_on_home: 'show_on_home',
    created_at: 'created_at',
    updated_at: 'updated_at'
};
exports.ProjectScalarFieldEnum = {
    id: 'id',
    is_published: 'is_published',
    ordering: 'ordering',
    slug: 'slug',
    seo_title: 'seo_title',
    seo_description: 'seo_description',
    title: 'title',
    event_category_id: 'event_category_id',
    service_id: 'service_id',
    short_description: 'short_description',
    description: 'description',
    venue: 'venue',
    city: 'city',
    event_date: 'event_date',
    guest_count: 'guest_count',
    is_featured: 'is_featured',
    cover_image: 'cover_image',
    cover_alt: 'cover_alt',
    created_at: 'created_at',
    updated_at: 'updated_at'
};
exports.GalleryImageScalarFieldEnum = {
    id: 'id',
    is_published: 'is_published',
    ordering: 'ordering',
    project_id: 'project_id',
    event_category_id: 'event_category_id',
    image: 'image',
    width: 'width',
    height: 'height',
    alt_text: 'alt_text',
    caption: 'caption',
    is_featured: 'is_featured',
    created_at: 'created_at',
    updated_at: 'updated_at'
};
exports.VideoScalarFieldEnum = {
    id: 'id',
    is_published: 'is_published',
    ordering: 'ordering',
    slug: 'slug',
    seo_title: 'seo_title',
    seo_description: 'seo_description',
    title: 'title',
    youtube_id: 'youtube_id',
    description: 'description',
    event_category_id: 'event_category_id',
    project_id: 'project_id',
    custom_thumbnail: 'custom_thumbnail',
    duration_seconds: 'duration_seconds',
    is_featured: 'is_featured',
    created_at: 'created_at',
    updated_at: 'updated_at'
};
exports.BlogPostScalarFieldEnum = {
    id: 'id',
    is_published: 'is_published',
    ordering: 'ordering',
    slug: 'slug',
    seo_title: 'seo_title',
    seo_description: 'seo_description',
    title: 'title',
    excerpt: 'excerpt',
    body: 'body',
    author_name: 'author_name',
    published_at: 'published_at',
    focus_keyword: 'focus_keyword',
    search_intent: 'search_intent',
    event_category_id: 'event_category_id',
    related_service_id: 'related_service_id',
    cover_image: 'cover_image',
    cover_alt: 'cover_alt',
    created_at: 'created_at',
    updated_at: 'updated_at'
};
exports.TestimonialScalarFieldEnum = {
    id: 'id',
    is_published: 'is_published',
    ordering: 'ordering',
    client_name: 'client_name',
    client_title: 'client_title',
    event_category_id: 'event_category_id',
    city: 'city',
    event_date: 'event_date',
    rating: 'rating',
    text: 'text',
    photo: 'photo',
    source: 'source',
    source_url: 'source_url',
    is_featured: 'is_featured',
    created_at: 'created_at',
    updated_at: 'updated_at'
};
exports.LeadScalarFieldEnum = {
    id: 'id',
    name: 'name',
    phone: 'phone',
    event_type_id: 'event_type_id',
    service_id: 'service_id',
    event_date: 'event_date',
    city: 'city',
    budget: 'budget',
    status: 'status',
    notes: 'notes',
    source_url: 'source_url',
    utm_source: 'utm_source',
    utm_medium: 'utm_medium',
    utm_campaign: 'utm_campaign',
    ip_address: 'ip_address',
    user_agent: 'user_agent',
    email_sent: 'email_sent',
    whatsapp_sent: 'whatsapp_sent',
    notify_error: 'notify_error',
    created_at: 'created_at',
    updated_at: 'updated_at'
};
exports.SortOrder = {
    asc: 'asc',
    desc: 'desc'
};
exports.NullsOrder = {
    first: 'first',
    last: 'last'
};
exports.SiteSettingsOrderByRelevanceFieldEnum = {
    business_name: 'business_name',
    tagline: 'tagline',
    price_range: 'price_range',
    phone: 'phone',
    whatsapp_number: 'whatsapp_number',
    email: 'email',
    address_line: 'address_line',
    locality: 'locality',
    city: 'city',
    state: 'state',
    postal_code: 'postal_code',
    service_areas: 'service_areas',
    opening_hours: 'opening_hours',
    google_maps_embed_url: 'google_maps_embed_url',
    google_maps_url: 'google_maps_url',
    google_business_profile_url: 'google_business_profile_url',
    google_review_url: 'google_review_url',
    google_site_verification: 'google_site_verification',
    ga4_measurement_id: 'ga4_measurement_id',
    instagram_url: 'instagram_url',
    facebook_url: 'facebook_url',
    youtube_url: 'youtube_url',
    hero_headline: 'hero_headline',
    hero_subheadline: 'hero_subheadline',
    hero_poster: 'hero_poster',
    hero_poster_alt: 'hero_poster_alt',
    hero_video: 'hero_video',
    whatsapp_message: 'whatsapp_message',
    lead_notification_emails: 'lead_notification_emails',
    about_story: 'about_story',
    about_photo: 'about_photo',
    about_photo_alt: 'about_photo_alt',
    default_seo_title: 'default_seo_title',
    default_seo_description: 'default_seo_description',
    default_og_image: 'default_og_image'
};
exports.AdminUserOrderByRelevanceFieldEnum = {
    email: 'email',
    name: 'name',
    password_hash: 'password_hash'
};
exports.EventCategoryOrderByRelevanceFieldEnum = {
    slug: 'slug',
    seo_title: 'seo_title',
    seo_description: 'seo_description',
    name: 'name',
    short_description: 'short_description',
    description: 'description',
    icon: 'icon',
    cover_image: 'cover_image',
    cover_alt: 'cover_alt'
};
exports.ServiceOrderByRelevanceFieldEnum = {
    slug: 'slug',
    seo_title: 'seo_title',
    seo_description: 'seo_description',
    title: 'title',
    city: 'city',
    short_description: 'short_description',
    description: 'description',
    highlights: 'highlights',
    focus_keyword: 'focus_keyword',
    price_note: 'price_note',
    cover_image: 'cover_image',
    cover_alt: 'cover_alt'
};
exports.FaqOrderByRelevanceFieldEnum = {
    question: 'question',
    answer: 'answer'
};
exports.ProjectOrderByRelevanceFieldEnum = {
    slug: 'slug',
    seo_title: 'seo_title',
    seo_description: 'seo_description',
    title: 'title',
    short_description: 'short_description',
    description: 'description',
    venue: 'venue',
    city: 'city',
    cover_image: 'cover_image',
    cover_alt: 'cover_alt'
};
exports.GalleryImageOrderByRelevanceFieldEnum = {
    image: 'image',
    alt_text: 'alt_text',
    caption: 'caption'
};
exports.VideoOrderByRelevanceFieldEnum = {
    slug: 'slug',
    seo_title: 'seo_title',
    seo_description: 'seo_description',
    title: 'title',
    youtube_id: 'youtube_id',
    description: 'description',
    custom_thumbnail: 'custom_thumbnail'
};
exports.BlogPostOrderByRelevanceFieldEnum = {
    slug: 'slug',
    seo_title: 'seo_title',
    seo_description: 'seo_description',
    title: 'title',
    excerpt: 'excerpt',
    body: 'body',
    author_name: 'author_name',
    focus_keyword: 'focus_keyword',
    search_intent: 'search_intent',
    cover_image: 'cover_image',
    cover_alt: 'cover_alt'
};
exports.TestimonialOrderByRelevanceFieldEnum = {
    client_name: 'client_name',
    client_title: 'client_title',
    city: 'city',
    text: 'text',
    photo: 'photo',
    source: 'source',
    source_url: 'source_url'
};
exports.LeadOrderByRelevanceFieldEnum = {
    name: 'name',
    phone: 'phone',
    city: 'city',
    budget: 'budget',
    status: 'status',
    notes: 'notes',
    source_url: 'source_url',
    utm_source: 'utm_source',
    utm_medium: 'utm_medium',
    utm_campaign: 'utm_campaign',
    ip_address: 'ip_address',
    user_agent: 'user_agent',
    notify_error: 'notify_error'
};
exports.defineExtension = runtime.Extensions.defineExtension;
