# 3.18.0 — Several companies, several branches, reporting for each

- **Several companies in one InvoEez**: click the company name at the top of the menu to open the company switcher. **Add a company** takes a minute: name, TRN and address, then choose what to copy from the company you are in (the chart of accounts, product categories and expense items always; products, customers and vendors, price lists and the sales team if you tick them; the same users, roles and PINs by default). The new company opens with clean books and its own TRN, VAT return, settings, backup and cloud link. Switching companies reopens the app on the other company's books. **Settings › Companies** lists them, opens one, backs up the open one, and removes one you no longer need. The first company keeps its existing storage, so upgrading moves nothing.
- **Branches**: **Utilities & tools › Branches** sets them up in two steps. **Set up branches** turns the company into **Head office** (everything already recorded belongs to it) and opens the form for the next branch: name, short code, address, emirate, phone and email. Each branch has a card with its sales, profit and documents this year and the users based there, plus Edit, Make default, Switch off/on and Report. A branch with transactions, or the default branch, cannot be removed (switch it off instead); two branches cannot share a name.
- **Every transaction belongs to a branch**: quotations, invoices, credit notes, purchase orders, bills, debit notes, receipts and payments, expenses, journals, bank transfers, fixed assets and depreciation, stock counts, scrap and post-dated cheques have a **Branch** field. It starts with the user's **home branch** (set per user in Users & access) and otherwise the default branch. A payment or cheque against an invoice or bill always sits in that document's branch, so each branch's receivables and payables clear properly. Quotations converted to invoices keep their branch.
- **Branch on printed documents**: an invoice issued by a branch prints the branch name and address under the company as supplier (the company's TRN applies to all branches). Document lists have a branch filter and show the branch on each row.
- **Reports by branch**: the profit and loss, balance sheet, trial balance, general ledger, partner ledger, aged receivables and payables, profit by product and by customer, payments by method and the dashboard have a **Branch** picker ("All branches" by default). The choice stays on as you move between reports and is printed on the report and its PDF and Excel export. Each branch's ledger balances on its own, so its trial balance and balance sheet balance too. The VAT return and its filing pack, the inventory valuation and customer statements stay company-wide, as the FTA, a shared stock and a customer's single account require; on the dashboard, Stock value stays the whole company's when a branch is chosen.
- **Branch performance** (Reports): the branches side by side with sales, cost of sales, gross profit and margin, operating expenses, net profit and margin, invoices issued, average invoice, cash collected and what customers owe, plus an "All branches" column that always equals the profit and loss. A chart compares sales and net profit, and **Share of sales** shows each branch's part of the revenue with its net margin.
- **Group report** (Reports): every company side by side with its profit and loss for the period and its balances at the end (cash and bank, customers owe, owed to vendors, total assets, liabilities and equity), plus a **group total** and each company's share of group sales. Each company is worked out with its own chart of accounts. Sales, loans and balances between group companies are not eliminated; the report says so.
- Fixed along the way: the payments form now puts a receipt against an old invoice in that invoice's branch, and locks the field.

# 3.17.0 — Line discounts in % or AED, delivery addresses

- **Line discount as a percentage or an amount**: each line has a small **% | AED** switch beside its discount. AED takes that amount off the whole line (3 × 2,450 with AED 500 off = 6,850.00). Switching keeps the same money off (10% of 7,350 becomes AED 735, and back). A new line starts the way the line above it was. An amount above the line's value is refused on saving. The kind of discount is kept when a quotation becomes an invoice, when a document is copied, and when a price is reused from the history.
- Printed documents and PDFs show a **Disc.** column (10% or AED 500.00) whenever a line has a discount. The e-invoice states each line's discount as an allowance. Product history shows each discount the same way.
- **Delivery addresses**: a customer can have any number of branches or sites (name, address, emirate, receiving contact, phone), set in Customers › Edit › Delivery addresses, with one as the default. The customers list shows how many each has.
- **Deliver to** on quotations, invoices and credit notes: the main address or any branch, with the address and receiving contact shown beside it. **"＋ Add a delivery address…"** adds a new branch to the customer without leaving the document. Choosing a branch sets the **place of supply** to its emirate, since VAT on goods is due where they are delivered. A new document starts with the customer's default branch.
- The document keeps a copy of the address, so editing or removing a branch later never changes a posted invoice. The address is carried from quotation to invoice and to credit notes. It prints as **Deliver to** (three address columns in the PDF) and goes into the e-invoice as the delivery location. The invoice list shows "Deliver to …" and can be searched by branch name.
- **Delivery note**: in Print / send, an invoice or quotation can be printed or downloaded as a **delivery note**, with the delivery address, items, codes and quantities, a Received column, the total quantity, and "Delivered by" and "Received in good condition by" signature boxes. It shows no prices.

# 3.16.0 — Smoother movement, discount on the whole quotation

- **The menu glides open.** Pointing at the folded menu used to re-lay out the whole page on every animation frame, which made the slide stutter. Now the page is laid out once at its new width and glides there, in step with the menu as it unfolds; changing your mind half-way reverses from where it is. Pinning the open menu no longer moves the page, folding it glides the page back, and menu sections fold and unfold smoothly instead of popping. On phones the menu slides in with a softer, springier ease.
- **Highlights slide to your choice.** Period switches (Month / Quarter / Year), quotation status (Draft / Sent / Accepted / Declined), list filters, view toggles and the document tabs (Line items / Price history / Activity) move their highlight or underline to the new choice instead of jumping.
- **Documents glide in** when opened from a list and when going back to it; dialogs rise in; buttons give a small press.
- **Discount on the whole quotation**: under the lines, "Add a discount on the whole quotation" takes a fixed amount (AED) or a percentage. It comes off before VAT and is shared across the lines in proportion to their value, so VAT, revenue accounts and stock cost are exact. Lines keep their list amount and show the net after the discount. It is checked (no more than the quotation is worth, or 100%), saved with the quotation, carried to the invoice when the quotation is converted (same total), and works the same on invoices, credit notes, purchase orders, bills and debit notes.
- **Printed and PDF documents** with such a discount show Subtotal, Discount, Taxable amount, VAT and Total; the line table shows each line's amount before the discount. The PINT AE e-invoice states each line's discount as an allowance, so quantity × price − allowance equals the line amount (this also covers ordinary line discounts).
- **Totals panel redesigned**: subtotal at list price, line discounts, the whole-document discount, taxable amount, VAT and a large total that rolls to its new value, with "Discounts take AED … off" when there are any.
- **Calmer line grid**: a chosen product reads as plain text until the row is pointed at or edited.
- **Save bar** now sits on the window edge; before, the totals peeked out beneath it.
- Everything stays still with the system's "reduce motion" setting.

# 3.15.0 — Works offline, syncs to the cloud

- **Offline first**: every change is saved on the device straight away, so InvoEez keeps working with no internet — create and post invoices, record payments, edit customers. When the app is opened from its web address it also installs an offline copy of itself (a service worker), so it opens even with no connection, and it can be installed like an app (Settings › Cloud sync › Install app, or the browser's Install / Add to Home Screen).
- **Cloud sync**: Settings › Cloud sync connects a device to the company's books on an InvoEez sync server with the server address and an access key. Changes upload within seconds when there is a connection, the moment the connection comes back, when the window is reopened and every 20 seconds (which also brings in colleagues' changes).
- **Status in the top bar**: Synced, "Offline · 3 waiting", Syncing…, or a problem. Click it for details (last synced, this device, the server) and **Sync now**.
- **Several people, several devices**: a new device downloads the company's books when it connects. If a device and the cloud both have books, you choose which to keep (a backup is downloaded first either way).
- **Safe merging after working offline**: changes are merged record by record against the last synced copy, so different records never clash and deletions carry over. Customers, vendors, products and other master data merge field by field. A document, payment or journal entry changed on two devices at once keeps the cloud version, is listed under **Changed on two devices at once**, and **Use mine** puts your version back.
- **Numbers stay unique**: an invoice numbered offline that a colleague has used meanwhile takes the next free number (INV/2026/0288 → INV/2026/0289); you are told, the sync notes keep a record, and references to it follow.
- **Replacing the books switches sync off**: restoring a backup, starting a new company or loading the sample turns sync off on that device, so they are never uploaded over the company's cloud books.
- **New: the InvoEez sync server** (`server/`): a small Node.js service that keeps each company's books in **PostgreSQL** (or in files for a trial), keeps every saved version, refuses out-of-date saves so nothing is overwritten, and also serves the app. Runs on Azure, AWS, Render, a VPS or Docker; see `server/README.md`.

# 3.14.0 — A livelier dashboard

- **Animations you actually see**: every dashboard section now waits until you scroll to it, then rises into place — bars grow, lines draw, numbers count up and lists arrive one row at a time. Before, everything below the first screen had finished animating before you got there.
- **Sales by category** is a donut that draws itself, with the total counting up in the middle; point at a category (on the chart or in the list) to highlight its slice and see its share and amount.
- **Business health** shows three ring gauges — gross margin, net margin and invoices paid on time — that fill and count up, coloured green, amber or red by how healthy they are.
- **Banner**: soft lights drift up through it, a slow sheen passes across, the net profit figure catches the light, the cash line draws itself to a glowing point, and on Year to date a new chip shows where sales are heading ("On pace for AED 6M sales in 2026", the year's daily rate carried to 31 December).
- **Cards** carry a gentle light that follows the pointer, lift slightly on hover, and their icons give a small wiggle; KPI sparklines draw from left to right; chart bars have a soft gradient.
- Everything stays still with the system's "reduce motion" setting and when printing. Fixed along the way: a new chart name would have replaced the existing donut charts on the Expenses, payment-method and profit screens — they are untouched.
- **New guide: CLOUD.md** — how to put InvoEez online today, and the plan for a shared cloud database (PostgreSQL), with hosting options, UAE regions, security and a phased plan.

# 3.13.0 — Everyday experience: notifications, Undo, shortcuts, list summaries

- **Notification centre**: the bell now opens a "Needs attention" panel instead of jumping to the dashboard — purchase orders waiting for your approval, overdue invoices (with the amount to collect), overdue vendor bills, draft invoices and bills not yet posted, post-dated cheques maturing within a week, products below zero or at reorder level, and a reminder when the books have not been backed up for a week (with "Back up now"). Each line opens the right list already filtered. Works on tablets and phones too, where the bell was hidden before.
- **Undo instead of "Are you sure?"**: deleting a document, receipt or payment, customer or vendor, product, ledger account, fixed asset, payment method, user or post-dated cheque shows a toast with **Undo** for seven seconds; Undo puts the record back exactly where it was. Toasts now have a close button and a timer line, and no more than four stack up.
- **Keyboard shortcuts**: press **?** for the list. **g** then a letter goes somewhere (g d Dashboard, g i Invoices, g q Quotations, g o Purchase orders, g b Vendor bills, g e Expenses, g p Receipts & payments, g c Customers, g v Vendors, g s Products, g j Journal, g r Reports, g l Profit or loss); **n** then a letter creates (n i invoice, n q quotation, n o purchase order, n b bill, n c credit note). A hint shows the choices while you type; shortcuts pause while you are typing in a field and respect each role. The New menu shows the shortcut beside each item, and the account menu has "Keyboard shortcuts".
- **Summary tiles on document lists**: invoices and bills open with To collect / To pay, Overdue, Due in 7 days and Drafts; quotations with Drafts, Awaiting reply, Accepted · to invoice and Invoiced; purchase orders with Drafts, Awaiting approval, Approved · to bill and Billed. Each tile shows the amount and count and filters the list when clicked (click again for everything).
- **Figures**: amounts in tables, totals, tiles and the printed invoice total use tabular numerals in the interface font instead of the code font, so columns line up and read more cleanly; document numbers and codes keep the code font.
- **Receipts & payments** fit the page: method and bank account share one column, long names and memos are shortened with the full text on hover, dates and numbers no longer break across lines.

# 3.12.0 — New sign-in page, documents as one form

- **Sign-in page redesigned**: a brand side with the InvoEez logo, "Your books, beautifully in order.", the main features, and an animated preview of the product — softly drifting colour, floating glass cards (a paid tax invoice whose progress bar fills, a revenue chart that draws itself, "VAT return ready", "Purchase order approved"). The sign-in side greets you by time of day and date, shows your company, and lists everyone as tiles that slide in one after another; the person who signed in last on this computer is marked "Last here". With more than six people a "Find your name" search appears.
- **PIN pad**: choosing a user with a PIN shows their avatar, six dots that fill as you type (the last two are optional) and an on-screen keypad with a delete key — typing on the keyboard works too. A wrong PIN shakes the dots, turns them red and puts the cursor back in the box; the right PIN turns the avatar into a green check before the books open. The Switch user window uses the same dots.
- **Sign-in on phones**: a compact brand band on top with the sign-in sheet sliding over it. Dark mode is supported, and with the system's "reduce motion" setting everything stays still and sign-in is instant.
- **A document is one form**: the header, the Line items / Journal / Price history / Activity tabs, the line grid, the internal note and totals, and the save bar now sit in one card with no gaps between them. The payments panel on a posted invoice or bill follows the form.
- **Unsaved changes**: the save bar shows "Unsaved changes" as soon as you edit, or "all changes saved". **Ctrl+S** (⌘S on a Mac) saves a draft and keeps you on it. Going back with unsaved changes asks: Keep editing, Discard changes, or Save and leave.

# 3.11.0 — One-piece document header, purchase orders with approval

- **Document header as one unit**: quotations, invoices, credit notes, bills and debit notes open with a single card that holds the document type, number and status, the customer or vendor, the total (or balance due), a progress line and the document fields. The scattered rows of buttons are gone: the bar shows the everyday actions, one main action on the right (Convert to invoice, Post to ledger, Record payment, Submit for approval, Approve, Convert to bill), and the rarely used ones — Duplicate, Credit note / Debit note, Post-dated cheque, Reset to draft, Delete — sit behind **More**.
- **Progress line**: Draft → Posted → Paid (Part paid / Awaiting payment) on invoices and bills, Draft → Posted on notes, Draft → Approval → Ordered → Billed on purchase orders. On a quotation the status is a single Draft · Sent · Accepted · Declined control instead of three buttons.
- **Linked documents**: an invoice raised from a quotation and a bill raised from a purchase order show "From QUO/… / PO/…" and link back; the quotation and purchase order offer "Open INV/… / BILL/…".
- **Purchase orders** (Purchase › Purchase orders, also in New and the sidebar +): raise an order to a vendor with the same line grid as a bill. Nothing reaches the ledger until the order is converted to a bill and that bill is posted.
- **One level of approval**: Users & access › edit user › **Can approve purchase orders**. When two or more users have it, any one of them can approve. Submit for approval → Approve, or Reject with a reason the requester sees → change and resubmit; the requester can withdraw an order while it waits. Whoever raised an order cannot approve it while another approver exists; the only approver approves directly. With no approvers set up, an order is confirmed in one step.
- **Approval reminders**: the dashboard shows "Purchase orders waiting for your approval" with Review, the bell counts them, the purchase order list has an "Awaiting approval" filter and marks "Needs your approval". A user whose role cannot raise purchases (for example a Viewer) can still open purchase orders when marked as an approver.
- **Approval trail**: every step — submitted, approved, rejected (with reason), withdrawn, reopened, sent to vendor, converted to a bill — is kept with who and when on the order's Approval & activity tab.
- **Printed purchase order and PDF**: titled Purchase Order, Buyer and Vendor blocks, Deliver by, Order total and "Approved by … on …". Quotations now print as Quotation (with Valid until) instead of Tax Invoice.

# 3.10.0 — Payments on invoices, professional report downloads

- **Payments on invoices and bills**: a posted invoice or bill now shows a Payments panel — document total, amount received (or paid), balance receivable (or payable), a progress bar, and every receipt, cheque or credit note applied with date, reference, method and amount. A settlement recorded against the document counts first; anything left over from earlier receipts is applied oldest-first, exactly as in the aged receivable. The totals box adds "Received · n payments" and "Balance receivable" (or "Paid in full"), and a button records the remaining balance.
- **Printed invoice and PDF** show "Less: received to date" and "BALANCE DUE" (or "PAID IN FULL") with the receipts listed, once anything has been paid.
- **Sidebar**: when it opens on hover it now sits beside the page and the page makes room — forms and data are never covered. It waits a moment before opening so passing the pointer over it does nothing, and the duplicate tooltips are gone.
- **Report PDFs** are laid out like financial statements: company letterhead, title, period and "Amounts in AED", a dark column header that repeats on every page, category labels, shaded sections, indented accounts, ruled subtotals, a double-ruled total, gains in green and falls in red, notes with their own headings, and "Page x of y" footers. Wide comparisons switch to landscape. Characters the PDF fonts cannot draw (minus signs, arrows) are replaced, so no more garbled "%¼" text, and account codes keep a space before the name.
- **Excel downloads** keep real numbers (#,##0.00 with brackets for negatives, percentages as percentages), bold sections and totals, indentation for groups and accounts, shaded headers, borders on subtotals and totals, a frozen header row and no gridlines.
- **Reports in the app** open with a statement heading (company, statement, period, "All amounts in UAE dirhams"), figures in proportional tabular numerals instead of the code font, quieter section rows and ruled totals. PDF, Excel and Print sit together as one button group.

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
