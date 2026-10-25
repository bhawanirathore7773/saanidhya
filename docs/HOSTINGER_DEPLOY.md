# Deploy on Hostinger (Node.js + MySQL)

This is the complete guide. Time needed: about 30 minutes. No command line is needed (SSH is optional).

> **Plan check.** You need a Hostinger **web hosting** plan that has **Node.js Apps** (hPanel > Websites > Add website > "Node.js Apps"), normally Business or Cloud. If your hPanel has no Node.js option, upgrade the plan or ask Hostinger support. The old Premium shared plan does not run Node.js apps.

## What you will need
| Item | Where |
|---|---|
| Hostinger plan with Node.js Apps | hPanel |
| Your domain pointing to Hostinger | hPanel > Domains |
| This project's zip: `saanidhya-nestjs-hostinger.zip` | from me |

## Step 1. Create the MySQL database
1. hPanel > **Databases > MySQL Databases** > create a database, a user and a password.
2. Write down: **database name**, **user name**, **password**. The host is `localhost`.
3. Open **phpMyAdmin** for that database > **Import** > choose `database/schema.sql` from the zip (unzip the zip into a new folder on your computer first) > **Go**.
   You should now see 12 tables (`services`, `leads`, `gallery_images` ...). It is safe to import again; it never deletes anything.

## Step 2. Create the Node.js app
1. hPanel > **Websites > Add website > Node.js Apps**, choose your domain.
2. Choose **Upload your website files** (or "Import from zip") and upload the project zip. The files must end up directly in the app folder: you should see `server.js` and `package.json` there, not inside another folder. (The zip is made so that its files sit at the top level.)
3. Settings:
   * **Node.js version:** 22 (20 also works).
   * **Entry file / startup file:** `server.js`
   * **Install command:** `npm install --omit=dev`  (a plain `npm install` also works)
   * **Build command:** leave empty, or `npm run build` (it safely does nothing, because the app is already built).
   * **Start command (if asked):** `npm start`

## Step 3. Environment variables
In the same Node.js screen open **Environment variables** and add these (full list with explanations: `.env.example`):

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `SITE_URL` | `https://yourdomain.com` (no slash at the end) |
| `SECRET_KEY` | a long random text, 60+ characters |
| `DATABASE_URL` | `mysql://DB_USER:DB_PASSWORD@localhost:3306/DB_NAME` |
| `SETUP_KEY` | any long secret text (used once, in Step 5) |
| `UPLOAD_DIR` | a folder **outside** the app folder, e.g. `/home/u123456789/saanidhya-uploads` |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` | your Hostinger email (e.g. `smtp.hostinger.com`, port `465`) |

* If the database password has special characters (`@ : / # ?`), write each as its %-code, for example `@` becomes `%40`.
* `UPLOAD_DIR` matters: your photos live there. If you keep them inside the app folder, re-uploading a new version of the app could erase them. Find your home path in File Manager (the folder above `public_html`/the app folder).
* You do not set `PORT`. Hostinger does it.

## Step 4. Install and start
1. Press **NPM install** (or Install), wait until it finishes, then **Start / Restart**.
2. Open `https://yourdomain.com/healthz/`. You should see `{"status":"ok","database":"ok","cache":"ok"}`.
   * `"database":"error"` means `DATABASE_URL` is wrong or the tables were not imported (Step 1).
3. Open `https://yourdomain.com/`. The site opens (empty, until Step 5).

## Step 5. Create your admin login and add content
1. Open `https://yourdomain.com/admin/setup/`. Enter the **Setup key** (your `SETUP_KEY`), your name, email and a password (10+ characters). This page works once.
2. You land in **Site settings**. Fill in phone, WhatsApp number, email, address, map link, social links, your Google rating and the hero photo. Save.
3. Go to **Dashboard > Add starter content**. This adds ready-made services, FAQs and two guides for your city. Edit them to match your real offers and prices.
4. Add your real work: **Gallery photos > Upload many photos**, **Projects**, **Videos** (paste a YouTube link), **Testimonials**.
5. Remove `SETUP_KEY` from the environment variables if you wish (the setup page is already closed).

Everything you save appears on the website at once. No restart needed.

## Step 6. HTTPS, www and email
* hPanel > **SSL**: make sure the free SSL is active for the domain, and turn on **Force HTTPS**.
* Decide one address (`yourdomain.com` or `www.yourdomain.com`), put the same one in `SITE_URL`, and redirect the other to it (hPanel > Domains > Redirects).
* Send a test enquiry from the website. You should get an email within a minute. If not, open **Admin > Enquiries > the enquiry > "Send the notification again"**: the error message tells you what is wrong (usually a wrong email password or port).

## Step 7. After launch (first week)
1. **Google Search Console**: add the domain, submit `https://yourdomain.com/sitemap.xml`. Put the verification code in Admin > Site settings.
2. **Google Business Profile**: same name, address and phone as in Site settings.
3. Test the pages on PageSpeed Insights (mobile).
4. After 3-4 days of working HTTPS, set `HSTS_SECONDS=31536000` and restart.
5. Change the admin address: set `ADMIN_URL=manage-xyz/` (any private word, keep the slash) and restart. Your admin is then at `/manage-xyz/`.

## Updating the website later
1. Take the new zip. Upload and overwrite the files in the app folder. Do **not** delete `.env` (if you use one) and do not touch your `UPLOAD_DIR`.
2. Press **NPM install**, then **Restart**.
3. If the new version changes the database, the release note says so and gives a small `.sql` file to import in phpMyAdmin.

## Backups
* hPanel > **Backups**: keep automatic backups on.
* Monthly: phpMyAdmin > **Export** (the whole database) and download the `UPLOAD_DIR` folder (photos). Keep both on your computer or Google Drive.
* To restore: import the `.sql` in phpMyAdmin and copy the photos back to `UPLOAD_DIR`.

## Problems and fixes
| What you see | Reason and fix |
|---|---|
| App does not start | Hostinger log (Node.js > Logs). Usual cause: `SECRET_KEY` or `DATABASE_URL` missing/wrong. |
| `/healthz/` shows `"database":"error"` | Wrong database name/user/password in `DATABASE_URL`, or tables not imported. Special characters in the password need %-codes. |
| Pages work but photos are broken | `UPLOAD_DIR` folder missing or not writable. Create it in File Manager and restart. |
| "Cannot find module" on start | NPM install did not finish or used a different Node version. Choose Node 22, run NPM install again. |
| Admin says "Setup key is not correct" | `SETUP_KEY` in the environment must match what you typed; restart after changing variables. |
| Admin address not found | The address is `ADMIN_URL` (default `/admin/`). |
| No enquiry emails | Check the SMTP values. Hostinger mail: host `smtp.hostinger.com`, port `465`, your full email as user. |
| Photo upload says "too large" | 25 MB per photo, 40 photos at a time. |
| Changes do not show | Hard-refresh the browser. The site refreshes its own cache after every save. If you use Cloudflare, turn off "Cache Everything" for HTML. |
| Site is slow right after a restart | Normal for the first visit to each page (it fills the page cache). |

## Good to know
* The site keeps a page cache in memory. Saving anything in the admin refreshes it. If the host runs more than one copy of the app, they stay in sync within about 3 seconds.
* Photos are resized to WebP and AVIF by the server in the background. A new photo appears on the website straight away and gets its fast web sizes about a minute later.
* New enquiries are saved in the database first, then emailed. If the mail server is down, the app retries every 10 minutes for 2 days, and the admin shows a "notify failed" tag.
