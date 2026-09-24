# EPIC DEVICES 5.2

The online store for **epicdevicesltd.com**: storefront, checkout with delivery, and the business console, running as one Node.js app on Hostinger. Customers' orders are saved on the server and appear in the console.

## What's new in 5.2

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
src/brand-hero.jsx           single-tone hero slider
src/main.jsx                 opens the store on index.html and the console on console.html
src/catalog/                 the 49 products, pricing rules and category setup
assets/                      logo files, slides, fonts, artwork, product photos
build.mjs                    builds everything into dist/ and checks nothing is missing
tests/                       catalogue, server API, store and console tests
```

Author: Haider Ali.
