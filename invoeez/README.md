# InvoEez — Invoice Made Easy (3.4)

Version 3.3 is the customer-ready build: it opens as a clean company with a full chart of accounts and product categories, and guides the customer through entering their own data, including Excel import and opening balances.

## Open the application

Extract the ZIP and open **invoeez.html** in Chrome or Edge. It contains the application, fonts, icons and the PDF/Excel helpers. Running the application does not require npm, a build step, or an internet connection. External sending/provider integrations retain their original connection requirements.

## What a new customer sees

The file opens as a **clean company** ("My Company") with everything set up but no transactions:

- **Chart of accounts:** 65 accounts — banks and cash, receivables, PDCs, deposits, inventory, VAT input/output, fixed assets and depreciation, payables, accruals, salaries, corporate tax, gratuity, loan, capital, retained earnings, 3900 Opening Balance Equity, four revenue lines, cost of sales and 30 expense accounts.
- **Product categories:** 27, each with revenue, cost, inventory and adjustment accounts.
- **Expense items** (rent, utilities, telecom, freight, insurance, …) and payment methods.

Then the **Setup guide** (Workspace › Setup guide) walks through company details, products, customers, vendors, opening balances, the first invoice and a backup, with Excel/CSV import and an opening-balances screen. Books left in the browser by the old built-in demo or an earlier sample build are replaced by a clean company automatically; real company books are kept.

## Upgrade existing data

Books saved by 3.2 open unchanged in 3.3. Customers, vendors and products that earlier versions kept in code are copied into the books on first load (schema 5), so they keep their names and history and can now be edited or deleted like any other record.

1. Open your old application and download a books backup from Settings or the user menu.
2. Keep that backup and your original HTML file until you have checked the upgrade.
3. Replace the hosted HTML at the same website address, or open the new local HTML.
4. Existing books saved in the same browser storage are migrated automatically. If the new file opens the demo company, restore the backup through Settings. The included `mizan.html` compatibility entry can replace a previous file at its existing path, while displaying the Invoeez branding.
5. Check a familiar invoice, the trial balance, and the stock report before continuing normal entry.

The existing `mizan.books.v2` storage key is retained. The additive schema migration adds categories, salespeople, price lists and stock operations. It captures the accounts on existing posted document lines before enabling category inheritance. Legacy custom product account combinations are preserved through corresponding categories. Version 3.1 removes Discount Master and its customer/document assignments. Existing document line discounts and totals are retained unchanged; old master definitions are kept only in an inactive backup archive field.

Company profile, theme, user selection and connection settings use their existing browser keys. The original books backup format does not transfer these separate preferences. Re-enter the company profile and integration settings if moving to another browser or origin.

## What changed in 3.3

| Area | New behavior |
| --- | --- |
| Sample company | A generated year of realistic trading (see above) replaces the small fixed demo. **Load sample company** brings it back at any time. |
| Start my company | Clears the sample in two steps, keeps the setup, sets the company profile and makes you the administrator. |
| Setup guide | A new Workspace page with nine steps, live progress, import tools and templates. The dashboard shows the next step. |
| Excel / CSV import | Products & services and customers & vendors, with templates, flexible column names, comma/semicolon CSV, row-by-row checks, update-or-skip for existing records, new categories, opening stock and opening balances. |
| Opening balances | Bank and cash, receivables, payables and stock on a start date, against 3900 Opening Balance Equity. |
| Master data in the books | Every customer, vendor and product can be edited and, when unused, deleted. Unused accounts can be deleted unless a category, payment method or asset uses them; renaming an account now works. |
| Safer documents | A new invoice, bill or quotation starts with no customer/vendor selected and the search focused, plus one blank line, so nothing is posted to the wrong party by default. |
| Document lists | **Unpaid** and **Overdue** filters on invoices and bills, compact rows with an overdue badge, and the first 100 rows shown with **Show more**. |
| Readability | Slightly larger table, form and navigation text; category cards show account names, not just codes; dashboard comparisons are hidden when the earlier period predates the books. |
| Empty company | Payments, expenses, customers and products work and explain the next step when nothing has been entered yet. |

## Features from 3.0 – 3.2

