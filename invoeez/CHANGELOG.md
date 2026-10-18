# 3.9.0 — IFRS 18 statements, account groups, drill-down, folded sidebar, tighter forms

- **Statement of profit or loss under IFRS 18**: every income and expense account sits in a category — Operating, Investing, Financing or Income taxes — with the required subtotals: Operating profit, Profit before financing and income taxes, and Profit for the period (plus Gross profit and Profit before income tax). Lines add up top to bottom; expenses show in brackets. Loan interest moves to Financing and corporate tax to Income taxes automatically; any account's category can be changed.
- **IFRS 18 notes** under the statement: how the statement is organised; EBITDA as a management-defined performance measure reconciled to operating profit; specified expenses by nature (employee benefits, depreciation and amortisation, inventory write-downs, impairment of receivables).
- **Account groups** (Master › Accounts master › Account groups): build your own report structure with groups inside groups — e.g. Assets › Current assets › Cash and cash equivalents › Petty cash — add sub-groups, tick the accounts that belong to a group, create a new account straight inside a group, rename, reorder and delete. Starts from suggested IFRS line items (Property, plant and equipment; Inventories; Trade and other receivables; Cash and cash equivalents; Borrowings; Trade and other payables; Employee benefits; Premises and utilities …). The statement of profit or loss tab also sets each account's IFRS 18 category.
- **Statements follow the groups**: the balance sheet and profit or loss show every group with its subtotal and fold open or shut (Expand all / Collapse all), like a ledger index. The balance sheet reads Assets › Equity › Liabilities with Total equity and liabilities.
- **Drill-down to the document**: click any account or any amount in the profit or loss, balance sheet or trial balance to see that account's transactions for that column's period, with opening and closing balances; click a transaction to open its invoice or bill, or see a journal entry, payment, cheque or stock adjustment with all its lines. A breadcrumb (Profit or loss › 4100 Revenue — Goods › INV/2026/0286) takes you back step by step. Income and expense accounts start each financial year at zero in the ledger.
- **Several comparison columns**: Compare › Number of periods (1–12) shows previous months, quarters, years or year-ends side by side, newest or oldest first, with a trend chart across them. Periods before the books start are left out and the report says so.
- **Folded sidebar**: the menu is a slim rail by default and slides open over the page when you point at it on a laptop or desktop; the pin keeps it open. On phones it opens from the menu button.
- **Tighter forms**: less empty space above and below the document title, the Compact / Detailed switch is gone (the compact grid stays), and the bottom bar no longer repeats "Add line". Quotations no longer show an empty journal label.

# 3.8.2 — Sign in, sign out, switch user and PINs

- **Sign-in screen**: when a company has more than one user (or its only user has a PIN), InvoEez opens on a sign-in screen listing the active users with their roles. A company with a single user and no PIN still opens straight away.
- **Sign out** from the account menu (top right), the Switch user window or the icon at the foot of the sidebar.
- **Switch user** for every role from the account menu or by clicking your name at the foot of the sidebar. Previously, after "Sign in as" a Sales or Viewer user there was no way back to the administrator.
- **Optional 4–6 digit PIN** per user (Users & access › edit user). It is asked when someone signs in or switches to that user; it is stored only as a hash. Setting a PIN for the Administrator keeps administrator access to yourself on a shared computer.
- **Several tabs at once**: each browser tab keeps its own signed-in user, and a change saved in one tab now appears in the other tabs straight away ("Updated with changes made in another window"). Before, two open tabs could overwrite each other's work.
- A user who is suspended or removed is signed out instead of silently becoming the administrator.
- The Administrator can be edited without an email address (email is optional, still checked when entered).

# 3.8.1 — Compare with an earlier period in financial reports

