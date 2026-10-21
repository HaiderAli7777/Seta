/* ============================================================================
   3.20 — InvoEez as a set of apps.  3.22 — redesigned.
   · Home: the search box and every app, all in one view — nothing else.
   · A light top bar: the apps button, the app you are in (click it to jump to
     another app) and that app's menu; search, New, alerts, company and you
     on the right.
   · Every app's menu follows one pattern — Overview, the day-to-day work and
     the records it keeps, then Reporting and Configuration — and each screen
     lives in one app only.
   · App overviews: figures, the work and records as cards, the latest
     activity, and Reporting / Configuration on the side.
   ========================================================================== */

/* What each screen is for, shown on the app overviews. */
const SCREEN_INFO = {
  quotes: "Price offers to customers, converted to invoices in one click", invoices: "Tax invoices, payments received and what is still due",
  credit_notes: "Returns and corrections to invoices", customers: "Customer details, TRN, terms, delivery addresses and history",
  pricelists: "Special prices, quantity tiers and discounts", salespeople: "The sales team and the customers they look after",
  purchase_orders: "Orders to vendors, with approval before they are sent", bills: "Vendor bills, what is owed and when it is due",
  debit_notes: "Returns to vendors and corrections to bills", expenses: "Rent, utilities and other running costs, paid or owed", vendors: "Vendor details, TRN and terms",
  products: "Goods and services with prices, costs and stock", categories: "Revenue, cost and stock accounts for each kind of product",
  stock_count: "Physical counts that adjust stock and post the difference", scrap: "Damaged goods written off with a reason", r_stock: "Quantity and value of every stocked item",
  accounts: "The chart of accounts", acct_groups: "How accounts roll up in the statements", journal: "Manual journal entries", assets: "Fixed assets and depreciation",
  opening: "Opening balances for bank, customers, vendors and stock",
  payments: "Money received from customers and paid to vendors", pdc: "Post-dated cheques received and issued", banking: "Bank and cash balances, transfers and movements",
  methods: "Cash, card, bank transfer, cheque and the accounts behind them",
  r_vat: "The FTA 201 VAT return, box by box", fta: "PINT AE e-invoices and the filing pack",
  setup: "Step-by-step setup: company, products, opening balances", users: "Who can sign in, their role, PIN and branch", companies: "Every company in this InvoEez",
  branches: "Shops, warehouses and offices, with their numbering", settings: "Company profile, appearance, cloud sync and backup",
  r_branch: "Branches side by side", r_group: "Companies side by side",
};
/* The kind of each screen an app's menu lists at the top: the day-to-day work, the records it keeps, or filing. */
const SCREEN_KIND = { customers: "records", vendors: "records", products: "records", salespeople: "records", accounts: "records", assets: "records",
  companies: "records", branches: "records", r_vat: "filing", fta: "filing" };
const KIND_TITLE = { work: "Transactions", records: "Master data", filing: "Filing" };

const CREATE_LABEL = { invoices: "New invoice", quotes: "New quotation", credit_notes: "New credit note", customers: "New customer", purchase_orders: "New purchase order",
  bills: "New vendor bill", expenses: "New expense", vendors: "New vendor", products: "New product", stock_count: "New stock count", scrap: "Record scrap", categories: "New category",
  journal: "New journal entry", accounts: "New account", assets: "New fixed asset", payments: "Record a receipt", pdc: "New cheque", banking: "New transfer", salespeople: "New salesperson" };
const monthStart = () => TODAY.slice(0, 8) + "01";
const quarterStart = () => { const m = +TODAY.slice(5, 7); return `${TODAY.slice(0, 4)}-${String(m - ((m - 1) % 3)).padStart(2, "0")}-01`; };
const nPlural = (n, one, many) => `${(+n || 0).toLocaleString("en-US")} ${n === 1 ? one : many || one + "s"}`;
const docsOf = (s, t) => s.docs.filter((d) => d.type === t);
const shortAmt = (v) => (v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e4 ? (v / 1e3).toFixed(1) + "K" : money(v, false));
const overdueOf = (ag) => R2(ag.rows.reduce((s, r) => s + r.items.filter((i) => i.due < TODAY).reduce((t, i) => t + i.open, 0), 0));
const bankBalance = (books, to = TODAY) => { const codes = ACCOUNTS.filter((a) => a.type === "bank").map((a) => a.code);
  return R2(books.flat.filter((l) => codes.includes(l.acc) && l.date <= to).reduce((s, l) => s + l.debit - l.credit, 0)); };
const byLatest = (a, b) => (b.date || "").localeCompare(a.date || "") || (b.number || "").localeCompare(a.number || "");
/* What is still open on each posted invoice and bill. */
const openAmounts = (state) => { const o = {}; [aging(state, "receivable", TODAY), aging(state, "payable", TODAY)].forEach((a) => a.rows.forEach((r) => r.items.forEach((i) => (o[i.id] = i.open)))); return o; };
const DOC_ICON = { invoice: Receipt, quote: FileText, credit_note: FileMinus, bill: ShoppingCart, purchase_order: ClipboardCheck, debit_note: FilePlus };
const docRow = (d, open) => ({ key: d.id, k: LIST_OF[d.type], p: d.id, icon: DOC_ICON[d.type] || FileText, t: d.number || "Draft",
  s: `${DOCMETA[d.type].short} · ${(PMAP[d.partner] || {}).name || "No partner"}`, date: d.date, amt: amounts(d).total, st: docStatus(d, open[d.id] || 0, d.type) });

