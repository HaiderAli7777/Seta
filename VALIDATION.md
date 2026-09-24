# Validation: EPIC DEVICES 5.2

Validation date: 24 September 2026.

## Automated (`npm test`, 16 of 16 passing)

- Catalogue: +10% pricing in paisa, catalogue scope and validation.
- Server API: health; a customer order gets a server order number and correct totals; missing phone, unknown products and far-off prices are refused or flagged; orders need an admin session and forged tokens are refused; console status changes are saved; tracking hides name, email, phone and address; catalogue edits are saved, uploaded photos become cached files and placing an order lowers stock; the website is served with Brotli compression, a page fallback and no access to source files.
- Store and console: the built site opens the store with the single-tone slider and orderable products, console.html opens the sign-in, and the service worker carries the current bundle.

## End to end in Chromium, against the real server

- A customer added a mouse, chose Lahore and Standard delivery (Rs 299), paid by cash on delivery and received order ED-5ZMLB9 for Rs 5,579.
- In a separate browser, the admin signed in to console.html with the server password and saw ED-5ZMLB9 under Orders as Processing, COD due.
- A photo uploaded in the console's product editor was stored on the server and appeared on that product's card for a different visitor.
- The hero slider moved from slide 1 to slide 2 while the cursor stayed on it.
- The product editor's category list shows Mouse, Keyboard, Headsets & Microphones, RAM and Hard Drives.
- No page errors were logged.

## Not verified here

The deployment on Hostinger itself (settings change, environment variable, data folder permissions) and delivery of WhatsApp messages. After deploying, https://epicdevicesltd.com/api/health should report `"ok":true,"admin":true`.
