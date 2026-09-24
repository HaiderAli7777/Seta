# Catalogue import status — 23 September 2026

Status: **partial, indexed snapshot**. 49 products, five categories, zero verified original product photographs. Every item is an enquiry listing; EPIC stock quantities are unknown.

The live category page returned a Cloudflare “Performing security verification” / “Verify you are human” challenge in the cloud browser. It was not solved or bypassed. Web retrieval of live detail pages returned 403. Source search results were available, generally marked crawled last week. Therefore `retrievedAt` means the date the indexed information was obtained, not the last time Czone updated a product and not a live verification date.

A separate shell download attempt did not execute because automatic approval review failed due to a usage limit. No original product photo bytes were downloaded. No alternative product photograph or AI depiction has been passed off as an exact model.

## Recorded sources

All source URLs are included per product in `src/catalog/products.json` and the audit CSV. Main references:

| Scope | Source |
| --- | --- |
| Mouse | https://www.czone.com.pk/mouse-pakistan-ppt.95.aspx |
| Selected Logitech mice | https://www.czone.com.pk/mouse-pakistan-ppt.95.aspx?sort=1 |
| Keyboard | https://www.czone.com.pk/keyboard-pakistan-ppt.162.aspx?sort=1 |
| Numeric keyboard | https://www.czone.com.pk/keyboard-pakistan-ppt.162.aspx?ppt=162&v=2 |
| K120 detail | https://czone.com.pk/keyboard-logitech-keyboards-logitech-k120-usb-keyboard-pakistan-p.384.aspx |
| Headsets | https://www.czone.com.pk/headsets-headphones-mic-pakistan-ppt.175.aspx |
| Microphones | https://www.czone.com.pk/headsets-headphones-mic-microphone-mic-pakistan-pt.681.aspx |
| Desktop DDR4 | https://www.czone.com.pk/memory-module-ram-desktop-ddr4-memory-pakistan-pt.383.aspx |
| Desktop DDR5 | https://www.czone.com.pk/memory-module-ram-desktop-ddr5-memory-pakistan-pt.129.aspx |
| External hard drives | https://www.czone.com.pk/hard-drives-external-hard-drives-pakistan-pt.178.aspx |
| Desktop hard drives | https://www.czone.com.pk/hard-drives-desktop-sata-hard-drives-pakistan-pt.94.aspx |
| Enterprise hard drives | https://www.czone.com.pk/hard-drives-enterprise-hard-drives-pakistan-pt.760.aspx |

No claim is made that these cover every page, brand, variant or subcategory. Laptop RAM, many keyboard/headset models, NAS and surveillance drives remain among the gaps. Do not mistake the numbers displayed in the new store for the size of Czone's full catalogue.

## Data decisions

- Product names are shortened, readable model labels. Specifications are concise factual entries from indexed product titles or descriptions. No extended marketing descriptions were copied.
- Unknown specifications are not invented. Missing comparison values say “Not listed”.
- The lower listed source price is used where a promotion is explicitly shown; all selling prices remain that price plus exactly 10%.
- Reviews, sales counts, fake discounts and quantities have not been generated.
- Supplier stock text is not represented as EPIC stock. Every item uses `availability: "confirm"`.
- `sourceAvailability` records an explicit source out-of-stock label where found. “Add To Cart” is not treated as proof of in-stock status because some source products are on-order only.
- Prices are calculated in integer paisa and displayed with decimals when needed. A Rs. 13,999 source price becomes Rs. 15,398.90, not Rs. 15,399.
- Original image slots are empty. The product UI uses explicitly labelled category icons. Existing campaign imagery is labelled “Collection inspiration”.

## Import contract

The importer accepts a JSON array shaped like the current `products.json`. Each product requires:

- `id`: unique lowercase alphanumeric/hyphen identifier.
- `name`, `brand`.
- `category`: exactly `mouse`, `keyboard`, `audio`, `ram` or `drives`.
- `sourcePrice`: positive numeric PKR value. Do not pre-apply the markup.
- `specs`: a nonempty array of unique `[label, value]` text pairs.
- `images`: local paths such as `./assets/products/model.webp`. Preserve the actual model and variant shown by the source.
- `sourceUrl`: an observed HTTPS Czone product or category URL; prefer a product URL when retrieved.
- `sourceKind`, `retrievedAt`, `liveVerifiedAt`, `availability`, `sourceAvailability`, `photoStatus`, `featured`.

`liveVerifiedAt` stays null until a live listing is checked. Use ISO date strings when verified.

Before marking `src/catalog/meta.json` coverage as `complete`, traverse the real pagination for each requested category and reconcile unique source product IDs/counts. Do not infer pagination offsets from indexed `?page=` snippets; their contents overlapped during this retrieval. Deduplicate variants by source identity, retain distinct colours/capacities, and report genuinely unavailable or unpriced entries separately. Never invent a price to fill a gap.