/* The apps. `home` is where the card opens; each app's screens are its menu (APP_MENUS). */
const APPS = [
  { id: "sales", name: "Sales", icon: ShoppingBag, cat: "core", tone: ["#4F8DFF", "#1D4ED8"], home: "app_sales", art: "sales",
    desc: "Quotations, invoices and revenue", about: "Quotations, invoices and what customers owe", create: ["invoices", "quotes", "credit_notes", "customers"],
    records: (c) => nPlural(docsOf(c.state, "invoice").length, "invoice"),
    kpis: (c) => { const r = pnl(c.books.flat, monthStart(), TODAY), ar = aging(c.state, "receivable", TODAY);
      const q = docsOf(c.state, "quote").filter((d) => ["draft", "sent", "accepted"].includes(d.state));
      return [["Sales this month", money(r.revenue, false), "AED"], ["Open quotations", String(q.length), `AED ${money(R2(q.reduce((s, d) => s + amounts(d).total, 0)), false)}`],
        ["Customers owe", money(ar.grand, false), "AED"], ["Overdue", money(overdueOf(ar), false), "AED", overdueOf(ar) > 0 ? "neg" : ""]]; },
    recent: (c) => ({ title: "Latest sales documents", all: ["invoices"], rows: c.state.docs.filter((d) => ["invoice", "quote", "credit_note"].includes(d.type)).sort(byLatest).slice(0, 6).map((d) => docRow(d, c.open())) }) },
  { id: "purchase", name: "Purchase", icon: ShoppingCart, cat: "core", tone: ["#A78BFA", "#6D28D9"], home: "app_purchase", art: "purchase",
    desc: "Orders, bills and vendors", about: "Purchase orders, vendor bills, expenses and vendors", create: ["purchase_orders", "bills", "expenses", "vendors"],
    records: (c) => nPlural(docsOf(c.state, "bill").length, "bill"),
    kpis: (c) => { const ap = aging(c.state, "payable", TODAY);
      const month = R2(docsOf(c.state, "bill").filter((d) => d.state === "posted" && d.date >= monthStart()).reduce((s, d) => s + amounts(d).total, 0));
      return [["Bought this month", money(month, false), "AED"], ["Open purchase orders", String(c.counts.purchase_orders || 0), "awaiting approval or billing"],
        ["You owe vendors", money(ap.grand, false), "AED"], ["Overdue bills", money(overdueOf(ap), false), "AED", overdueOf(ap) > 0 ? "neg" : ""]]; },
    recent: (c) => ({ title: "Latest purchase documents", all: ["bills"], rows: c.state.docs.filter((d) => ["bill", "purchase_order", "debit_note"].includes(d.type)).sort(byLatest).slice(0, 6).map((d) => docRow(d, c.open())) }) },
  { id: "inventory", name: "Inventory", icon: Warehouse, cat: "core", tone: ["#FDBA74", "#EA580C"], home: "app_inventory", art: "inventory",
    desc: "Products, stock and valuation", about: "Products, stock counts, scrap and valuation", create: ["products", "stock_count", "scrap", "categories"],
    records: (c) => nPlural(PRODUCTS.filter((p) => !isSetupItem(p)).length, "product"),
    kpis: (c) => { const st = Object.entries(c.books.stock || {}), value = R2(st.reduce((s, [, x]) => s + x.value, 0));
      const goods = PRODUCTS.filter((p) => p.kind === "goods"), low = goods.filter((p) => ((c.books.stock[p.id] || {}).qty || 0) <= (p.reorder ?? 5)).length;
      const counts = (c.state.stockOps || []).filter((o) => o.kind !== "scrap"), last = counts.reduce((m, o) => (o.date > m ? o.date : m), "");
      return [["Stock value", money(value, false), "AED at cost"], ["Stocked items", String(goods.length), `${goods.filter((p) => ((c.books.stock[p.id] || {}).qty || 0) > 0).length} in stock`],
        ["Low on stock", String(low), "at or below their reorder level", low ? "warn" : ""], ["Last stock count", last ? dmy(last) : "None yet", `${counts.length} counts`]]; },
    recent: (c) => { const q = (p) => (c.books.stock[p.id] || {}).qty || 0;
      const low = PRODUCTS.filter((p) => p.kind === "goods" && q(p) <= (p.reorder ?? 5)).sort((a, b) => q(a) - q(b) || a.name.localeCompare(b.name)).slice(0, 6);
      return { title: "Low on stock", all: ["products", "__low_stock__"], empty: "Every stocked item is above its reorder level.",
        rows: low.map((p) => ({ key: p.id, k: "products", p: p.id, icon: Package, t: p.name, s: `${p.code || "No code"} · reorder at ${p.reorder ?? 5}`,
          amtText: `${q(p).toLocaleString("en-US")} ${(p.uom || "units").toLowerCase()}`, st: q(p) <= 0 ? { label: "Out of stock", tone: "bad" } : { label: "Low", tone: "warn" } })) }; } },
  { id: "accounting", name: "Accounting", icon: Calculator, cat: "finance", tone: ["#34D399", "#047857"], home: "app_accounting", art: "accounting",
    desc: "Ledger, journals and assets", about: "Journal entries, the chart of accounts, fixed assets and opening balances", create: ["journal", "accounts", "assets"],
    records: (c) => nPlural(ACCOUNTS.length, "account"),
    kpis: (c) => { const y = TODAY.slice(0, 4) + "-01-01", r = pnl(c.books.flat, y, TODAY);
      return [["Net profit this year", money(r.net, false), `${r.nm.toFixed(1)}% of sales`, r.net < 0 ? "neg" : ""], ["Journal entries", String(c.state.manual.length), "entered by hand"],
        ["Fixed assets", String((c.state.assets || []).length), "on the register"], ["The books", c.books.balanced ? "Balanced" : "Out of balance", `${c.books.entries.length.toLocaleString("en-US")} entries`, c.books.balanced ? "pos" : "neg"]]; },
    recent: (c) => ({ title: "Latest journal entries", all: ["journal"], empty: "No journal entries yet.",
      rows: c.state.manual.slice().sort(byLatest).slice(0, 6).map((e) => ({ key: e.id, k: "journal", icon: BookOpen, t: e.number || "Draft", s: e.ref || e.journal || "Journal entry", date: e.date,
        amt: R2((e.lines || []).reduce((s, l) => s + (+l.debit || 0), 0)), st: null })) }) },
  { id: "bank", name: "Bank & cash", icon: Landmark, cat: "finance", tone: ["#22D3EE", "#0E7490"], home: "app_bank", art: "bank",
    desc: "Receipts, payments and cheques", about: "Receipts, payments, post-dated cheques and bank balances", create: ["payments", "pdc", "banking"],
    records: (c) => nPlural(c.state.payments.length, "payment"),
    kpis: (c) => { const m = monthStart(), inn = R2(c.state.payments.filter((p) => p.kind === "in" && p.date >= m).reduce((s, p) => s + p.amount, 0));
      const out = R2(c.state.payments.filter((p) => p.kind === "out" && p.date >= m).reduce((s, p) => s + p.amount, 0));
      return [["Cash and bank", money(bankBalance(c.books), false), "AED today"], ["Received this month", money(inn, false), "AED"], ["Paid this month", money(out, false), "AED"],
        ["Open cheques", String(c.counts.pdc || 0), "post-dated, not yet cleared"]]; },
    recent: (c) => ({ title: "Latest receipts and payments", all: ["payments"], empty: "No receipts or payments yet.",
      rows: c.state.payments.slice().sort(byLatest).slice(0, 6).map((p) => ({ key: p.id, k: "payments", icon: p.kind === "in" ? ArrowDownLeft : ArrowUpRight, t: p.number || "Payment",
        s: `${(PMAP[p.partner] || {}).name || p.memo || "—"} · ${(MET[p.method] || {}).name || "—"}`, date: p.date, amtText: (p.kind === "in" ? "+ " : "− ") + money(p.amount, false),
        st: p.kind === "in" ? { label: "Received", tone: "ok" } : { label: "Paid", tone: "info" } })) }) },
  { id: "vat", name: "VAT & e-invoicing", icon: ShieldCheck, cat: "finance", tone: ["#FB7185", "#BE123C"], home: "app_vat", art: "vat",
    desc: "VAT return and e-invoices", about: "The FTA VAT return and PINT AE e-invoicing", create: [],
    records: (c) => { const qs = quarterStart(), v = vat201(c.state, qs, TODAY); return `${v.due >= 0 ? "Due" : "Refund"} AED ${shortAmt(Math.abs(v.due))} · Q${Math.floor((+qs.slice(5, 7) - 1) / 3) + 1}`; },
    kpis: (c) => { const v = vat201(c.state, quarterStart(), TODAY);
      return [["Output VAT", money(v.out.vat, false), "this quarter so far"], ["Input VAT", money(v.inp.vat, false), "recoverable"],
        [v.due >= 0 ? "VAT due" : "VAT refund", money(Math.abs(v.due), false), "AED this quarter", v.due > 0 ? "warn" : "pos"], ["TRN", COMPANY.trn || "Not registered", COMPANY.emirate || ""]]; },
    recent: (c) => ({ title: "VAT by quarter", all: ["r_vat"], rows: [0, 1, 2, 3].map((i) => { const qs = addMonths(quarterStart(), -3 * i), qe = addDays(addMonths(qs, 3), -1), to = qe < TODAY ? qe : TODAY;
      const v = vat201(c.state, qs, to), n = Math.floor((+qs.slice(5, 7) - 1) / 3) + 1;
      return { key: qs, k: "r_vat", icon: ShieldCheck, t: `Q${n} ${qs.slice(0, 4)}`, s: `${dmy(qs)} – ${dmy(qe)}${i === 0 ? " · so far" : ""}`, amtText: "AED " + money(Math.abs(v.due), false),
        st: v.due >= 0 ? { label: i === 0 ? "Due so far" : "Due", tone: "warn" } : { label: "Refund", tone: "ok" } }; }) }) },
  { id: "reports", name: "Reports", icon: PieChart, cat: "insights", tone: ["#818CF8", "#4338CA"], home: "reports", art: "reports",
    desc: "Statements, ledgers, analysis", records: () => "15 reports" },
  { id: "dash", name: "Dashboard", icon: LayoutDashboard, cat: "insights", tone: ["#38BDF8", "#2563EB"], home: "dash", art: "dash",
    desc: "Live sales, cash and profit", records: () => "Live" },
  { id: "contacts", name: "Contacts", icon: Users, cat: "people", tone: ["#F472B6", "#BE185D"], home: "app_contacts", art: "contacts",
    desc: "Customers, vendors, sales team", about: "Customers, vendors and the sales team in one address book", create: ["customers", "vendors", "salespeople"],
    records: (c) => nPlural(PARTNERS.length, "contact"),
    kpis: (c) => [["Customers", String(PARTNERS.filter((p) => p.role === "customer").length), "on file"], ["Vendors", String(PARTNERS.filter((p) => p.role === "vendor").length), "on file"],
      ["Sales team", String((c.state.salespeople || []).length), "people"], ["Customers who owe", String(aging(c.state, "receivable", TODAY).rows.length), "with an open balance"]],
    recent: (c) => ({ title: "Customers who owe the most", all: ["r_aged_ar"], empty: "No customer owes anything.",
      rows: aging(c.state, "receivable", TODAY).rows.slice().sort((a, b) => b.total - a.total).slice(0, 6).map((r) => { const late = r.items.filter((i) => i.due < TODAY).length;
        return { key: r.partner.id, k: "customers", p: r.partner.id, icon: Users, t: r.partner.name, s: nPlural(r.items.length, "open invoice"), amt: r.total,
          st: late ? { label: `${late} overdue`, tone: "bad" } : { label: "Current", tone: "ok" } }; }) }) },
  { id: "org", name: "Companies", icon: Building2, cat: "setup", tone: ["#FBBF24", "#B45309"], home: "companies", art: "org",
    desc: "Companies, branches, group view",
    records: (c) => nPlural(companyList().length, "company", "companies") + ((c.state.branches || []).length ? " · " + nPlural(c.state.branches.length, "branch", "branches") : "") },
  { id: "users", name: "Users & access", icon: KeyRound, cat: "people", tone: ["#2DD4BF", "#0F766E"], home: "users", art: "users",
    desc: "Roles, PINs and approvals", records: (c) => nPlural((c.state.users || []).filter((u) => u.active !== false).length, "user") },
  { id: "settings", name: "Settings", icon: Settings, cat: "setup", tone: ["#94A3B8", "#334155"], home: "settings", art: "settings",
    desc: "Profile, sync and backup",
    records: (c) => (c.state.setup && c.state.setup.backup ? `Backed up ${dmy(c.state.setup.backup)}` : "Not backed up yet") },
];
const APP_BY = Object.fromEntries(APPS.map((a) => [a.id, a]));
/* Which app an overview page belongs to. */
const appOfView = (k) => (k && k.startsWith("app_") ? APP_BY[k.slice(4)] : null);

/* ------------------------------------------------------------ app menus */
/* One pattern for every app: Overview, the work and records, then Reporting and Configuration.
   Each screen has one home app; only customers and vendors are also in Contacts, the address book. */
const APP_MENUS = {
  sales: ["app_sales", "quotes", "invoices", "credit_notes", "customers", ["Reporting", ["r_cust", "r_prod", "r_aged_ar", "r_stmt"]], ["Configuration", ["pricelists", "salespeople"]]],
  purchase: ["app_purchase", "purchase_orders", "bills", "debit_notes", "expenses", "vendors", ["Reporting", ["r_aged_ap", "r_partner"]]],
  inventory: ["app_inventory", "products", "stock_count", "scrap", ["Reporting", ["r_stock", "r_prod"]], ["Configuration", ["categories"]]],
  accounting: ["app_accounting", "journal", "accounts", "assets", ["Reporting", ["r_pnl", "r_bs", "r_tb", "r_gl"]], ["Configuration", ["acct_groups", "opening"]]],
  bank: ["app_bank", "payments", "pdc", "banking", ["Reporting", ["r_method"]], ["Configuration", ["methods"]]],
  vat: ["app_vat", "r_vat", "fta"],
  reports: ["reports", ["Statements", ["r_pnl", "r_bs", "r_tb"]], ["Ledgers", ["r_gl", "r_partner", "r_stmt"]], ["Ageing", ["r_aged_ar", "r_aged_ap"]],
    ["Analysis", ["r_prod", "r_cust", "r_method", "r_stock"]], ["Branches & group", ["r_branch", "r_group"]]],
  dash: ["dash"],
  contacts: ["app_contacts", "customers", "vendors", "salespeople"],
  org: ["companies", "branches", ["Reporting", ["r_branch", "r_group"]]],
  users: ["users"],
  settings: ["settings", "setup"],
};
/* Where a screen opens when it is reached from search or a link, rather than from an app's own menu. */
const PRIMARY_APP = { companies: "org", branches: "org", users: "users", r_vat: "vat", r_stock: "inventory", salespeople: "sales", customers: "sales", vendors: "purchase" };
const TAB_LABEL = { quotes: "Quotations", invoices: "Invoices", credit_notes: "Credit notes", purchase_orders: "Purchase orders", bills: "Vendor bills", products: "Products",
  stock_count: "Stock counts", scrap: "Damage & scrap", r_stock: "Stock valuation", journal: "Journal entries", accounts: "Chart of accounts", assets: "Fixed assets", payments: "Receipts & payments",
  pdc: "Cheques", banking: "Bank & cash", r_vat: "VAT return", fta: "E-invoicing", reports: "All reports", dash: "Dashboard", settings: "Company & settings", setup: "Setup guide",
  categories: "Product categories", methods: "Payment methods", pricelists: "Price lists", salespeople: "Sales team" };
