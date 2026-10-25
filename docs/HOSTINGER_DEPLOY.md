# Hostinger deployment (Node.js + Prisma + MySQL/MariaDB)

This is a server-rendered NestJS application, not a static-only website. Use Hostinger's Node.js Apps feature and a MySQL/MariaDB database.

## Before deployment

1. Confirm your hPanel plan exposes **Node.js Apps**. If it does not, contact Hostinger or use a plan that supports Node.js applications.
2. Use Node.js 22 (the project requires Node 20.9+).
3. Back up your database and uploaded photos before replacing an existing installation.
4. Deploy the contents of the repository at the application root. Do not put the files inside another nested folder.

## 1. Create the database

In hPanel, create a MySQL database and user, then use phpMyAdmin's **Import** feature to import `database/schema.sql`. Import into the intended database only. Do not import into a live database without a backup and understanding the schema changes.

This SQL file creates tables; it is not a data backup. Existing content from an older database must be exported and imported separately.

## 2. Create the Node.js app

In hPanel, create a Node.js application for your domain and set:

- **Node version:** 22
- **Startup / entry file:** `server.js`
- **Start command:** `npm start` (where configurable)
- **Install command:** `npm install --omit=dev` for a prebuilt bundle, if supported by the selected workflow; otherwise use `npm install`.
- **Build command:** leave blank for a prebuilt deployment, or use `npm run build` only when devDependencies are installed.

The production build script validates the prebuilt bundle instead of trying to compile on a shared server without build tools. It fails clearly when required runtime files are missing.

## 3. Configure environment variables

Add these through hPanel's **Node.js App > Environment variables**. Use values shown by your hosting panel, not placeholders.

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | Yes | `production` |
| `SITE_URL` | Yes | Final canonical HTTPS domain, no trailing slash |
| `SECRET_KEY` | Yes | Generate a long unique random value; never commit it |
| `DATABASE_URL` | Yes | `mysql://USER:PASSWORD@HOST:3306/DB_NAME`; use the actual DB host from Hostinger |
| `SETUP_KEY` | First admin only | Long one-time secret; remove after admin creation |
| `UPLOAD_DIR` | Recommended | Writable absolute folder outside the application release directory |
| `ADMIN_URL` | Optional | Admin path, defaults to `admin/` |
| `EMAIL_HOST` | For email | SMTP host supplied by your email provider |
| `EMAIL_PORT` | For email | Match the provider's SMTP security settings |
| `EMAIL_HOST_USER` | For email | Full mailbox address |
| `EMAIL_HOST_PASSWORD` | For email | Mailbox/app password; never place it in Git |
| `EMAIL_USE_TLS` | For email | Follow provider's port/security guidance |
| `DEFAULT_FROM_EMAIL` | For email | Sender allowed by the SMTP account |
| `TRUST_PROXY` | Optional | Only trust the number of proxies in your deployment path |
| `PAGE_CACHE_ENABLED` | Optional | Usually `true` |

**Database password encoding:** percent-encode reserved characters in the username/password portion of `DATABASE_URL` (for example, `@` becomes `%40`). Do not encode the whole URL.

**Uploads:** create the upload directory in File Manager, ensure the Node app user can write to it, and set `UPLOAD_DIR` to its absolute path. Keep uploads outside a directory replaced during deployment.

**Secrets:** do not paste actual credentials into GitHub, code, or deployment documentation. Do not copy production `.env` into `public_html`.

## 4. Start the app

1. Install dependencies using Hostinger's installer.
2. Start/restart the app.
3. Check `https://your-domain.example/healthz/`. Expected response when configured: `{"status":"ok","database":"ok","cache":"ok"}`.
4. Open the home page and test a public page, photo, enquiry form, login, and admin page.

A running indicator alone does not verify the database connection or schema. HTTP 503 or `database:error` means the DB must be checked before launch.

## 5. Create the first administrator

Open `/admin/setup/` and use the exact `SETUP_KEY` environment value. Create an admin with a unique password. Then remove `SETUP_KEY` from hosting environment variables and restart, provided the setup flow is complete.

If required by the installed version, add starter content in the admin panel. Verify all contact details, service descriptions, service areas and prices are accurate.

## 6. Smoke test

- [ ] Homepage and service detail pages load.
- [ ] `/healthz/` reports database OK.
- [ ] `/robots.txt` and `/sitemap.xml` use the canonical HTTPS hostname.
- [ ] Static CSS/JS/fonts load.
- [ ] Existing uploads remain after a restart.
- [ ] Admin login, create/edit content and logout work.
- [ ] Test enquiry is saved in MySQL.
- [ ] Email alerts work, or failures are visible to the admin.
- [ ] HTTPS is active and www/non-www redirects to one chosen hostname.
- [ ] Database and upload backups exist before updating.

## Updating later

1. Back up the current database and upload directory.
2. Upload the new deployment bundle or check out the intended release.
3. Do not overwrite environment variables or `UPLOAD_DIR`.
4. Apply documented schema migrations/SQL before code requiring them.
5. Restart and repeat the smoke tests.

## Troubleshooting

- **Missing module or dist entry:** bundle may be nested or incomplete. Ensure `server.js`, `package.json`, `dist/main.js`, `views/` and `public/static/` are at the app root.
- **Database error:** check database name, user grants, host, password encoding, and whether SQL was imported into that database.
- **Upload fails / photos break:** check that `UPLOAD_DIR` exists, is writable, and old uploads were preserved.
- **Email fails:** verify SMTP host, port, TLS mode, mailbox/password, and permitted sender.
- **Stale pages:** check app cache settings and any CDN HTML caching rules.
