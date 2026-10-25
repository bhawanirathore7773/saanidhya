# Saanidhya Events website (NestJS + Prisma + MySQL)

Wedding, event and decoration company website: fast server-rendered pages, photo gallery, videos, blog, FAQs, quote/enquiry form, and an admin panel. Built for Hostinger Node.js hosting with a MySQL/MariaDB database.

## Deployment

- Hostinger deployment instructions: [docs/HOSTINGER_DEPLOY.md](docs/HOSTINGER_DEPLOY.md)
- Owner's manual: [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md)
- Developer setup: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- Environment-variable template: [.env.example](.env.example)
- Database schema: [database/schema.sql](database/schema.sql)
- Legacy migration notes: [docs/FROM_DJANGO.md](docs/FROM_DJANGO.md)

## Hostinger preflight

Before going live, verify that `views/` contains all Nunjucks page and admin templates. The runtime loads templates from this directory. The tracked repository bundle must also contain `dist/main.js`, `src/generated/prisma/`, `public/static/`, `server.js`, and `database/schema.sql`.

Run the preflight with the required environment variables present:

```bash
npm run healthcheck
```

It checks required deployment paths and environment variable presence without printing secret values. It does not verify live database credentials; use `/healthz/` after starting the app for that.

## Quick start

1. Create/import the database from `database/schema.sql`.
2. Create a Hostinger Node.js app using Node 22 and startup file `server.js`.
3. Add private environment variables from `.env.example` in hPanel.
4. Install dependencies and start/restart the app.
5. Verify `/healthz/`, the home page, admin and enquiry flow before publishing.

**Current deployment blocker:** confirm and restore the missing `views/` templates in the Git repository before considering the build production-ready. A successful process start alone is not proof that pages render correctly.