const menuKeys = (id) => (APP_MENUS[id] || []).flatMap((x) => (typeof x === "string" ? [x] : x[1]));
/* The screens of an app (its menu without the overview). */
const appScreens = (a) => menuKeys(a.id).filter((k) => !k.startsWith("app_"));
const appOpen = (a, allowed) => (a.home.startsWith("app_") ? appScreens(a).some(allowed) : allowed(a.home));
function primaryAppOf(k) {
  if (appOfView(k)) return appOfView(k).id;
  if (PRIMARY_APP[k]) return PRIMARY_APP[k];
  if (/^r_/.test(k) && k !== "r_vat") return "reports";
  const a = APPS.find((x) => menuKeys(x.id).includes(k));
  return a ? a.id : null;
}
const navItem = (k) => NAV_FLAT_APPS.find((n) => n.k === k);
const tabLabel = (k) => TAB_LABEL[k] || (appOfView(k) ? "Overview" : (navItem(k) || { l: k }).l);
const tabIcon = (k) => (appOfView(k) ? LayoutGrid : (navItem(k) || { i: FileText }).i || FileText);
/* An app's overview: the menu's top-level screens, split into work and records, and its dropdown groups. */
function appSections(id, allowed) {
  const top = { work: [], records: [], filing: [] }, groups = [];
  (APP_MENUS[id] || []).forEach((x) => {
    if (typeof x === "string") { if (!x.startsWith("app_") && allowed(x)) top[SCREEN_KIND[x] || "work"].push(x); }
    else { const ks = x[1].filter(allowed); if (ks.length) groups.push([x[0], ks]); }
  });
  return { top, groups };
}

/* -------------------------------------------------------------- artwork */
/* Each app has a small illustration in its colours, drawn as SVG so it stays sharp and light. */
function AppArt({ kind, tone, size = 1 }) {
  const id = "aa-" + kind, [c1, c2] = tone;
  const G = <defs>
    <linearGradient id={id + "-a"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient>
    <linearGradient id={id + "-b"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset="1" stopColor={c1} stopOpacity=".35" /></linearGradient>
    <linearGradient id={id + "-c"} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={c2} stopOpacity=".55" /><stop offset="1" stopColor={c1} stopOpacity=".2" /></linearGradient>
    <radialGradient id={id + "-s"} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor={c2} stopOpacity=".28" /><stop offset="1" stopColor={c2} stopOpacity="0" /></radialGradient>
  </defs>;
  const A = `url(#${id}-a)`, B = `url(#${id}-b)`, C = `url(#${id}-c)`;
  const shadow = <ellipse cx="78" cy="92" rx="54" ry="7" fill={`url(#${id}-s)`} />;
  const bar = (x, h, w = 14) => <g key={x}><path d={`M${x} ${88 - h}h${w}v${h}h-${w}z`} fill={A} /><path d={`M${x} ${88 - h}l5 -4h${w}l-5 4z`} fill={B} /><path d={`M${x + w} ${88 - h}l5 -4v${h}l-5 4z`} fill={C} /></g>;
  const art = {
    sales: <>{shadow}{[[30, 26], [52, 40], [74, 56], [96, 74]].map(([x, h]) => bar(x, h))}<path d="M26 54 C 48 50, 70 36, 112 12" stroke={c2} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".7" /><path d="M106 10l8 1-3 7" stroke={c2} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity=".7" /></>,
    purchase: <>{shadow}<path d="M20 26h12l12 42h52l10 -30H38" fill="none" stroke={A} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="48" y="22" width="22" height="20" rx="3" fill={A} /><rect x="48" y="22" width="22" height="6" rx="2" fill={B} /><rect x="70" y="14" width="24" height="28" rx="3" fill={C} /><rect x="74" y="18" width="16" height="4" rx="2" fill="#fff" opacity=".7" />
      <circle cx="50" cy="80" r="6" fill={A} /><circle cx="88" cy="80" r="6" fill={A} /><circle cx="50" cy="80" r="2.4" fill="#fff" /><circle cx="88" cy="80" r="2.4" fill="#fff" /></>,
    inventory: <>{shadow}{[[26, 54, 34, 30], [62, 54, 34, 30], [44, 22, 34, 30], [98, 62, 22, 22]].map(([x, y, w, h], i) => <g key={i}><rect x={x} y={y} width={w} height={h} rx="3" fill={i === 2 ? C : A} />
      <path d={`M${x} ${y}h${w}l-5 -5h-${w}z`} fill={B} transform={`translate(5 0)`} opacity=".9" /><rect x={x + w / 2 - 3} y={y} width="6" height={h * .45} fill="#fff" opacity=".55" /></g>)}</>,
    accounting: <>{shadow}<rect x="34" y="8" width="56" height="74" rx="6" fill={B} stroke={c1} strokeOpacity=".35" /><rect x="42" y="18" width="30" height="5" rx="2.5" fill={A} />
      {[30, 39, 48].map((y) => <rect key={y} x="42" y={y} width="40" height="3.5" rx="1.75" fill={c2} opacity=".25" />)}{bar(42, 18, 8)}{bar(56, 26, 8)}{bar(70, 34, 8)}
      <circle cx="104" cy="70" r="15" fill={A} /><circle cx="104" cy="70" r="10" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2" /><path d="M100 70h8M104 66v8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></>,
    bank: <>{shadow}<path d="M28 34L72 12l44 22z" fill={A} /><rect x="30" y="34" width="84" height="7" rx="2" fill={B} />{[38, 56, 74, 92].map((x) => <rect key={x} x={x} y="44" width="10" height="32" rx="2" fill={C} />)}
      <rect x="26" y="76" width="92" height="8" rx="2" fill={A} />{[0, 1, 2].map((i) => <ellipse key={i} cx="118" cy={70 - i * 6} rx="12" ry="4.5" fill={i === 2 ? B : A} stroke="#fff" strokeOpacity=".5" />)}</>,
    vat: <>{shadow}<path d="M70 8l34 12v24c0 22-15 36-34 44-19-8-34-22-34-44V20z" fill={A} /><path d="M70 16l26 9v19c0 17-11 28-26 35z" fill={B} opacity=".55" />
      <path d="M55 48l11 11 20-22" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></>,
    reports: <>{shadow}<rect x="58" y="12" width="58" height="72" rx="6" fill={B} stroke={c1} strokeOpacity=".3" /><path d="M66 66l12-14 10 8 18-22" fill="none" stroke={c2} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {[24, 32].map((y) => <rect key={y} x="66" y={y} width="34" height="3.5" rx="1.75" fill={c2} opacity=".25" />)}
      <circle cx="44" cy="54" r="26" fill={C} /><path d="M44 54V28a26 26 0 0 1 24 16z" fill={A} /><circle cx="44" cy="54" r="11" fill="#fff" opacity=".9" /></>,
    dash: <>{shadow}<path d="M28 74a44 44 0 0 1 88 0" fill="none" stroke={C} strokeWidth="12" strokeLinecap="round" /><path d="M28 74a44 44 0 0 1 64 -39" fill="none" stroke={A} strokeWidth="12" strokeLinecap="round" />
      <path d="M72 74L96 46" stroke={c2} strokeWidth="4" strokeLinecap="round" /><circle cx="72" cy="74" r="7" fill={A} /><circle cx="72" cy="74" r="3" fill="#fff" /></>,
    contacts: <>{shadow}{[[46, 0.85], [94, 0.85], [70, 1]].map(([x, s], i) => <g key={i} transform={`translate(${x} ${i === 2 ? 52 : 46}) scale(${s})`}><circle cx="0" cy="-16" r="12" fill={i === 2 ? A : C} /><path d="M-20 26c0-16 9-26 20-26s20 10 20 26z" fill={i === 2 ? A : C} /><circle cx="-4" cy="-19" r="4" fill="#fff" opacity=".5" /></g>)}</>,
    org: <>{shadow}<rect x="32" y="22" width="40" height="62" rx="4" fill={A} />{[30, 42, 54, 66].map((y) => [38, 54].map((x) => <rect key={x + "-" + y} x={x} y={y} width="10" height="7" rx="1.5" fill="#fff" opacity=".6" />))}
      <rect x="78" y="44" width="34" height="40" rx="4" fill={C} />{[52, 64].map((y) => [84, 98].map((x) => <rect key={x + "-" + y} x={x} y={y} width="8" height="6" rx="1.5" fill="#fff" opacity=".6" />))}<path d="M76 44l19-12 19 12z" fill={B} /></>,
    users: <>{shadow}<rect x="30" y="20" width="84" height="58" rx="8" fill={B} stroke={c1} strokeOpacity=".3" /><circle cx="54" cy="44" r="10" fill={A} /><path d="M38 70c0-10 7-16 16-16s16 6 16 16z" fill={A} />
      {[38, 48, 58].map((y, i) => <rect key={y} x="76" y={y} width={i === 2 ? 20 : 28} height="4" rx="2" fill={c2} opacity=".3" />)}<circle cx="110" cy="28" r="12" fill={A} /><path d="M105 28l3.5 3.5 6.5-7" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /></>,
    settings: <>{shadow}<g transform="translate(70 50)"><path d="M-6 -36h12l2 9 7 3 8-5 8 8-5 8 3 7 9 2v12l-9 2-3 7 5 8-8 8-8-5-7 3-2 9h-12l-2-9-7-3-8 5-8-8 5-8-3-7-9-2v-12l9-2 3-7-5-8 8-8 8 5 7-3z" fill={A} />
      <circle r="13" fill="#fff" opacity=".85" /><circle r="6" fill={C} /></g></>,
  };
  return <svg className="app-art" viewBox="0 0 140 100" width={140 * size} height={100 * size} aria-hidden="true">{G}{art[kind]}</svg>;
}

/* The hero's skyline: towers, a sail and a spire in soft light. */
const Skyline = () => <svg className="ah-sky" viewBox="0 0 1200 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs><linearGradient id="sky-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--sky-1)" stopOpacity=".9" /><stop offset="1" stopColor="var(--sky-2)" stopOpacity=".15" /></linearGradient>
    <linearGradient id="sky-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--sky-1)" stopOpacity=".45" /><stop offset="1" stopColor="var(--sky-2)" stopOpacity="0" /></linearGradient></defs>
  <path fill="url(#sky-b)" d="M0 220V150h40v-30h26v-22h18v52h30V96h22v-26h12v26h18v54h40v-70h34v70h26v-44h30v44h44v-90h10V48h6v12h10v120h30v-60h40v60h50V110h26V84h22v26h20v110h40v-80h30v80h40v-58h36v58h34V92h30v128h40v-46h38v46h40v-70h26v70h42v-36h40v36h30z" />
  <path fill="url(#sky-f)" d="M0 220v-36h52v-24h30v60h36v-48h28v48h24V150h20v-22h14v92h28v-60h34v60h22V118h16v-30h10V54l6-34 6 34v34h10v30h16v102h30v-70h36v70h40V140c18-26 40-38 64-40-8 18-10 52-6 120h30v-82h34v82h38v-56h28v56h30V128h18v-18h14v18h16v92h44v-60h30v60h36v-44h34v44h40v-30h28v30z" />
</svg>;

/* ------------------------------------------------------------------- home */
/* Just the search box and the apps — all of them in one view, with nothing to scroll. */
function AppsHome({ state, books, user, go, openApp, allowed, counts, cmdItems, openSearch }) {
  const [q, setQ] = useState(""), [hi, setHi] = useState(0);
  const ctx = { state, books, counts };
  const apps = APPS.filter((a) => appOpen(a, allowed));
  const results = useMemo(() => (q.trim() ? cmdItems.map((i) => ({ i, s: searchScore(q, i.label + " " + (i.hint || "") + " " + (i.search || ""), [i.label]) })).filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s).slice(0, 8).map((x) => x.i) : []), [q, cmdItems]);
  const run = (i) => { setQ(""); i.act(); };
  /* Approvers are told what waits for them, in one line. */
  const waiting = allowed("purchase_orders") ? awaitingMe(state, user) : [];
  return <div className="ah">
    <div className="ah-bg" aria-hidden="true"><div className="ah-glow g1" /><div className="ah-glow g2" /><Skyline /></div>
    <div className="ah-search-wrap">
      <label className={cx("ah-search", q && "typing")}>
        <Search size={21} strokeWidth={2.2} />
        <input value={q} placeholder="Search invoices, customers, products, reports…" aria-label="Search everything"
          onChange={(e) => { setQ(e.target.value); setHi(0); }}
          onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === "Enter" && results[hi]) run(results[hi]); else if (e.key === "Escape") setQ(""); }} />
        <kbd>{MOD === "⌘" ? "⌘ K" : "Ctrl K"}</kbd>
        <button type="button" className="ah-spark" title="Open the full search" aria-label="Open the full search" onClick={openSearch}><Sparkles size={17} /></button>
      </label>
      {q.trim() && <div className="ah-results" role="listbox" aria-label="Search results">
        {results.length ? results.map((r, i) => { const I = r.icon || Search; return <button key={r.key} role="option" aria-selected={i === hi} className={cx("ah-res", i === hi && "on")}
          onMouseEnter={() => setHi(i)} onClick={() => run(r)}><span className="ic"><I size={15} /></span><span className="t">{r.label}</span>{r.hint && <span className="h">{r.hint}</span>}</button>; })
          : <div className="ah-nores">Nothing matches “{q}”</div>}
      </div>}
      {waiting.length > 0 && <button className="ah-note" onClick={() => go("purchase_orders", "__pending__")}><i />
        {nPlural(waiting.length, "purchase order")} waiting for your approval<b>Review<ChevronRight size={14} strokeWidth={2.4} /></b></button>}
    </div>
    <div className="ah-grid" role="list" aria-label="Apps">{apps.map((a, i) => <button key={a.id} role="listitem" className="ah-card" data-app={a.id} style={{ "--a1": a.tone[0], "--a2": a.tone[1], "--i": i }} onClick={() => openApp(a)}>
      <span className="ah-ic"><a.icon size={25} strokeWidth={2} /></span>
      <AppArt kind={a.art} tone={a.tone} />
      <span className="ah-txt"><b>{a.name}</b><small>{a.desc}</small></span>
      <em>{a.records(ctx)}</em>
      <span className="ah-go" aria-hidden="true"><ArrowUpRight size={15} strokeWidth={2.3} /></span>
    </button>)}</div>
  </div>;
}

