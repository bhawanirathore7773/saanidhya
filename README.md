# Saanidhya Events website (NestJS + Prisma + MySQL)

Wedding, event and decoration company website: fast server-rendered pages, photo gallery, videos, blog, FAQs, quote/enquiry form with email + WhatsApp alerts, and a full admin panel. Built to run on **Hostinger Node.js hosting** with a MySQL database.

* **Deploy:** `docs/HOSTINGER_DEPLOY.md` (step by step, no command line needed)
* **Owner's manual:** `docs/ADMIN_GUIDE.md`
* **Developers:** `docs/DEVELOPMENT.md`
* Environment variables: `.env.example`
* Database tables: `database/schema.sql` (import in phpMyAdmin)
* What changed from the Django version: `docs/FROM_DJANGO.md`

Quick start on Hostinger: import `database/schema.sql` > create a Node.js app (entry file `server.js`, Node 22) > add the environment variables > NPM install > Start > open `/admin/setup/`.

What is inside: public pages (home, services, packages, portfolio, videos, testimonials, blog, FAQ, about, contact, privacy, terms), `sitemap.xml`, `robots.txt`, `healthz`, JSON-LD schema, AVIF/WebP images, HTMX filters and "load more", whole-page cache, spam-protected enquiry form, and an admin for everything (services, event types, projects, photos with bulk upload, videos, articles, testimonials, FAQs, enquiries, site settings, admin users).
