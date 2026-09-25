# EPIC DEVICES 6.3

The online store for **epicdevicesltd.com**: storefront, checkout with delivery, and the business console, running as one Node.js app on Hostinger. Customers' orders are saved on the server and appear in the console.

## What's new in 6.3

- **Orders always reach the console.** If the site shows "Preview order" or orders don't appear in the console, the website is being published as static files without its server. 6.3 ships a PHP version of the store API (`api/index.php`) that runs on standard Hostinger hosting, so checkout saves real orders even then. The Node.js app (below) remains the best setup; either way orders land in `~/epic-data/orders.json` and show under Orders in the console.
  - **Console password on standard hosting:** in hPanel File Manager, open your home folder (the one above `public_html`/`domains`), create a folder `epic-data`, and in it a file `admin-password.txt` with your password on the first line. Username: `admin`. (With the Node.js app, keep using the `EPIC_ADMIN_PASSWORD` environment variable.)
  - Check: https://epicdevicesltd.com/api/health should show `"ok":true` and `"admin":true`.
- **Checkout:** cash on delivery only for now. Card / bank transfer is off; switch either on or off any time in the console: Settings, Checkout. The "Major cities" box and badge are gone, delivery times read naturally ("1 working day", "Same working day"), and the parcel-weight line is hidden from customers.
- **Google:** the page now carries real text (what the shop sells, every product with its price, contact details) for search engines and for anyone without JavaScript; every product and category has its own address (`/?product=k120`, `/?category=mouse`) that opens directly and works with the Back button; `sitemap.xml` lists all 55 pages; Google-sized icons (48 px and 192 px) are declared. After deploying, open [Google Search Console](https://search.google.com/search-console), add the site, submit `https://epicdevicesltd.com/sitemap.xml`, and use URL Inspection → Request indexing on the home page. Google updates the "No information is available" result and the icon on its next crawl, usually within days.
- The floating WhatsApp button no longer covers the Store console link at the bottom of the page.

## What was new in 6.2

- **Product photos fill in by themselves.** After deploying, the server downloads the main photo from each product's official manufacturer page (44 of 49 have one, listed in `src/catalog/photo-sources.json`) into `~/epic-data/media/products/`, one product at a time, starting a few seconds after it starts. It tries missing ones again once a day. Photos you upload in the console or keep in `assets/products/` always come first. Set `EPIC_PHOTO_SYNC=off` to switch this off.
- **Import a photo from any link** in the console: Products, Edit product, Display tab, Photos, "Paste an image address". In Google Images, open the photo, right-click it, choose Copy image address, paste, Import. The server keeps its own copy, so the photo doesn't break if the other site changes. Use photos you're allowed to use.
- **Brand logos** on the brand wall and product pages: files in `assets/brands/` first, otherwise the brand's official logo from Wikimedia Commons (`src/catalog/brand-logos.json`), otherwise the name in the brand's colour.
- **Frequently bought together** on every product page (for example a keyboard with an affordable mouse and headset) with one "Add all to bag" button, and a swipeable shelf of similar products.
- **Order on WhatsApp** button on every page; on a product page the message names the product and its price.
- **Search engines:** each product page gets its own title ("… | Price in Pakistan | EPIC DEVICES"), description and schema.org Product data (price in PKR, stock, brand, photo).

## What was new in 6.1

- **Marketplace home page.** Round category shortcuts, then shelves of products you can swipe (top picks, mice, audio, memory, drives, keyboards) with promotional tiles in between. Every price and range on a tile ("from Rs 5,280", "Up to 24TB") is worked out from the live catalogue. A "Do you need help?" band links WhatsApp, phone, email and order tracking; restock alerts moved into the footer.
- **Product cards** show the brand, a two-line name, the price and a full-width **Add to bag** button; offers show a discount badge such as −15%.
- **Deliver to** picker in the header sets the delivery city used for shipping estimates (now Lahore by default, same delivery zone as before).
- **Phones** get an app-style tab bar (Home, Categories, Search, Bag, Account) and a shorter hero.
- **Console dashboard:** fast-moving items (units sold, weekly rate, days of stock left, reorder flag), slow-moving items (idle stock and how much cash it ties up, when each last sold) and a **vendor scorecard** (sell-through of what each supplier delivered, faulty or returned units, credit terms). All follow the dashboard's date range.
- **Product photos from official pages.** `src/catalog/photo-sources.json` lists the manufacturer's page for 44 of the 49 products. On your own computer run `npm run photos:fetch`: it downloads each page's main product image into `assets/products/` and writes `reports/photo-fetch.csv`. Check the photos (model and colour), then push. The other 5 (Rapoo H102, A4Tech HS-8i, HU-8, FH100U, Amaze A680) have no official page; ask your distributor for those.

## What was new in 6.0: the storefront redesign

Checkout, orders, the console and deployment work exactly as in 5.2. Only what customers see has changed, plus a few storefront bugs found along the way.

- **New look.** A single cobalt hero stage with wide display type, a graphite header bar and footer, and one blue accent throughout. The design layer lives in `src/revamp.css` and loads last.
- **Header.** Search sits in the middle with suggestions; every category is one click away in the nav bar, which highlights the page you're on (and scrolls to it on phones).
- **Home page.** Trust strip (cash on delivery, nationwide delivery, genuine stock, returns), a category showcase, a mixed "picked for you" shelf, shop by budget, the product finder, a brand wall and a restock/WhatsApp contact block.
- **Product cards and pages without photos** now show the brand, the category icon and key specs (for example "1200 DPI · Silent") instead of a lone icon. Empty star ratings, "0 month warranty" and empty filter groups are hidden until there is real data.
- **Fixed:** the home page's category section was empty (it looked for categories from an older catalogue); the shop sidebar's category filter did nothing with the current flat categories; the mobile menu, B2B enquiry form, bulk "move to category" and promotion category pickers had empty category lists.

## What was new in 5.2

- **The full store structure is back**: Track order, My orders, B2B and wholesale, categories, new arrivals, offers, wishlist, cart, checkout, order confirmation and the complete console, in the new logo and single brand theme.
- **Checkout with delivery.** Customers enter their details, city and delivery address, choose a delivery speed (Standard, Express, or Same-day in major cities) priced by city zone, and pay by cash on delivery or card/bank transfer.
- **Orders reach the console.** `server.js` stores every order. The console shows it under Orders straight away; status changes are saved; orders placed while the console is open appear within a minute. Customers can track an order by its number (for example `ED-5ZMLB9`) without seeing anyone's personal details.
- **Product photos from the console.** Products, Edit product, Display tab, Photos. The photo is saved on the server and every customer sees it.
- **Single-tone slider** that keeps playing when the cursor is on it (the pause button still stops it).
- **Products can be bought**: each starts with 50 in stock until you enter real stock in the console. The product editor's category list works again.

## Deploy on Hostinger (one-time settings change)

A plain static site cannot receive orders, so the app now runs as a small Node.js server. Change the web app's settings once:

1. Unzip the package. In your local copy of the repository, delete everything except the hidden `.git` folder, copy in all files from the package (including `.gitignore`), then commit and push to `main`.
2. In hPanel open the web app for epicdevicesltd.com, then **Settings**, **Build configuration**:

| Setting | Value |
| --- | --- |
| Framework preset | Other (or Express if Other is not listed) |
| Branch | main |
| Node version | 22.x |
| Root directory | `./` |
| Build command | `npm run build` |
| Entry file | `server.js` |
| Output directory | leave empty if the field is still shown |

3. Open **Environment variables** in the web app's sidebar and add `EPIC_ADMIN_PASSWORD` with a strong password of your own. This is the console password; the username is `admin`. Optional: `EPIC_ADMIN_USER` for a different username, `EPIC_DATA_DIR` for a different data folder.
4. **Save and redeploy.** Then open https://epicdevicesltd.com/api/health. It should show `"ok":true` and `"admin":true`.
5. Sign in at https://epicdevicesltd.com/console.html with `admin` and your password.

If the app is left on the React preset it still works as a static site, but checkout cannot reach the server; customers are then offered WhatsApp to send their order instead, so nothing is lost. If the site shows an error after deploying, open **Runtime logs** in hPanel; a missing `EPIC_ADMIN_PASSWORD` only disables console sign-in, it does not stop the store.

## Where the shop's data lives

Everything the server keeps is in `~/epic-data` on your hosting account, outside the deployed files, so redeploys never touch it:

- `state.json`: the catalogue, categories, offers and settings saved from the console
- `orders.json`: every order, plus a daily copy `orders-backup-YYYY-MM-DD.json`
- `media/`: photos uploaded in the console
- `secret.key`: signs console sessions (delete it to sign everyone out)

Download the folder from File Manager now and then as a backup.

## Before taking real orders, check in the console

- **Settings, Delivery**: zones, delivery rates and courier details. The rates are starting values (for example Rs 299 standard delivery in major cities), not your agreed courier prices, and the courier contact fields are empty for you to fill in.
- **Products**: real stock (each starts at 50), prices and photos.
- **Store details**: phone, email and address shown to customers.

The console saves the catalogue, categories, offers, settings and orders to the server. Its other tools (returns, purchasing, accounting, payroll and so on) still keep their records in the browser session only.

## Product photos

Use photos you are allowed to use: your own pictures of the stock, the manufacturer's official images, or images your distributor supplies. Two ways to add them:

1. **Console (easiest):** Products, Edit product, Display tab, Photos. Saved on the server at once.
2. **Repository:** save `assets/products/{product id}.jpg` and push; the build trims, centres and optimises it. `assets/products/README.txt` lists all product ids.

## Working on the code

```bash
npm ci
EPIC_ADMIN_PASSWORD=choose-one npm run dev   # builds, then serves http://localhost:3000
npm test                                     # 16 tests: catalogue, server API, store and console
```

On Windows PowerShell use `$env:EPIC_ADMIN_PASSWORD="choose-one"; npm run dev`.

## Catalogue and pricing

49 products across Mouse (12), Keyboard (3), Headsets and microphones (13), RAM (10) and Hard drives (11), taken from indexed Czone listings on 23 September 2026. Built-in selling prices are the Czone source price x 1.10, calculated in paisa; prices edited in the console take over from then on. See `CATALOGUE-STATUS.md` and `reports/catalog-price-audit.csv`.

## Files

```
server.js                    Node server: website, catalogue and settings, orders, tracking, photos
src/app.jsx                  storefront and console (one app)
src/brand-hero.jsx           cobalt hero slider
src/storefront.jsx           header, home sections, footer
src/revamp.css               storefront design layer (loaded last)
src/main.jsx                 opens the store on index.html and the console on console.html
src/catalog/                 the 49 products, pricing rules and category setup
assets/                      logo files, slides, fonts, artwork, product photos
build.mjs                    builds everything into dist/ and checks nothing is missing
tests/                       catalogue, server API, store and console tests
```

Author: Haider Ali.
