# What changed from the Django version

**Same:** every public page, URL, template markup, CSS, JavaScript, SEO tags, JSON-LD, HTMX behaviour (filters, "load more"), enquiry form rules and messages, email text, sitemap and robots. Page-by-page checks of the rendered HTML against the original show identical markup.

**Replaced (because Hostinger shared hosting has no Python, Redis or Postgres):**

| Django version | This version |
|---|---|
| Django + Gunicorn + Nginx | NestJS (Express) started by Hostinger with `server.js` |
| PostgreSQL | MySQL / MariaDB through Prisma (`database/schema.sql`) |
| Redis page cache | In-memory page cache, refreshed after every admin save |
| Django admin + Jazzmin | New admin panel at `/admin/` (same content areas, plus bulk photo upload, enquiry inbox, CSV export) |
| CKEditor 5 | Quill editor (headings, bold/italic, lists, links, pictures) with the same HTML sanitising rules |
| django-imagekit + Pillow | sharp: WebP + AVIF in 3 sizes and a 1200x630 share image, made in the background |
| systemd timer retrying failed alerts | Built-in retry every 10 minutes |
| Django sessions / CSRF | Signed admin cookie (7 days) and double-submit CSRF cookie |
| Whitenoise hashed static files | `/static/...?v=<hash>` with a 1-year cache |

**Small differences you may notice**
* The admin looks different but manages the same things. Enquiry status values are New, Contacted, Quote sent, Booked, Lost.
* Page cache is per running app. It is cleared on restart.
* The first admin is created at `/admin/setup/` with a `SETUP_KEY` instead of `createsuperuser`.
* The style guide page used during development was not carried over.
* Everything else (texts, forms, validation messages, SEO) is unchanged.

**Moving existing Django data:** the database columns use the same names as the Django fields, so rows can be copied table by table (Django `services_service` → `services`, `gallery_galleryimage` → `gallery_images`, `blog_blogpost` → `blog_posts`, and so on); copy the `media` folder into `UPLOAD_DIR` and run `npm run regenerate-images`. If you started fresh, ignore this.