- New **Compare** button beside the date range on the Profit & loss, Balance sheet and Profit by product / customer reports. Choices: Previous period, Same period last year, Custom period (any dates) or Don't compare. Each choice shows the exact dates before you pick it, and the choice is remembered.
- "Previous period" follows the calendar: this month → last month to the same day, this quarter → last quarter, year to date → last year to date, last 12 months → the 12 before; other ranges compare with the same number of days just before. Leap years are handled.
- Balance sheet compares as-at dates: Last year-end (default), Previous month-end, Same date last year or another date.
- Comparative statements: P&L gains Comparison, Change (AED) and Change % columns for every account and subtotal, plus margins then and now; the balance sheet becomes a full-width comparative statement (assets, liabilities, equity) with both dates; customer and product reports show revenue then and now, and customers or products with sales only in the earlier period.
- KPI tiles show the change and the earlier figure ("was …"); new "This period vs comparison" paired bars, "Biggest changes" (green for good news, red for bad — falling costs count as good), "Then and now" for the balance sheet, and "Growing / Declining customers (products)".
- The written summary adds the comparison ("Compared with 01 Jul – 12 Jul 2026, sales are down 81.0% …").
- When the comparison period is before your books start, the report now says so (instead of silently hiding the comparison) and offers one-click periods your books do cover, such as "This quarter vs last quarter". A comparison that is only partly covered is flagged.
- PDF and Excel exports include the comparison columns and both periods in the headings.
- Dashboard: the period comparison uses the same calendar rules (year to date vs last year to date).

# 3.8.0 — Animated dashboard: fast and slow movers, top customers

- New dashboard banner in the colour theme with a slow-moving gradient and glow: live date, greeting, net profit that counts up with its change against the previous period, invoices issued, gross and net margin, quick actions (new invoice, new bill, receive payment, stock count), draft and low-stock reminders, and a glass "Cash & bank" card with its balance trend and money in and out. Period shortcuts, the date range and Overview / Financial detail sit in the banner.
- Five KPI tiles — Sales, Costs & expenses, Gross profit (each with a trend line and change vs the previous period), To collect (overdue share) and Stock value (share of products not running low). Click any tile to open its report.
- **Fast-moving items**: the six products with the most units sold in the period, with sales value, a bar, and how many days the current stock will last at that rate (red under 14 days or out of stock, amber under 30).
- **Slow-moving items**: stock value split into Fast, Steady, Slow and Not moving, the AED tied up in slow stock, and the five slowest items with quantity on hand, days since the last sale and days of stock. Fast = under 30 days of stock at the period's sales rate; Slow = over 90 days; Not moving = in stock with no sales in the period.
- **Top customers**: the top six by net sales with gold, silver and bronze ranks, number of invoices, last invoice, share of sales and whether they are paid up, have open invoices or are overdue. Click to open their ledger.
- Motion: figures count up, cards rise in turn, columns grow from the baseline, lines draw in and bars fill. It runs once when the dashboard opens (and on report tiles), never loops over data, and switches off completely when the device asks for reduced motion. Printing shows the finished state.
- The dashboard keeps Business health, Revenue & costs, Money to collect / pay (now five items), Coming up, Sales by category, Recent transactions and Cash movement in a tidier grid; phones get two-column tiles and stacked cards.

# 3.7.0 — Reports and dashboard redesign

- Every report now opens with a coloured header (icon, period and basis chips), KPI tiles with comparisons to the previous period, and charts before the detail table:
  - Profit & loss: revenue, costs and net profit by day/week/month with tooltips; gross and net margin meters; "Where the money goes" ranking of cost accounts.
  - Balance sheet: assets, liabilities, net worth, current ratio and cash tiles; what the business owns and how it is funded.
  - Aged receivable / payable: outstanding, not yet due, overdue, 60+ days late and average days late; balance by age and the largest balances (click to open their documents).
  - Profit by product / customer: top 10 by gross profit with margin, and the thinnest margins to review.
  - VAT return: output and input VAT tiles, payable/refundable, filing deadline countdown and VAT by month.
  - Inventory valuation: stock value, in stock, running low, out of stock; highest-value products, stock by category and a status column.
  - Trial balance, general ledger and partner ledger: totals tiles, and a running-balance line for the ledgers.
  - Payments by method: received/paid/net tiles and money in and out by method.
- All reports hub: headline tiles for profit, receivables, payables, VAT and stock, and colour-coded report groups.
- Dashboard: the revenue chart becomes columns for revenue and costs with a net-profit line and full tooltips; new Business health card (margins, receivables on time, days to get paid, current ratio, cash runway), Coming up (money in and out over the next 14 days, cheques, VAT deadline, overdue invoices) and Sales by category.
- Charts follow the colour theme in light and dark mode with colour sets checked for colour-blind separation; each chart has a "View as table" option and keyboard focus shows the same values as hover. PDF and Excel exports still contain the report tables only.

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