/* ------------------------------------------------------------ app overview */
const countOf = (k, state, counts) => {
  if (counts[k] != null) return counts[k];
  const P = PARTNERS, s = state;
  return ({ customers: P.filter((p) => p.role === "customer").length, vendors: P.filter((p) => p.role === "vendor").length, products: PRODUCTS.filter((p) => !isSetupItem(p)).length,
    categories: CATEGORIES.length, pricelists: (s.priceLists || []).length, salespeople: (s.salespeople || []).length, accounts: ACCOUNTS.length, journal: s.manual.length,
    assets: (s.assets || []).length, methods: METHODS.length, stock_count: (s.stockOps || []).filter((o) => o.kind !== "scrap").length, scrap: (s.stockOps || []).filter((o) => o.kind === "scrap").length,
    users: (s.users || []).length, branches: (s.branches || []).length, companies: companyList().length, payments: s.payments.length,
    expenses: docsOf(s, "bill").filter((d) => d.note === "Recorded through Expenses").length })[k];
};

function AppOverview({ app, state, books, user, go, quickAdd, allowed, canAdd, counts }) {
  let _open; const ctx = { state, books, counts, open: () => _open || (_open = openAmounts(state)) };
  const kpis = app.kpis ? app.kpis(ctx) : [];
  const { top, groups } = appSections(app.id, allowed);
  /* The cards are what you operate — transactions and master data; Reporting and Configuration sit on the side. Up to five cards share one row. */
  const cards = ["work", "filing", "records"].filter((k) => top[k].length).map((k) => [KIND_TITLE[k], top[k]]);
  const row = cards.reduce((n, [, ks]) => n + ks.length, 0) <= 5, side = groups;
  const creates = (app.create || []).filter((k) => allowed(k) && canAdd(k));
  const recent = app.recent ? app.recent(ctx) : null;
  const item = (k) => navItem(k) || { k, l: k, i: FileText };
  return <div className="ao" style={{ "--a1": app.tone[0], "--a2": app.tone[1] }}>
    <section className="ao-head">
      <span className="ao-ic"><app.icon size={28} strokeWidth={1.9} /></span>
      <div className="ao-t"><h1>{app.name}</h1><p>{app.about || app.desc}</p></div>
      {creates.length > 0 && <div className="ao-acts">{creates.map((k, i) => <Btn key={k} kind={i === 0 ? "pri" : undefined} icon={Plus} onClick={() => quickAdd(k)}>
        {CREATE_LABEL[k] || "New " + item(k).l.toLowerCase()}</Btn>)}</div>}
      <AppArt kind={app.art} tone={app.tone} size={1.2} />
    </section>
    {kpis.length > 0 && <div className="ao-kpis">{kpis.map(([l, v, sub, tone], i) => <div key={l} className={cx("ao-kpi", tone)} style={{ "--i": i }}>
      <small>{l}</small><b>{v}</b>{sub && <span>{sub}</span>}</div>)}</div>}
    <div className={cx("ao-body", !side.length && "solo")}>
      <div className="ao-main">
        {app.id === "purchase" && <ApprovalInbox state={state} user={user} go={go} />}
        <div className={cx("ao-split", row && "row")}>{cards.map(([title, ks]) => <section key={title} className="ao-sec" data-kind={title} style={row ? { flex: ks.length } : undefined}>
          <h2 className="ao-h">{title}</h2>
          <div className="ao-grid" style={row ? { gridTemplateColumns: `repeat(${ks.length},minmax(0,1fr))` } : undefined}>{ks.map((k) => { const it = item(k), I = it.i || FileText, n = countOf(k, state, counts);
            const add = it.add && canAdd(k);
            return <div key={k} className={cx("ao-card", add && "has-new")} data-k={k}>
              <button className="ao-open" onClick={() => go(k)}><span className="ao-sic"><I size={19} strokeWidth={1.9} /></span>
                <span className="ao-st"><b>{tabLabel(k)}</b><small>{SCREEN_INFO[k] || ""}</small></span>{n != null && <em>{n.toLocaleString("en-US")}</em>}</button>
              {add && <button className="ao-new" onClick={() => quickAdd(k)} title={CREATE_LABEL[k] || `New — ${it.l}`} aria-label={`Create new: ${it.l}`}><Plus size={15} strokeWidth={2.4} /></button>}
            </div>; })}</div>
        </section>)}</div>
        {recent && <section className="ao-sec ao-recent">
          <div className="ao-h"><h2>{recent.title}</h2><button className="ao-all" onClick={() => go(...recent.all)}>View all<ChevronRight size={14} /></button></div>
          <div className="ao-list">{recent.rows.length ? recent.rows.map((r) => <button key={r.key} className="ao-li" onClick={() => go(r.k, r.p)}>
            <span className="li-ic"><r.icon size={16} strokeWidth={2} /></span>
            <span className="li-t"><b>{r.t}</b><small>{r.s}</small></span>
            <span className="li-d">{r.date ? dmy(r.date) : ""}</span>
            <span className="li-a">{r.amtText || money(r.amt, false)}</span>
            <span className="li-s">{r.st && <Pill tone={r.st.tone} dot>{r.st.label}</Pill>}</span>
            <ChevronRight size={15} className="li-cv" /></button>)
            : <div className="ao-empty">{recent.empty || "Nothing yet."}</div>}</div>
        </section>}
      </div>
      {side.length > 0 && <aside className="ao-side">{side.map(([g, ks]) => <section key={g} className="ao-panel" data-group={g}>
        <h2 className="ao-h">{g}</h2>
        {ks.map((k) => { const it = item(k), I = tabIcon(k), n = /^r_/.test(k) ? null : countOf(k, state, counts);
          return <div key={k} className="ao-row" data-k={k}>
            <button className="ao-ro" onClick={() => go(k)}><span className="ri"><I size={15} strokeWidth={2} /></span><span className="rl">{tabLabel(k)}</span>
              {n != null && <em>{n.toLocaleString("en-US")}</em>}<ChevronRight size={14} className="rc" /></button>
            {it.add && canAdd(k) && <button className="ao-rn" onClick={() => quickAdd(k)} title={CREATE_LABEL[k] || `New — ${it.l}`} aria-label={`Create new: ${it.l}`}><Plus size={14} strokeWidth={2.4} /></button>}
          </div>; })}
      </section>)}</aside>}
    </div>
  </div>;
}

