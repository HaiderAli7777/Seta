# Artwork, logo, photos and fonts (5.1)

## Logo

`assets/brand/epic-logo-original.png` is the logo file supplied by Haider Ali. It was traced into vector paths (potrace on a 6x upsampled, colour-separated copy) so it stays sharp at every size:

| File | Use |
| --- | --- |
| `epic-lockup.svg` | Header: the ED mark beside EPIC / DEVICES |
| `epic-logo-stacked.svg` | Footer: mark above the wordmark |
| `epic-logo-full.svg` | Complete logo with the product icons and tagline, for print |
| `epic-mark.svg` | ED mark alone; `-light` versions have a white D for dark backgrounds |
| `epic-e-shape.svg` | The E alone in white, used as the slider watermark |
| `favicon.svg`, `favicon-32.png`, `/favicon.ico` | Browser tab icons (the SVG adapts to dark browser themes) |
| `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | Home-screen icons listed in `site.webmanifest` |
| `og-image.jpg` | 1200 x 630 preview shown when the site link is shared |

Brand colours measured from the logo: E gradient #0968FD (top) to #0032A5 (base), interface blue #0B5CE6, graphite #17202A.

## Slider products

`assets/slides/slide-keyboard`, `slide-mouse` and `slide-headphones` come from `assets/epic-collections.webp`, the unbranded concept photograph atlas generated for version 4. Each product was upscaled 2x with an EDSR super-resolution model and turned into a transparent cutout whose opacity follows the product's shading. Placed on the slider's blue backdrop, the product takes on the backdrop's tone, which is what keeps every slide in one colour. They are illustrations of the categories, not photographs of specific catalogue items.

Original atlas prompt (version 4):

> Create a 1536x1024 premium electronics category-art sprite atlas. Exactly six equal square cells in a three-column, two-row grid; no lines, labels or text. Identical pale cool gray backgrounds, natural contact shadows and soft studio light. Unbranded generic devices, fully contained within their cells, with generous padding. Top left: partly open silver laptop. Top center: graphite over-ear headphones. Top right: compact black mechanical keyboard viewed diagonally from above. Bottom left: graphite ergonomic mouse. Bottom center: black two-port USB-C charging brick. Bottom right: brushed silver USB-C hub with short cable. Photorealistic gray, black and silver materials. No brand names, logos or neon illustration style.

## Fonts

Saira (variable weight and width, trimmed to weights 500 to 800 and widths 100 to 125 percent) and Plus Jakarta Sans (variable weight), both under the SIL Open Font License; licence texts are in `assets/fonts/`. They are declared once in the page head as "Epic Display" and "Epic Text" and shared by the storefront and the console.

## Product photos and brand logos (5.1)

Photos and logos come only from files kept in the repository (`assets/products/` and `assets/brands/`), supplied by the store owner from sources he is allowed to use: his own photographs, manufacturers' official press or partner material, or distributor catalogues. Nothing is downloaded from other websites during the build. `scripts/product-photos.mjs` trims each photo, centres it on white with even padding and writes square WebP files at 480 and 960 px; logos are copied (SVG, with a size added when the file only has a viewBox) or resized to 96 px high WebP. Output names include a content hash.

Brand names and logos are trademarks of their owners and are shown only to identify the products the store sells.

## Product photos added in 6.2

Five photos in `assets/products/` were cropped by the store owner's request from Google Images results he supplied as screenshots on 24 September 2026, with the light-grey backdrop cleaned to white:

| File | Product | Listing the photo came from |
| --- | --- | --- |
| op330s.png | A4Tech OP-330S | A4Tech's own store listing |
| op720s.png | A4Tech OP-720S | A4Tech's own store listing |
| h111.png | Logitech H111 | PakDukaan listing (Logitech product shot) |
| maono-t1.png | MAONO Wave T1 Mini (USB-C) | Computer Zone listing (MAONO product shot) |
| lexar-ddr4-8.png | Lexar 8GB DDR4 | Junaid Tech listing (Lexar product shot) |

They are small (about 350 px) because they come from search thumbnails. Replace them with the brands' full-size official images when you can: `npm run photos:fetch`, the console's Import field, or files from your distributor.