| Area | Behavior |
| --- | --- |
| Dashboard | Emerald and mint visual design, cash balance, revenue/cost/profit/inventory cards, interactive trends and period shortcuts, Collect/Pay priorities, draft and stock actions, recent transactions, customer and product rankings, and cash movement excluding internal bank transfers. The original detailed financial dashboard remains under **Financial detail**. |
| Navigation | Searchable, collapsible sections for Master data, Sales, Purchases, Stock management, Accounting & banking, Financial reports, Compliance, and Settings & tools. |
| Customer/vendor creation | Search on the invoice or bill and choose **Create**. Complete the form and use **Save & select** without leaving the transaction. |
| Product creation | Create a product from the product search on any invoice or bill line. The new record is selected immediately. |
| Line layouts | **Compact** puts product, stock and essential pricing inputs in an efficient workspace. **Description** expands the description field for a line; **Detailed** shows descriptions on every line. Accounts stay hidden until **Show accounts** is selected. The selected layout is remembered. |
| New lines | Every added line starts with no product. Description, price, VAT and default accounts fill after selection. Incomplete lines cannot be posted. |
| Search | Case-insensitive, multi-word search across product names, codes/SKUs, internal IDs, barcodes, brands, categories and packing. Exact identifiers rank first in product pickers. Keyboard arrows and Enter select results. |
| Global search | Use Ctrl+K or Cmd+K to find products, documents, partners, accounts and screens. Product identifiers also find documents containing the product. |
| Stock on documents | Goods lines always display current on-hand quantity and unit of measure on both invoices and bills; no toggle is required. Services are identified separately. |
| Account visibility | **Show accounts** reveals the existing account controls on every product line; **Hide accounts** collapses them. Editable draft invoice and service-bill accounts can be changed or reset to their category default. Goods-bill inventory accounts continue to come from the product category. This is independent of cost visibility and line layout. |
| Cost visibility | **Show cost** reveals standard cost, current stock cost and estimated sales margin on the current document. |
| Journal layout | A separate **Journal entry** tab shows the draft preview or posted entry; it no longer competes with the invoice lines for horizontal space. |
| Line navigation | **Add line** inserts a blank line, scrolls it into view and focuses its product search. A bottom action bar keeps Add line, totals and Save draft accessible. |
| Page navigation | Opening another section, a document or the document list starts at the top. |
| Product history | View the last posted sale to the selected customer or purchase from the selected vendor. Open history for date, document, quantity, price, discount and net price; switch between the selected partner and all partners. **Use price** copies the historical price and discount into an editable line. |
| Product catalog | Switch between product cards and the operational table. Search or scan identifiers; filter by category, goods/services and low stock. Open a product for its sales/purchase history. |
| Product form | Product code/SKU, unique barcode, internal ID, brand, category, packing, unit, price, cost, tax and low-stock threshold. Product details include sales and purchase history. |
| Category accounts | Configure revenue, cost/expense, inventory and adjustment/scrap accounts on each category. Products inherit them for new postings. Posted document account mappings remain unchanged. |
| Salesperson | Manage the sales team and assign a salesperson to a customer. New customer selections copy the assignment to the invoice, where it can be changed. |
| Physical counts | Enter actual counted quantities, a date and reason. Posting creates an auditable stock adjustment and its balanced journal. Zero is a valid physical count; blank means not counted. |
| Scrap | Record damaged quantities with a reason. Scrap reduces stock at carrying cost and charges the category adjustment account. Quantities cannot exceed on-hand stock. |
| Price lists | Sales and purchase lists with product/category/all-item scope, minimum quantity tiers, fixed prices or percentage reductions, active status, and validity dates. A live **Test your price** panel checks the effective rate for a product, date and quantity before saving. |
| Layout | Responsive desktop, tablet and mobile views, light/dark themes, improved form labels, keyboard-accessible search, and reduced-motion support. |

## Pricing behavior

- Price lists use the document date and each line's quantity.
- A product-specific rule takes precedence over a category rule; a category rule takes precedence over an all-products rule.
- Within the same scope, the highest eligible minimum quantity wins.
- A percentage price-list rule reduces the product's sales price, or its default cost for purchases.
- Manual line discounts remain available; there is no Discount Master.
- Selecting a different partner or price list refreshes line pricing. **Reapply pricing** explicitly refreshes all lines.
- A manually entered unit price is retained when the quantity changes. **Reapply pricing** resets the manual unit-price override.
- Manual line discounts remain unchanged when quantity, partner, date or price list changes, or when pricing is reapplied. Quantity tiers continue to work when only the discount was edited.
- Selecting another product resets its line discount to zero. Applying a historical price copies both its price and discount.
- Existing posted documents are not repriced by changes to master data.
- Historical unit prices exclude VAT. Stock-cost and margin figures are current estimates, not a reconstruction of historical profitability.

