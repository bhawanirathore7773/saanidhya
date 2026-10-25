# For developers

**Stack:** NestJS 11 (Express) · Prisma 6 (Rust-free client + MariaDB adapter, works with MySQL and MariaDB) · MySQL · Nunjucks server-side templates · Tailwind 3.4 · HTMX + Alpine (CSP build) · sharp (WebP/AVIF) · nodemailer.

The public pages are a one-to-one port of a Django site: the HTML output was compared page by page with the original and is identical (same markup, same JSON-LD, same HTMX fragments).

## Run locally
```bash
npm install
cp .env.example .env            # set DATABASE_URL, SECRET_KEY, SETUP_KEY, NODE_ENV=development
npm run db:schema               # creates the tables (or import database/schema.sql)
npm run build                   # prisma generate + compile to dist/
npm run css:build               # only after you change templates or classes
npm start                       # http://localhost:3000   (or: npm run start:dev for watch mode)
```
Open `http://localhost:3000/admin/setup/`, create the admin, then Dashboard > Add starter content.

## Layout
```
src/main.ts               bootstrap: helmet, compression, static, cookies, multipart for the admin, page cache, context
src/public/*              controllers for every public page (same URLs as before)
src/admin/*               login, CRUD engine (resources.ts + forms.ts), leads, users, bulk photo upload
src/leads/*               enquiry form, anti-spam, email + WhatsApp notification
src/common/*              presenters, SEO, JSON-LD, images (sharp), rich-text sanitising, page cache, template env
src/seed/*                starter content (seed-data.json)
views/                    Nunjucks templates (views/admin = admin UI)
public/static/            css (built), js, fonts, img (served at /static, cached for a year with ?v=hash)
prisma/schema.prisma      data model     database/schema.sql   same tables as plain SQL for phpMyAdmin
```

## Things to know
* **Template truthiness.** Django treats empty lists as false; JavaScript does not. `view.ts` rewrites every `{% if x %}` to `truthy(x)` when a template is loaded, so templates behave as designed. `{% include "x" with a=b %}` became `{% for _w in [0] %}{% set a = b %}{% include "x" %}{% endfor %}` (keeps the variables local).
* **Images.** Uploads are stored as JPEG/PNG (max 2400 px) in `UPLOAD_DIR`; `.sm/.md/.lg.webp|avif` and `.share.jpg` siblings are made in the background by `ImageQueueService` (specs in `common/images.ts`). `npm run regenerate-images` rebuilds all sizes.
* **Cache.** `PageCacheMiddleware` caches public pages in memory. The key contains `content_version` (one row in the database, bumped on every admin write). Query parameters other than `?page` and `?type` are ignored; logged-in staff and visitors who just sent an enquiry bypass it.
* **CSRF.** Double-submit cookie (`csrftoken`) checked for every POST (form field `csrfmiddlewaretoken` or header `X-CSRFToken`, which htmx sends).
* **Node versions.** Only CommonJS-compatible packages are used so the app also runs on Node 20 builds without `require(esm)`. `sanitize-html` is pinned to 2.13.1 for that reason; do not upgrade it blindly.
* **Prisma without the Rust engine.** `prisma generate` writes TypeScript into `src/generated/prisma` and `engineType = "client"` uses the bundled query compiler, so `dist/` runs anywhere with `npm install --omit=dev`.

## Change the database
1. Edit `prisma/schema.prisma`. 2. `npx prisma migrate dev --name what_changed` (needs a local database) or write the SQL by hand. 3. Update `database/schema.sql` the same way. 4. `npm run build`.

## Tests
`npm test` runs unit tests (utils, forms, rich text, SEO, template truthiness) with no database.
