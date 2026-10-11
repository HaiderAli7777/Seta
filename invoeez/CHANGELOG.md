# 3.6.1 — Colour themes, folded lines, customer price history

- Colour returns: four themes in Settings › Appearance › Colour theme — Ocean blue (default: midnight-navy sidebar, azure actions), Teal, Royal violet and Graphite (the 3.6 chrome monochrome). The sidebar, buttons, highlights, charts, cash card, invoice letterhead and PDF follow the chosen theme in light and dark mode. Button text meets WCAG AA contrast in every theme.
- Invoice and bill lines: the stock and code note under each product now folds away. Only the line you are working on opens, showing stock, code and this customer's (or vendor's) price history: last price, date and quantity, how many earlier sales, a "Use" button to apply it and "History" for the full list. Posted documents stay fully folded.
- The history window shows last, lowest, highest and average price and how much was sold, switches between this customer and all customers, and explains when only other customers have bought the product.
- The Price history tab lists every product on the document for the selected customer straight away — no need to pick a product first.
- Fixed: when the mouse pointer happened to rest where the customer, vendor or product list opens, pressing Enter could pick the row under the pointer instead of the one you typed. Lists now follow the mouse only when it actually moves; the same applies to every drop-down.

# 3.6.0 — Chrome brand, master-style menu, PDC and smarter prices

- New silver chrome InvoEez logo on the startup screen, browser tab and sidebar. The whole app moves to the logo's graphite and silver with one steel-blue accent, in light and dark mode.
- Redesigned sidebar in the style of desktop accounting packages: Dashboard, Master (Accounts, Inventory, Rate and Other master, Opening balances), Sale, Purchase, Banking, Accounting trans., Stock management, Reports, VAT & e-invoicing, Utilities & tools. Tree lines, a "+" beside each transaction and master item to start a new record, menu search (press /), and a collapsible rail with fly-out sections. Phones get the same menu as a drawer.
- Every drop-down redrawn: a proper list with a check on the current choice, group headings, a filter box on long lists, type-ahead and keyboard control, "＋ New…" as a clear action, and a bottom sheet on phones.
- Unit price is empty unless a price applies — it never defaults to 0. Payment, transfer and expense amounts start empty too. Posting asks for any missing price and jumps to it.
- Lines pick the customer's last selling price (or the vendor's last price). Changing an offered price asks once: Don't store (this document only) or Party special (always this price for this party). Party specials can be managed on the customer/vendor form.
- Company name and address in Arabic; customer and product names in Arabic (optional).
- Settings › Invoice language: English only (default) or English + Arabic. Bilingual tax invoices and PDFs, with invoice, PDF and statement colours taken from the logo.
- Post-dated cheques: received and issued registers with in hand, deposited, cleared, bounced (with bank charges and reason) and returned/cancelled, full double-entry through 1210/2110, settlement of the chosen invoice or bill, maturity calendar, Excel export, replacement cheques, dashboard reminders and a "Post-dated cheque" button on invoices and bills.
- New Opening balances page under Master.

# 3.5.0 — Faster data entry

- New InvoEez logo (framed "ine" mark) on the startup screen, browser tab, sidebar and printouts, with the colour theme retuned to its deep indigo, royal blue and violet.
- Compact, Odoo-style line grid on invoices, bills, quotations, credit and debit notes: one row per item with product, description, quantity, unit, price, discount, VAT and amount, so many items fit on one screen. Press Enter in the last quantity or price to add the next line. The previous card layout stays available under "Detailed".
- Quantity starts empty; picking a product moves the cursor straight to the quantity, and the amount updates as you type. Posting with an empty quantity is blocked and the cursor jumps to that line.
- Addresses are split into Address line 1 and Address line 2 for customers, vendors and your company, on forms, imports, printouts, statements, PDFs and PINT AE e-invoices.
- Create a salesperson, product category or brand without leaving the form: choose "＋ New…" in the drop-down on customers, vendors, invoices, bills and products. Brands are now a list of existing brands.
- Product code / SKU is optional. Settings → Products & stock lets you choose automatic numbering (prefix and digits, e.g. P-00001) or manual codes; imports without a code follow the same rule.
- First purchase sets the cost: when a product with no cost is bought for the first time, the vendor bill price becomes its cost price. Every bill records the last purchase price, which new bills offer by default.
- Costing method (weighted average, FIFO or standard) now lives in Settings → Products & stock. Product screens show the current unit cost under the chosen method next to the last purchase price.

# 3.4.0 — InvoEez brand and clearer screens