## Inventory and accounting behavior

The original invoice/bill-driven perpetual inventory model is retained. There is one stock pool per product, with no new warehouse reservations or picking workflow. “Available stock” refers to current on-hand quantity; packing is descriptive and does not multiply quantities.

Stock counts and scrap join the chronological ledger replay and appear in stock movements, valuation, journals and financial reports. AVCO, FIFO and standard costing options are retained.

A count records expected quantity, counted quantity and the posted difference. A positive difference increases inventory against the category adjustment account. A negative difference or scrap reduces inventory and charges that account.

To preserve count history, an adjustment cannot predate the latest movement of a selected product. A backdated document cannot be posted before a later stock adjustment affecting the same product, and a posted document cannot be reset to draft if a subsequent stock adjustment depends on it. Use a current correcting document or a return in that case.

The inventory account and product type cannot be changed while affected products hold quantity or inventory value. Revenue and expense account updates apply to new postings. Explicit invoice/service account overrides remain available.

## Features retained

Quotations and conversion, invoices and bills, credit/debit notes, duplication, reset-to-draft where permitted, receipts and payments, banking, payment methods, expenses, assets, manual journals, chart of accounts, partner records, company settings, user-role screens, costing methods, backup/restore, print/PDF and existing Excel/report exports remain in the application.

Reports retained: profit and loss, balance sheet, trial balance, general ledger, partner ledger, customer statements, aged receivables/payables, payment-method analysis, product/customer profitability, inventory valuation and VAT return. The original FTA/e-invoicing screens and provider configuration remain available.

## Hosting and source

For a static host, upload **dist/index.html** as the website entry point, or rename a copy of **invoeez.html** to **index.html**. No separate asset directory is required.

For source changes:

```bash
npm ci
npm run build
npm test
```

`npm run build` generates `invoeez.html`, `dist/index.html` and a compatible `mizan.html` entry for existing installations.

| File | Purpose |
| --- | --- |
| `invoeez-source.jsx` | Original accounting/reporting application with integration changes. |
| `enhancements-data.jsx` | Migration, account snapshots, search, pricing and history helpers. |
| `company-template.jsx` | Chart of accounts, category and expense-item templates for a new company. |
| `tests/sample-fixture.jsx` | A generated year of trading used only by the tests. |
| `brand-assets.jsx` | The InvoEez logo (mark and full logo) as embedded images, cut from `brand/logo-source.jpg`. |
| `brand.jsx` | Brand colour layer for light and dark mode. |
| `clarity.jsx` | Plain-language summaries, payment status and the All reports page. |
| `onboarding.jsx` | Sample banner, Start my company, Setup guide, Excel/CSV import and opening balances. |
| `enhancements-ui.jsx` | Search pickers, creation dialogs, products, categories, pricing, sales team, counts and scrap. |
| `dashboard.jsx` | New overview dashboard. |
| `design.jsx` | New responsive visual system. |
| `runtime-prefix.js` | Original inline icon and export helpers. |
| `shell.html` | Original standalone shell and bundled libraries/fonts. |
| `build.mjs` | Reproducible JSX compilation and standalone packaging. |
| `tests/engine.cjs` | Executable accounting, pricing, migration and inventory regression checks. |
| `templates/` | Excel import templates for products and for customers & vendors (also downloadable inside the app). |
| `previews/` | Screenshots of the upgraded application. |

## Verification and scope

`npm test` checks the sample company for three different "today" dates (balanced books, no negative stock, no dangling references, no future-dated records, unique numbers), the 3.2 → 3.3 master-data migration, the start-fresh template, plus the earlier checks: balanced journals, historical accounts, category inheritance, pricing tiers and dates, manual discounts, retired-rule migration, cash-flow transfer exclusion, counts and scrap, all three costing methods, history, validation and search.

Browser checks for 3.3 covered every screen in the sample and in a brand-new company, Start my company, the setup guide, importing a compressed Excel workbook and a semicolon CSV (including invalid and duplicate rows), round-tripping the app's own templates, opening balances, a first invoice with imported stock, Unpaid/Overdue filters and paging, invoice print and PDF download, account rename, reloading the sample, an in-place upgrade from the original 3.2 file, and light, dark and mobile layouts. The 3.2 checks listed in `tests/browser-checks.json` remain part of the record.

This retains the supplied application's browser-local architecture. It does not add a server database, cross-device synchronization or production authentication; the existing role interface is not a server security boundary. External e-invoicing/provider submission and message delivery were not exercised against a live service.