/* ------------------------------------------------------ apps mode: top bar */
/* The left of the top bar in the apps mode: the apps button, the app (click it to jump to another app) and its menu. On Home, the logo. */
function AppBarNav({ view, app, go, openApp, allowed }) {
  const [open, setOpen] = useState(null), [fit, setFit] = useState(99);
  const navRef = React.useRef(null), measRef = React.useRef(null);
  React.useEffect(() => setOpen(null), [view, app && app.id]);
  React.useEffect(() => { if (!open) return; const esc = (e) => { if (e.key === "Escape") setOpen(null); }; window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc); }, [open]);
  /* Tabs that do not fit go into "More", measured against the room the bar actually has. */
  React.useLayoutEffect(() => {
    const nav = navRef.current, meas = measRef.current; if (!nav || !meas) return;
    const calc = () => {
      const ws = [...meas.children].map((c) => c.getBoundingClientRect().width + 4), more = ws.pop() || 70, room = nav.getBoundingClientRect().width - 18;
      let used = 0, n = 0;
      for (; n < ws.length; n++) { const rest = n < ws.length - 1 ? more : 0; if (used + ws[n] + rest > room) break; used += ws[n]; }
      setFit(n);
    };
    calc();
    let ro; try { ro = new ResizeObserver(calc); ro.observe(nav); } catch (e) { window.addEventListener("resize", calc); }
    return () => { if (ro) ro.disconnect(); else window.removeEventListener("resize", calc); };
  }, [app && app.id]);
  if (!app) return <div className="ab-l"><button className="ab-brand" onClick={() => go("home")} aria-label="InvoEez — Home">
    <span className="ab-mark"><img src={BRAND_MARK} alt="" /></span><span className="ab-word">Invo<em>Eez</em></span></button></div>;
  const items = (APP_MENUS[app.id] || []).map((x) => (typeof x === "string" ? (allowed(x) ? x : null) : ((g) => (g.length ? [x[0], g] : null))(x[1].filter(allowed)))).filter(Boolean);
  const pick = (k) => { setOpen(null); go(k); };
  const phone = () => { try { return window.matchMedia("(max-width:900px)").matches; } catch (e) { return false; } };
  const scrim = <div className="pop-scrim" onMouseDown={() => setOpen(null)} />;
  const entry = (k, head) => { const I = tabIcon(k); return <React.Fragment key={k}>{head && <div className="ab-mh">{head}</div>}
    <button role="menuitem" data-k={k} className={cx(view === k && "on")} onClick={() => pick(k)}><span className="mi"><I size={14} /></span>{tabLabel(k)}</button></React.Fragment>; };
  return <div className="ab-l" style={{ "--a1": app.tone[0], "--a2": app.tone[1] }}>
    <button className="ab-grid" onClick={() => go("home")} title="All apps" aria-label="All apps"><Grip size={18} /></button>
    <div className="ab-appwrap">
      <button className={cx("ab-app", (open === "__apps" || open === "__menu") && "open")} onClick={() => setOpen(open ? null : phone() ? "__menu" : "__apps")}
        aria-haspopup="menu" aria-expanded={open === "__apps" || open === "__menu"} aria-label={`${app.name} — switch app`}>
        <span className="ab-ic"><app.icon size={16} strokeWidth={2.1} /></span><b>{app.name}</b><ChevronDown size={14} className="ab-cv" /></button>
      {open === "__apps" && <>{scrim}
        <div className="ab-switch" role="menu" aria-label="Switch app">
          <div className="ab-sw-head"><span>Switch app</span><button onClick={() => go("home")}><Grip size={13} />All apps</button></div>
          <div className="ab-sw-grid">{APPS.filter((a) => appOpen(a, allowed)).map((a) => <button key={a.id} role="menuitem" data-app={a.id} className={cx("ab-sw", a.id === app.id && "on")}
            style={{ "--a1": a.tone[0], "--a2": a.tone[1] }} onClick={() => { setOpen(null); openApp(a); }}><span className="sw-ic"><a.icon size={19} strokeWidth={2} /></span><span className="sw-n">{a.name}</span></button>)}</div>
        </div></>}
    </div>
    <nav className="ab-tabs" ref={navRef} aria-label={`${app.name} menu`}>
    <div className="ab-measure" ref={measRef} aria-hidden="true">{items.map((it) => <span key={typeof it === "string" ? it : it[0]} className="ab-tab">{typeof it === "string" ? tabLabel(it) : <>{it[0]}<ChevronDown size={13} /></>}</span>)}
      <span className="ab-tab">More<ChevronDown size={13} /></span></div>
    {items.slice(0, fit).map((it) => typeof it === "string"
      ? <button key={it} data-k={it} className={cx("ab-tab", view === it && "on")} aria-current={view === it ? "page" : undefined} onClick={() => pick(it)}>{tabLabel(it)}</button>
      : <div key={it[0]} className="ab-dd">
          <button className={cx("ab-tab", it[1].includes(view) && "on", open === it[0] && "open")} aria-haspopup="menu" aria-expanded={open === it[0]} onClick={() => setOpen(open === it[0] ? null : it[0])}>
            {it[0]}<ChevronDown size={13} /></button>
          {open === it[0] && <>{scrim}<div className="ab-menu" role="menu">{it[1].map((k) => entry(k))}</div></>}
        </div>)}
    {fit < items.length && <div className="ab-dd">
      <button className={cx("ab-tab", items.slice(fit).some((it) => (typeof it === "string" ? it === view : it[1].includes(view))) && "on", open === "__more" && "open")} aria-haspopup="menu" aria-expanded={open === "__more"}
        onClick={() => setOpen(open === "__more" ? null : "__more")}>More<ChevronDown size={13} /></button>
      {open === "__more" && <>{scrim}
        <div className="ab-menu right" role="menu">{items.slice(fit).map((it) => typeof it === "string" ? [[null, it]] : it[1].map((k, i) => [i === 0 ? it[0] : null, k])).flat().map(([head, k]) => entry(k, head))}</div></>}
    </div>}
    </nav>
    {open === "__menu" && <>{scrim}
      <div className="ab-sheet" role="menu" aria-label={`${app.name} menu`}>
        <button className="ab-sheet-home" onClick={() => go("home")}><Grip size={15} />All apps</button>
        {items.map((it) => typeof it === "string" ? [[null, it]] : it[1].map((k, i) => [i === 0 ? it[0] : null, k])).flat().map(([head, k]) => entry(k, head))}
      </div></>}
  </div>;
}

/* Settings › Navigation: the two ways to get around, each with a small picture of it. */
function NavChoice({ mode, setMode }) {
  const tiles = ["#4F8DFF", "#A78BFA", "#FDBA74", "#34D399", "#22D3EE", "#FB7185"];
  return <div className="nav-choice" role="radiogroup" aria-label="Navigation">{[
    ["sidebar", "Sidebar", "Every screen in a menu on the left, grouped the classic way. Opens on the dashboard."],
    ["apps", "Apps dashboard", "Home shows your apps. Each app has its own menu across the top — no sidebar."]].map(([k, t, d]) =>
    <button key={k} role="radio" aria-checked={mode === k} className={cx("nc-opt", mode === k && "on")} data-mode={k} onClick={() => setMode(k)}>
      <span className={cx("nc-prev", k)} aria-hidden="true">{k === "sidebar"
        ? <><i className="pv-side"><i /><i /><i /><i /><i /></i><i className="pv-main"><i className="pv-top" /><i className="pv-cards"><i /><i /><i /></i><i className="pv-rows"><i /><i /><i /></i></i></>
        : <><i className="pv-bar"><i /><i /><i /><i /></i><i className="pv-apps">{tiles.map((c) => <i key={c} style={{ background: c }} />)}</i></>}</span>
      <span className="nc-txt"><span className="nc-t"><b>{t}</b>{mode === k ? <Pill tone="ok">In use</Pill> : <span className="nc-use">Use this</span>}</span><small>{d}</small></span>
    </button>)}</div>;
}