- The InvoEez logo replaces every trace of the old Mizan brand: the startup screen, browser-tab icon, sidebar and page title ("InvoEez — Invoice Made Easy").
- New colour theme taken from the logo (indigo, royal blue and violet) in light and dark mode, including printed invoices, statements and PDF exports. Green and red now always mean money in/paid and overdue/owed.
- Clearer menu: Home, Sales (with Customers), Purchases (with Vendors and Expenses), Products & stock, Money, Accounting, Reports, VAT & e-invoicing, Settings.
- New "All reports" page that explains each report and shows its headline number.
- Plain-language summaries on the dashboard, profit & loss, balance sheet, aged receivable/payable, VAT return and inventory valuation.
- Invoices and bills show what matters: Paid, Partly paid, Due in N days, Overdue N days or Draft, with the balance due. Lists become easy-to-read cards on phones.
- A payment recorded from an invoice or bill (or chosen on the Receipts & payments form) now settles that document; credit and debit notes settle the document they were raised from. Unallocated money still settles the oldest open item.
- Fixed (present since 3.2): a quantity typed into a credit note was added to stock as text — 44 + "3" became 443. Quantities, prices and discounts are now always stored and calculated as numbers, which also repairs books saved earlier.
- Friendly empty states for a brand-new company; theme-aware avatars; tidier customer and vendor tables.

# 3.3.0 — Customer-ready edition

- Opens as a clean company ("My Company", one Administrator) with the full chart of accounts, product categories and expense items — no sample or demo data. Leftover demo books in the browser are replaced automatically.
- New Invoeez icon and sidebar mark replace the old Mizan balance-scale symbol.
- Opens on a complete sample company: 65-account chart of accounts, 27 product categories, 62 products/services/expense items, 20 customers, 17 vendors, price lists, a sales team and twelve months of quotations, invoices, bills, returns, receipts, payments, payroll, loan, depreciation, VAT, transfers, stock counts and scrap ending on the day the file is first opened.
- Added Start my company: clears sample transactions, keeps the chart of accounts, categories, expense items and payment methods, optionally keeps sample products, customers/vendors and price lists, and sets the company profile and administrator.
- Added the Setup guide (Workspace) with nine tracked steps, and a next-step card on the dashboard.
- Added Excel (.xlsx) and CSV import for products & services and customers & vendors, with templates, flexible column names, row-by-row checks, update-or-skip, new categories, opening stock and opening balances.
- Added Opening balances for bank/cash, receivables, payables and stock against 3900 Opening Balance Equity.
- Customers, vendors and products now live in the books: all are editable and deletable when unused. Books from 3.2 are migrated (schema 5) with every record and rename preserved.
- New invoices, bills and quotations start with no counterparty and the search focused, plus one blank line.
- Invoice and bill lists gained Unpaid and Overdue filters, compact rows with overdue badges and progressive loading; journals and payments load progressively.
- Account rename now works; unused accounts can be deleted unless a category, payment method or asset uses them.
- Category cards show account names; dashboard comparisons are hidden when the earlier period predates the books; slightly larger text across tables, forms and navigation.
- Payments, expenses and lists work in a brand-new company with no customers, vendors or products.

# 3.2.0 — Invoeez Enterprise Edition

- Renamed the application and user-facing exports to Invoeez, with Enterprise Edition beside the wordmark.
- Added independent Show accounts / Hide accounts controls on invoice and bill lines. Account controls are hidden by default in both Compact and Detailed layouts.
- Kept editable draft account overrides, category defaults and posted-document locks.
- Kept available stock visible on every selected goods line without any action.
- Retained existing browser storage keys and included a compatibility entry point for in-place upgrades.

# 3.1.0

- Removed Discount Master from navigation, customer/vendor defaults, document forms and active pricing calculations.
- Preserved every saved document line price, discount and total during migration; retained old master definitions as inactive backup data.
- Kept sales/purchase price lists with quantity tiers, scoped rules and validity dates. Added cards, filtering, rule summaries and a live product/quantity/date price preview.
- Added a product card catalog alongside the existing table, with category, type and low-stock filters.
- Added compact invoice/bill lines with optional per-line accounting details and a remembered compact/detailed preference.
- Made manual line discounts independent of quantity-based price-list updates.
- Enhanced the dashboard with KPI trends, period shortcuts, Collect/Pay views, cash movement and best-selling products.
- Separated unapplied credits from open documents on the dashboard; excluded cash/bank transfers from cash inflow/outflow.
- Improved dark-mode contrast, chart labels, keyboard focus and responsive layouts.
- Extended accounting, migration and workflow regression coverage.

# 3.0.0

- Redesigned the dashboard and application navigation with a responsive emerald theme.
- Rebuilt invoice/bill entry around blank searchable product lines and dedicated journal/history tabs.
- Added inline customer, vendor and product creation.
- Added product identifiers, barcode search, brand, category, packing and stock thresholds.
- Added on-hand stock, optional cost visibility and partner-specific price history to transaction entry.
- Added inherited product-category accounts with snapshots for posted documents.
- Added customer salespeople and editable document salesperson assignments.
- Added auditable physical stock counts, adjustments and damage/scrap journals.
- Added dated sales/purchase price lists, quantity tiers and reusable discount rules.
- Fixed navigation scroll position and automatic line scrolling/focus.
- Preserved the original accounting, reporting, banking, quotation and export functionality.
- Added data migration, unique generated record IDs, a reproducible build, and engine regression tests.
