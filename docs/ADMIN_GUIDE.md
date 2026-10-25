# Admin guide (for the owner)

Sign in at `https://yourdomain.com/admin/` (or your private admin address).

## Every day
* **Enquiries**: the red number on the menu is new enquiries. Open one to call or WhatsApp the person, set the status (New, Contacted, Quote sent, Booked, Lost) and write private notes. Reply fast: the first reply usually wins the booking.
* **Download CSV** on the Enquiries page gives you an Excel/Google Sheets file.

## Adding your work
| I want to ... | Go to |
|---|---|
| Add many photos at once | Gallery photos > **Upload many photos** (up to 40, any phone photo). Then add a short description to each (helps Google). |
| Show a finished event with its own page | **Projects** > Add project (cover photo required) |
| Add a YouTube video | **Videos** > paste the YouTube link |
| Add a client review | **Testimonials** (ask permission before adding a photo) |
| Add or change a service page | **Services**. The page address is made from the title. |
| Add a blog article | **Blog articles**. Use "Heading 2" for sections. Pick a future date to schedule it. |
| Add a question and answer | **FAQs**. Link it to a service or event type to show it on that page. |
| Change phone, address, rating, home page headline, hero photo | **Site settings** |

## Tips
* **Show on website** switch: hide something without deleting it. In every list, click Yes/No to flip it.
* **Display order**: type numbers in the "Order" column and press **Save display order**. Lower numbers show first.
* **Featured** items show first on the home page.
* **Search engines (optional)** box on each page: leave blank and the site writes good titles for you. Titles up to 60 characters, descriptions up to 155.
* Photos: wide, at least 1200 px, real photos of your work. Always fill "Photo description (alt text)", for example "Floral mandap with marigold at a Jaipur wedding".
* Saving a change updates the website immediately.

## Admin users and password
* **Change password** (menu) signs you out everywhere.
* **Admin users** (owners only): add a team member. "Owner" can manage users; others can edit content and enquiries.

## WhatsApp alert to your phone (optional)
The site can send you a WhatsApp message for each enquiry through the WhatsApp Cloud API (Meta). It needs a Meta business account, an approved message template with 6 variables (name, phone, event, date, city, budget), and these environment variables: `WHATSAPP_CLOUD_TOKEN`, `WHATSAPP_CLOUD_PHONE_ID`, `WHATSAPP_NOTIFY_TO` (your number), `WHATSAPP_TEMPLATE_NAME`. Email alerts work without any of this.

## If something is wrong
Open `https://yourdomain.com/healthz/`. If it says `ok`, the site is fine. Otherwise see the "Problems and fixes" table in `docs/HOSTINGER_DEPLOY.md`.