const APPS_CSS = `
/* ---- Home: the search box and every app, in one view ---- */
.mz{--sky-1:#9DB8E8;--sky-2:#DCE7F8}
.mz[data-theme="dark"]{--sky-1:#2C4677;--sky-2:#14213D}
.mz[data-nav="apps"].on-home .page{overflow-x:hidden;background-color:#F2F5FC;
  background-image:radial-gradient(1000px 520px at 6% -10%,color-mix(in srgb,var(--brand) 14%,transparent),transparent 62%),radial-gradient(900px 520px at 100% 0%,rgba(255,196,160,.26),transparent 62%),
    linear-gradient(180deg,#EEF3FC 0%,#F4F2FD 55%,#FBF5EF 100%)}
.mz[data-theme="dark"][data-nav="apps"].on-home .page{background-color:#0D1426;
  background-image:radial-gradient(1000px 520px at 6% -10%,rgba(76,110,190,.32),transparent 62%),radial-gradient(900px 520px at 100% 0%,rgba(160,90,200,.18),transparent 62%),
    linear-gradient(180deg,#0E1830 0%,#121A31 55%,#17152C 100%)}
.mz[data-nav="apps"].on-home .page>.view{max-width:1440px}
.ah{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(100vh - 112px);padding:22px 0 44px}
.ah-bg{position:absolute;top:-30px;bottom:-60px;left:calc(50% - 50vw);width:100vw;pointer-events:none;z-index:0;overflow:hidden}
.ah-glow{position:absolute;border-radius:50%;filter:blur(50px);opacity:.6}
.ah-glow.g1{width:460px;height:460px;left:4%;top:-200px;background:color-mix(in srgb,var(--brand) 20%,transparent)}
.ah-glow.g2{width:420px;height:420px;right:3%;top:32%;background:rgba(255,170,120,.2)}
.ah-sky{position:absolute;left:0;right:0;bottom:0;width:100%;height:180px;opacity:.5}
.ah-search-wrap{position:relative;z-index:6;width:100%;max-width:720px;margin:0 auto 34px;display:flex;flex-direction:column;align-items:center;animation:ahUp .6s cubic-bezier(.22,1,.36,1) both}
.ah-search{display:flex;align-items:center;gap:13px;width:100%;height:60px;padding:0 9px 0 22px;border-radius:999px;background:var(--surface);color:var(--ink-3);
  border:1px solid color-mix(in srgb,var(--brand) 14%,var(--line));box-shadow:0 1px 2px rgba(19,26,43,.05),0 18px 40px -14px rgba(40,70,140,.26);transition:box-shadow .25s,border-color .25s}
.ah-search:focus-within{border-color:color-mix(in srgb,var(--brand) 55%,var(--line));box-shadow:0 0 0 5px color-mix(in srgb,var(--brand) 13%,transparent),0 18px 44px -12px color-mix(in srgb,var(--brand) 35%,transparent)}
.mz[data-theme="dark"] .ah-search{box-shadow:0 18px 44px -14px rgba(0,0,0,.6)}
.ah-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:16.5px;color:var(--ink)}
.ah-search input::placeholder{color:var(--ink-3)}
.ah-search kbd{font-family:var(--sans);font-size:11.5px;font-weight:600;padding:5px 9px;border-radius:8px;background:var(--surface-2);color:var(--ink-3);border:1px solid var(--line)}
.ah-spark{width:42px;height:42px;flex:0 0 42px;border-radius:50%;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--brand),#8B5CF6);box-shadow:0 8px 20px -4px color-mix(in srgb,var(--brand) 55%,transparent);transition:transform .2s}
.ah-spark:hover{transform:rotate(12deg) scale(1.06)}
.ah-results{position:absolute;left:14px;right:14px;top:68px;z-index:2;padding:6px;border-radius:18px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-3);text-align:left;max-height:380px;overflow:auto;animation:ahUp .2s ease both}
.ah-res{display:flex;align-items:center;gap:11px;width:100%;padding:9px 12px;border-radius:11px;font-size:13.5px;color:var(--ink);text-align:left}
.ah-res.on{background:var(--brand-50)}.ah-res .ic{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--surface-2);color:var(--brand);flex:0 0 auto}
.ah-res .t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ah-res .h{font-size:11.5px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:42%}
.ah-nores{padding:14px;font-size:13px;color:var(--ink-3);text-align:center}
.ah-note{display:inline-flex;align-items:center;gap:10px;margin-top:14px;height:36px;padding:0 5px 0 14px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font-size:13px;color:var(--ink-2);box-shadow:var(--sh-1);transition:border-color .2s}
.ah-note:hover{border-color:color-mix(in srgb,var(--brand) 40%,var(--line))}
.ah-note i{width:8px;height:8px;border-radius:50%;background:#D97706;box-shadow:0 0 0 4px rgba(217,119,6,.18)}
.ah-note b{display:inline-flex;align-items:center;gap:2px;height:26px;padding:0 8px 0 11px;border-radius:999px;background:var(--brand-50);color:var(--brand);font-weight:650;font-size:12.5px}
@keyframes ahUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.ah-grid{position:relative;z-index:1;width:100%;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:18px}
.ah-card{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:flex-start;min-height:190px;padding:18px 18px 16px;border-radius:22px;text-align:left;
  background:var(--surface);border:1px solid color-mix(in srgb,var(--a1) 16%,var(--line));box-shadow:0 1px 2px rgba(19,26,43,.04),0 12px 30px -16px rgba(19,26,43,.2);
  transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s,border-color .3s;animation:ahCard .6s calc(var(--i) * 35ms + .08s) cubic-bezier(.22,1,.36,1) both}
.ah-card::before{content:"";position:absolute;inset:0;background:radial-gradient(260px 180px at 100% 0%,color-mix(in srgb,var(--a1) 17%,transparent),transparent 70%);pointer-events:none;opacity:.85;transition:opacity .3s}
.ah-card:hover{transform:translateY(-4px);border-color:color-mix(in srgb,var(--a1) 48%,var(--line));box-shadow:0 26px 44px -20px color-mix(in srgb,var(--a2) 50%,transparent)}
.ah-card:hover::before{opacity:1}
.ah-card:focus-visible{outline:2px solid var(--a2);outline-offset:3px}
@keyframes ahCard{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
.ah-ic{position:relative;z-index:1;width:54px;height:54px;flex:0 0 54px;border-radius:17px;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,var(--a1),var(--a2));
  box-shadow:0 12px 22px -8px color-mix(in srgb,var(--a2) 65%,transparent),inset 0 1px 0 rgba(255,255,255,.35)}
.ah-card .app-art{position:absolute;top:6px;right:2px;width:min(100px,46%);height:auto;opacity:.95;transition:transform .45s cubic-bezier(.22,1,.36,1)}
.ah-card:hover .app-art{transform:translate(-3px,2px) scale(1.05)}
.ah-txt{position:relative;z-index:1;display:flex;flex-direction:column;min-width:0;width:100%;margin-top:auto;padding-top:16px}
.ah-txt b{font-size:16px;font-weight:700;letter-spacing:-.015em;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ah-txt small{font-size:12.5px;line-height:1.4;color:var(--ink-3);margin-top:3px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.8em}
.ah-card em{position:relative;z-index:1;display:inline-flex;align-items:center;gap:7px;max-width:calc(100% - 30px);margin-top:10px;font-style:normal;font-size:11.5px;font-weight:600;color:var(--ink-2);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.ah-card em::before{content:"";flex:0 0 6px;width:6px;height:6px;border-radius:50%;background:var(--a1);box-shadow:0 0 0 3px color-mix(in srgb,var(--a1) 22%,transparent)}
.ah-go{position:absolute;right:14px;bottom:14px;z-index:1;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;color:#fff;background:var(--a2);opacity:0;transform:translate(-4px,4px) scale(.8);transition:opacity .25s,transform .3s cubic-bezier(.22,1,.36,1)}
.ah-card:hover .ah-go,.ah-card:focus-visible .ah-go{opacity:1;transform:none}
@media(max-width:1180px){.ah-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:820px){.ah-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}}
@media(max-height:760px) and (min-width:901px){.ah{padding:12px 0 24px}.ah-search-wrap{margin-bottom:24px}.ah-search{height:54px}.ah-card{min-height:168px;padding:15px 16px 14px}.ah-ic{width:48px;height:48px;flex-basis:48px;border-radius:15px}.ah-txt{padding-top:12px}}
@media(max-width:650px){.ah{min-height:0;padding:18px 0 28px;justify-content:flex-start}.ah-search{height:52px;padding-left:16px}.ah-search kbd{display:none}.ah-spark{width:38px;height:38px;flex-basis:38px}
  .ah-search-wrap{margin-bottom:20px}.ah-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.ah-card{min-height:150px;padding:14px;border-radius:18px}.ah-ic{width:44px;height:44px;flex-basis:44px;border-radius:14px}
  .ah-card .app-art{width:76px}.ah-txt b{font-size:14.5px}.ah-txt small{font-size:11.5px}.ah-go{display:none}}

/* ---- apps mode: a light top bar with the app and its menu ---- */
.mz[data-nav="apps"] .topbar{display:flex;align-items:center;grid-template-columns:none;position:sticky;top:0;z-index:40;height:64px;flex:0 0 64px;min-height:64px;padding:0 18px 0 12px;gap:10px;
  background:var(--surface);border-bottom:1px solid var(--line);box-shadow:0 1px 2px rgba(19,26,43,.03),0 10px 24px -18px rgba(19,26,43,.22);color:var(--ink)}
/* Opaque, so no backdrop blur: a blur would make the bar the frame for its pop-ups and keep them from covering the page. */
.mz[data-nav="apps"] .topbar{backdrop-filter:none;-webkit-backdrop-filter:none}
.mz[data-nav="apps"] .topbar.in-app{background-image:linear-gradient(90deg,color-mix(in srgb,var(--a1) 10%,transparent),transparent 36%)}
.ab-l{display:flex;align-items:center;gap:4px;min-width:0;flex:1 1 0;height:100%}
.ab-brand{display:flex;align-items:center;gap:10px;height:46px;padding:0 12px 0 4px;border-radius:14px;transition:background .15s}
.ab-brand:hover{background:var(--surface-2)}
.ab-mark{width:40px;height:40px;flex:0 0 40px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(145deg,#22365E,#0E1830);box-shadow:0 8px 16px -8px rgba(14,24,48,.7),inset 0 1px 0 rgba(255,255,255,.12)}
.ab-mark img{width:31px;height:31px;object-fit:contain}
.ab-word{font-size:21px;font-weight:800;letter-spacing:-.035em;color:var(--ink);line-height:1}
.ab-word em{font-style:normal;background:linear-gradient(90deg,var(--brand),#7C5CF5);-webkit-background-clip:text;background-clip:text;color:transparent}
.ab-grid{width:40px;height:40px;flex:0 0 40px;border-radius:12px;display:grid;place-items:center;color:var(--ink-2);transition:background .15s,color .15s}
.ab-grid:hover{background:var(--surface-2);color:var(--ink)}
.ab-appwrap{position:relative;flex:0 0 auto}
.ab-app{display:flex;align-items:center;gap:10px;height:44px;padding:0 9px 0 6px;border-radius:13px;color:var(--ink);transition:background .15s}
.ab-app:hover,.ab-app.open{background:var(--surface-2)}
.ab-app b{font-size:15.5px;font-weight:720;letter-spacing:-.015em;white-space:nowrap}
.ab-ic{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,var(--a1),var(--a2));box-shadow:0 6px 14px -4px color-mix(in srgb,var(--a2) 60%,transparent),inset 0 1px 0 rgba(255,255,255,.3)}
.ab-cv{color:var(--ink-3);transition:transform .2s}.ab-app.open .ab-cv{transform:rotate(180deg)}
.ab-tabs{position:relative;display:flex;align-items:center;gap:2px;min-width:0;flex:1 1 auto;height:100%;margin-left:8px;padding-left:12px;overflow:visible}
.ab-tabs::before{content:"";position:absolute;left:0;top:20px;bottom:20px;width:1px;background:var(--line)}
.ab-measure{position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;display:flex;gap:2px;visibility:hidden;pointer-events:none;white-space:nowrap}.ab-measure>*{flex:0 0 auto}
.ab-tab{position:relative;display:inline-flex;align-items:center;gap:4px;height:38px;padding:0 13px;border-radius:10px;font-size:13.5px;font-weight:560;color:var(--ink-2);white-space:nowrap;transition:color .15s,background .15s}
.ab-tab:hover,.ab-tab.open{color:var(--ink);background:var(--surface-2)}
.ab-tab.on{color:var(--ink);font-weight:650}
.ab-tab.on::after{content:"";position:absolute;left:13px;right:13px;bottom:-13px;height:3px;border-radius:3px 3px 0 0;background:linear-gradient(90deg,var(--a1),var(--a2))}
.ab-tab svg{opacity:.6}
.ab-dd{position:relative}
.ab-menu{position:absolute;top:calc(100% + 19px);left:0;z-index:1300;min-width:240px;padding:6px;border-radius:14px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-3);animation:ahUp .18s ease both}
.ab-menu.right{left:auto;right:0}
.ab-mh{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-4);font-weight:650;padding:9px 10px 4px}
.ab-menu button,.ab-sheet button{display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border-radius:9px;font-size:13.5px;color:var(--ink);text-align:left}
.ab-menu button:hover,.ab-sheet button:hover{background:var(--surface-2)}.ab-menu button.on,.ab-sheet button.on{background:color-mix(in srgb,var(--a1) 12%,var(--surface));color:var(--a2);font-weight:600}
.ab-menu .mi,.ab-sheet .mi{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:color-mix(in srgb,var(--a1) 12%,var(--surface));color:var(--a2);flex:0 0 auto}
.ab-switch{position:absolute;top:calc(100% + 13px);left:0;z-index:1300;width:432px;padding:12px;border-radius:18px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-3);animation:ahUp .18s ease both}
.ab-sw-head{display:flex;align-items:center;justify-content:space-between;padding:2px 4px 10px}
.ab-sw-head span{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-4);font-weight:650}
.ab-sw-head button{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:8px;font-size:12.5px;font-weight:600;color:var(--brand)}
.ab-sw-head button:hover{background:var(--brand-50)}
.ab-sw-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}
.ab-sw{display:flex;flex-direction:column;align-items:center;gap:7px;padding:12px 4px 10px;border-radius:12px;text-align:center;transition:background .15s}
.ab-sw:hover{background:var(--surface-2)}.ab-sw.on{background:color-mix(in srgb,var(--a1) 12%,var(--surface))}
.sw-ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,var(--a1),var(--a2));box-shadow:0 8px 16px -8px color-mix(in srgb,var(--a2) 70%,transparent)}
.sw-n{font-size:12px;font-weight:600;color:var(--ink);line-height:1.25}
.ab-sheet{position:fixed;left:10px;right:10px;top:70px;z-index:1300;max-height:calc(100vh - 84px);overflow:auto;padding:8px;border-radius:18px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-3);animation:ahUp .2s ease both}
.ab-sheet-home{color:var(--ink-2)!important;border-bottom:1px solid var(--line-2)!important;border-radius:9px 9px 0 0!important;margin-bottom:4px}
/* The right of the bar: search, New, alerts, the company and you. */
.mz[data-nav="apps"] .omni{flex:0 1 290px;min-width:40px;height:40px;margin-left:0;padding:0 7px 0 6px;gap:8px;border-radius:12px;background:var(--surface-2);border:1px solid var(--line);color:var(--ink-3);box-shadow:none}
.mz[data-nav="apps"] .omni:hover{background:var(--surface);border-color:color-mix(in srgb,var(--brand) 35%,var(--line))}
.mz[data-nav="apps"] .omni .oi{width:28px;height:28px;flex:0 0 28px;border-radius:8px;background:transparent;color:var(--ink-2)}
.mz[data-nav="apps"] .omni .ot{font-size:13px;color:var(--ink-3)}
.mz[data-nav="apps"] .omni kbd{margin-right:0;font-family:var(--sans);font-size:11px;font-weight:600;padding:3px 7px;border-radius:7px;background:var(--surface);border:1px solid var(--line);color:var(--ink-3)}
.mz[data-nav="apps"].on-home .omni{display:none}
.mz[data-nav="apps"] .tb-r{gap:8px;margin-left:0}
.mz[data-nav="apps"] .tb-div{display:none}
.mz[data-nav="apps"] .tb-icons{background:none;border:0;padding:0;gap:0}
.mz[data-nav="apps"] .tb-icons>.icon-btn{display:none}
.mz[data-nav="apps"] .topbar .icon-btn{width:40px;height:40px;border-radius:12px;color:var(--ink-2);background:transparent;border-color:transparent;box-shadow:none}
.mz[data-nav="apps"] .topbar .icon-btn:hover,.mz[data-nav="apps"] .topbar .icon-btn.on{background:var(--surface-2);color:var(--ink)}
.mz[data-nav="apps"] .topbar .btn.pri{height:40px;padding:0 16px 0 13px;border-radius:12px;font-size:13px;font-weight:600;gap:7px;box-shadow:0 8px 18px -8px color-mix(in srgb,var(--brand) 70%,transparent)}
.mz[data-nav="apps"] .topbar .coswitch{display:flex;height:42px;padding:0 10px 0 6px;gap:9px;border-radius:12px;background:var(--surface);border:1px solid var(--line);color:var(--ink)}
.mz[data-nav="apps"] .topbar .coswitch:hover{border-color:color-mix(in srgb,var(--brand) 40%,var(--line));background:var(--surface-2)}
.mz[data-nav="apps"] .coswitch .gt{background:linear-gradient(145deg,var(--brand),#7C5CF5);box-shadow:none}
.mz[data-nav="apps"] .coswitch .cx b{font-size:13px;color:var(--ink);max-width:170px}.mz[data-nav="apps"] .coswitch .cx span{font-size:11px;color:var(--ink-3)}
.mz[data-nav="apps"] .topbar .userchip{display:flex;height:42px;padding:0;gap:0;border:0;border-radius:50%;background:transparent}
.mz[data-nav="apps"] .topbar .userchip .ux,.mz[data-nav="apps"] .topbar .userchip>svg{display:none}
.mz[data-nav="apps"] .topbar .userchip .me{width:38px;height:38px;flex:0 0 38px;box-shadow:0 0 0 2px var(--surface),0 0 0 4px color-mix(in srgb,var(--brand) 22%,transparent);transition:box-shadow .2s}
.mz[data-nav="apps"] .topbar .userchip:hover .me{box-shadow:0 0 0 2px var(--surface),0 0 0 4px color-mix(in srgb,var(--brand) 50%,transparent)}
.mz[data-nav="apps"] .pop{top:70px}
.mz[data-nav="apps"] .pop-head b{color:var(--ink);font-weight:650}
.mz[data-nav="apps"] .main{width:100%}
.mz[data-nav="apps"] .page>.view{max-width:1480px;margin-left:auto;margin-right:auto}
/* Inside an app the page takes a faint wash of the app's colour, and page titles carry its name. */
.mz[data-nav="apps"] .page.in-app{background-image:radial-gradient(1400px 340px at 0 0,color-mix(in srgb,var(--a1) 8%,transparent),transparent 70%);background-repeat:no-repeat}
.mz[data-nav="apps"] .page.in-app .page-head .micro{color:var(--a2);font-weight:700}
@media(max-width:1500px){.mz[data-nav="apps"] .coswitch .cx{display:none}.mz[data-nav="apps"] .topbar .coswitch{padding:0 8px 0 6px}}
@media(max-width:1420px){.ab-tab{padding:0 10px;font-size:13px}.ab-tabs{margin-left:4px;padding-left:8px}.ab-tab.on::after{left:10px;right:10px}}
@media(max-width:1599px){.mz[data-nav="apps"] .omni .ot,.mz[data-nav="apps"] .omni kbd{display:none}.mz[data-nav="apps"] .omni{flex:0 0 40px;width:40px;min-width:40px;padding:0;justify-content:center}}
@media(max-width:900px){.ab-tabs{display:none}.mz[data-nav="apps"] .topbar{padding:0 8px;gap:6px}.ab-word{font-size:18px}.ab-mark{width:34px;height:34px;flex-basis:34px}.ab-mark img{width:27px;height:27px}
  .mz[data-nav="apps"] .topbar .coswitch,.mz[data-nav="apps"] .omni{display:none}.ab-app b{max-width:130px;overflow:hidden;text-overflow:ellipsis}
  .mz[data-nav="apps"] .topbar .btn.pri{padding:0 12px}}

/* ---- Settings › Navigation ---- */
.nav-choice{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.nav-card .setsec{padding-top:6px}
@media(min-width:1100px){.nav-card .nc-opt{flex-direction:row;align-items:center;gap:16px}.nav-card .nc-prev{flex:0 0 190px}.nav-card .nc-txt{display:flex;flex-direction:column;gap:6px;min-width:0}}
.nc-opt{display:flex;flex-direction:column;align-items:stretch;gap:9px;padding:12px;border-radius:16px;border:1.5px solid var(--line);background:var(--surface);text-align:left;transition:border-color .2s,box-shadow .2s,transform .2s}
.nc-opt:hover{border-color:color-mix(in srgb,var(--brand) 45%,var(--line));transform:translateY(-1px)}
.nc-opt.on{border-color:var(--brand);box-shadow:0 0 0 4px color-mix(in srgb,var(--brand) 14%,transparent)}
.nc-t{display:flex;align-items:center;justify-content:space-between;gap:8px}.nc-t b{font-size:14px;color:var(--ink)}
.nc-use{font-size:12px;color:var(--brand);font-weight:600}
.nc-opt small{font-size:12px;line-height:1.5;color:var(--ink-3)}
.nc-prev{display:flex;height:96px;border-radius:11px;overflow:hidden;background:var(--surface-2);border:1px solid var(--line-2)}
.nc-prev i{display:block}
.nc-prev.sidebar .pv-side{width:30%;background:linear-gradient(180deg,#15233F,#0F1B33);padding:10px 7px;display:flex;flex-direction:column;gap:6px}
.nc-prev.sidebar .pv-side i{height:5px;border-radius:3px;background:rgba(255,255,255,.28)}.nc-prev.sidebar .pv-side i:first-child{background:var(--brand);width:70%}
.nc-prev.sidebar .pv-main{flex:1;padding:8px;display:flex;flex-direction:column;gap:6px}
.nc-prev .pv-top{height:10px;border-radius:4px;background:var(--surface);border:1px solid var(--line-2)}
.nc-prev .pv-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.nc-prev .pv-cards i{height:20px;border-radius:5px;background:var(--surface);border:1px solid var(--line-2)}
.nc-prev .pv-rows{display:flex;flex-direction:column;gap:4px}.nc-prev .pv-rows i{height:6px;border-radius:3px;background:var(--line)}
.nc-prev.apps{flex-direction:column}
.nc-prev.apps .pv-bar{height:20px;background:var(--surface);display:flex;align-items:center;gap:6px;padding:0 8px;border-bottom:2px solid var(--brand);box-shadow:0 2px 6px rgba(19,26,43,.06)}
.nc-prev.apps .pv-bar i{width:20px;height:5px;border-radius:3px;background:var(--line)}.nc-prev.apps .pv-bar i:first-child{width:9px;height:9px;border-radius:3px;background:var(--brand)}
.nc-prev.apps .pv-apps{flex:1;display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding:14px 16px;align-content:center}
.nc-prev.apps .pv-apps i{aspect-ratio:1;border-radius:7px;box-shadow:0 3px 8px rgba(0,0,0,.15)}
@media(max-width:650px){.nav-choice{grid-template-columns:1fr}}

/* ---- app overview ---- */
.ao{display:flex;flex-direction:column;gap:18px;padding-top:22px}
.ao-head{position:relative;overflow:hidden;display:flex;align-items:center;gap:18px;min-height:112px;padding:22px 210px 22px 24px;border-radius:24px;
  background:radial-gradient(520px 220px at 0% 0%,color-mix(in srgb,var(--a1) 18%,transparent),transparent 70%),linear-gradient(110deg,var(--surface) 40%,color-mix(in srgb,var(--a1) 13%,var(--surface)));
  border:1px solid color-mix(in srgb,var(--a1) 22%,var(--line));box-shadow:var(--sh-1)}
.ao-ic{width:62px;height:62px;flex:0 0 62px;border-radius:19px;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,var(--a1),var(--a2));box-shadow:0 14px 26px -10px color-mix(in srgb,var(--a2) 70%,transparent),inset 0 1px 0 rgba(255,255,255,.35)}
.ao-t{flex:1;min-width:0;position:relative;z-index:1}
.mz .ao-t h1{font-size:27px;font-weight:760;letter-spacing:-.03em;margin:0;color:var(--ink)}.mz .ao-t p{margin:3px 0 0;color:var(--ink-2);font-size:14px}
.ao-acts{position:relative;z-index:1;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;max-width:56%}
.ao-head .app-art{position:absolute;right:22px;top:50%;transform:translateY(-50%);opacity:.95}
.ao-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}
.ao-kpi{position:relative;overflow:hidden;display:flex;flex-direction:column;gap:4px;padding:17px 19px 16px;border-radius:18px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-1);animation:ahUp .5s calc(var(--i) * 50ms) cubic-bezier(.22,1,.36,1) both}
.ao-kpi::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,var(--a1),var(--a2));opacity:.85}
.ao-kpi small{font-size:12.5px;font-weight:550;color:var(--ink-3)}
.ao-kpi b{font-size:24px;font-weight:760;letter-spacing:-.025em;font-variant-numeric:tabular-nums;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ao-kpi span{font-size:12px;color:var(--ink-3)}
.ao-kpi.neg b{color:var(--neg)}.ao-kpi.pos b{color:var(--pos)}.ao-kpi.warn b{color:#B45309}
.ao-body{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:18px;align-items:start}
.ao-body.solo{grid-template-columns:minmax(0,1fr)}
.ao-main,.ao-side{display:flex;flex-direction:column;gap:18px;min-width:0}
.ao-sec{display:flex;flex-direction:column;gap:12px}
.mz .ao-h,.mz .ao-h h2{margin:0;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
div.ao-h{display:flex;align-items:center;justify-content:space-between;gap:10px}
.ao-split{display:flex;flex-direction:column;gap:18px}.ao-split.row{flex-direction:row;align-items:stretch}.ao-split.row>.ao-sec{min-width:0}.ao-split.row .ao-grid{grid-auto-rows:1fr}
.ao-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.ao-card{position:relative;border-radius:18px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-1);transition:border-color .2s,box-shadow .2s,transform .2s}
.ao-card:hover{border-color:color-mix(in srgb,var(--a1) 45%,var(--line));box-shadow:0 14px 28px -16px color-mix(in srgb,var(--a2) 45%,transparent);transform:translateY(-2px)}
.ao-open{width:100%;height:100%;display:flex;flex-direction:column;align-items:flex-start;padding:16px 16px 15px;text-align:left;border-radius:inherit}
.ao-sic{width:42px;height:42px;flex:0 0 42px;border-radius:13px;display:grid;place-items:center;background:color-mix(in srgb,var(--a1) 14%,var(--surface));color:var(--a2);transition:background .2s,color .2s}
.ao-card:hover .ao-sic{background:linear-gradient(145deg,var(--a1),var(--a2));color:#fff}
.ao-st{display:flex;flex-direction:column;width:100%;min-width:0;margin-top:12px}.ao-st b{font-size:15px;font-weight:680;color:var(--ink);letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ao-st small{font-size:12px;color:var(--ink-3);line-height:1.45;margin-top:3px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.9em}
.ao-open em{position:absolute;top:16px;right:16px;font-style:normal;font-size:12.5px;font-weight:650;color:var(--ink-2);padding:3px 10px;border-radius:999px;background:var(--surface-2);font-variant-numeric:tabular-nums}
.ao-card.has-new .ao-open em{right:58px}
.ao-new{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:var(--a2);border:1px solid var(--line);background:var(--surface);transition:background .15s,border-color .15s,color .15s}
.ao-new:hover{background:linear-gradient(145deg,var(--a1),var(--a2));border-color:transparent;color:#fff}
.ao-all{display:inline-flex;align-items:center;gap:3px;font-size:12.5px;font-weight:600;color:var(--a2);text-transform:none;letter-spacing:0;padding:4px 8px;border-radius:8px}
.ao-all:hover{background:color-mix(in srgb,var(--a1) 11%,transparent)}
.ao-list{display:flex;flex-direction:column;border-radius:18px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-1);overflow:hidden}
.ao-li{display:grid;grid-template-columns:34px minmax(0,1fr) 110px 150px 150px 16px;align-items:center;gap:14px;padding:12px 16px;text-align:left;border-top:1px solid var(--line-2);transition:background .15s}
.ao-li:first-child{border-top:0}.ao-li:hover{background:var(--surface-2)}
.li-ic{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb,var(--a1) 12%,var(--surface));color:var(--a2)}
.li-t{display:flex;flex-direction:column;min-width:0}.li-t b{font-size:13.5px;font-weight:620;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.li-t small{font-size:12px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.li-d{font-size:12.5px;color:var(--ink-3);white-space:nowrap}
.li-a{font-size:13.5px;font-weight:650;color:var(--ink);text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.li-s{display:flex;justify-content:flex-start;min-width:0}.li-s .pill{white-space:nowrap}
.li-cv{color:var(--ink-4)}
.ao-empty{padding:26px;text-align:center;font-size:13px;color:var(--ink-3)}
.ao-panel{display:flex;flex-direction:column;padding:16px 10px 10px;border-radius:18px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-1)}
.ao-panel>.ao-h{padding:0 8px 8px}
.ao-row{display:flex;align-items:center;border-radius:11px;transition:background .15s}
.ao-row:hover{background:var(--surface-2)}
.ao-ro{flex:1;min-width:0;display:flex;align-items:center;gap:11px;padding:8px;text-align:left;font-size:13.5px;color:var(--ink)}
.ao-ro .ri{width:30px;height:30px;flex:0 0 30px;border-radius:9px;display:grid;place-items:center;background:color-mix(in srgb,var(--a1) 11%,var(--surface));color:var(--a2)}
.ao-ro .rl{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:550}
.ao-ro em{font-style:normal;font-size:12px;font-weight:650;color:var(--ink-3);font-variant-numeric:tabular-nums}
.ao-ro .rc{color:var(--ink-4);flex:0 0 auto}
.ao-rn{width:32px;height:32px;flex:0 0 32px;margin-right:4px;border-radius:9px;display:grid;place-items:center;color:var(--a2);opacity:.75;transition:background .15s,opacity .15s}
.ao-rn:hover{opacity:1;background:color-mix(in srgb,var(--a1) 14%,transparent)}
.ao .appr-inbox{margin:0}
@media(max-width:1240px){.ao-body{grid-template-columns:minmax(0,1fr) 300px}.ao-li{grid-template-columns:34px minmax(0,1fr) 120px 140px 16px}.ao-li .li-d{display:none}}
@media(max-width:1100px){.ao-head{padding-right:24px;flex-wrap:wrap}.ao-head .app-art{display:none}.ao-acts{max-width:none;justify-content:flex-start;flex-basis:100%}}
@media(max-width:980px){.ao-body{grid-template-columns:minmax(0,1fr)}}
@media(max-width:1100px){.ao-split.row{flex-direction:column}.ao-split.row .ao-grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))!important}}
@media(max-width:650px){.ao{padding-top:12px;gap:14px}.ao-head{padding:18px;border-radius:20px}.ao-ic{width:50px;height:50px;flex-basis:50px;border-radius:16px}.mz .ao-t h1{font-size:22px}
  .ao-kpis{grid-template-columns:1fr 1fr;gap:10px}.ao-kpi{padding:13px 14px}.ao-kpi b{font-size:18px}.ao-grid{grid-template-columns:1fr}
  .ao-li{grid-template-columns:34px minmax(0,1fr) auto;gap:10px;padding:11px 12px}.ao-li .li-s,.ao-li .li-cv{display:none}}

/* ---- the sidebar menu: each app has its colour ---- */
.sb-head .ic.app{width:24px;height:24px;border-radius:7px;color:#fff!important;background:linear-gradient(145deg,var(--a1),var(--a2));box-shadow:0 3px 8px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.3)}
.sb-head .ic.app svg{width:14px;height:14px}
.sbar.rail .sb-sec.has-on>.sb-head .ic.app{box-shadow:0 0 0 3px rgba(255,255,255,.35)}
@media (prefers-reduced-motion:reduce){.ah *,.ah,.ao *{animation:none!important}}
`;
