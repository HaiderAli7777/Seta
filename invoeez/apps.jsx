/* ============================================================================
   3.20 — InvoEez as a set of apps.
   · Home: one place to search, create and open everything — a hero with the
     search box and Create New, then every business application as a card
     (filter by Core, Finance, Insights, People, Setup).
   · Each app (Sales, Purchase, Inventory, Accounting, Bank & cash, VAT…) has
     an overview: its figures, what to create, and every screen inside it.
   · The menu is grouped by app, each with its own colour, so the same
     screens are always one or two clicks away. Nothing was taken out: every
     screen, report, document, setting and shortcut works as before.
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

/* The apps. `home` is where the card opens; `screens` are shown on its overview. */
const APPS = [
  { id: "sales", name: "Sales", icon: ShoppingBag, cat: "core", tone: ["#4F8DFF", "#1D4ED8"], home: "app_sales", art: "sales",
    desc: "Quotations, invoices and revenue", about: "Quotations, invoices and what customers owe", screens: ["quotes", "invoices", "credit_notes", "customers", "pricelists", "salespeople"],
    reports: ["r_cust", "r_aged_ar", "r_stmt", "r_branch"], create: ["invoices", "quotes", "credit_notes", "customers"],
    records: (c) => nPlural(docsOf(c.state, "invoice").length, "invoice"),
    kpis: (c) => { const r = pnl(c.books.flat, monthStart(), TODAY), ar = aging(c.state, "receivable", TODAY);
      const q = docsOf(c.state, "quote").filter((d) => ["draft", "sent", "accepted"].includes(d.state));
      return [["Sales this month", money(r.revenue, false), "AED"], ["Open quotations", String(q.length), `AED ${money(R2(q.reduce((s, d) => s + amounts(d).total, 0)), false)}`],
        ["Customers owe", money(ar.grand, false), "AED"], ["Overdue", money(overdueOf(ar), false), "AED", overdueOf(ar) > 0 ? "neg" : ""]]; } },
  { id: "purchase", name: "Purchase", icon: ShoppingCart, cat: "core", tone: ["#A78BFA", "#6D28D9"], home: "app_purchase", art: "purchase",
    desc: "Orders, bills and vendors", about: "Purchase orders, vendor bills, expenses and vendors", screens: ["purchase_orders", "bills", "debit_notes", "expenses", "vendors"],
    reports: ["r_aged_ap", "r_partner"], create: ["purchase_orders", "bills", "expenses", "vendors"],
    records: (c) => nPlural(docsOf(c.state, "bill").length, "bill"),
    kpis: (c) => { const ap = aging(c.state, "payable", TODAY);
      const month = R2(docsOf(c.state, "bill").filter((d) => d.state === "posted" && d.date >= monthStart()).reduce((s, d) => s + amounts(d).total, 0));
      return [["Bought this month", money(month, false), "AED"], ["Open purchase orders", String(c.counts.purchase_orders || 0), "awaiting approval or billing"],
        ["You owe vendors", money(ap.grand, false), "AED"], ["Overdue bills", money(overdueOf(ap), false), "AED", overdueOf(ap) > 0 ? "neg" : ""]]; } },
  { id: "inventory", name: "Inventory", icon: Warehouse, cat: "core", tone: ["#FDBA74", "#EA580C"], home: "app_inventory", art: "inventory",
    desc: "Products, stock and valuation", about: "Products, stock counts, scrap and valuation", screens: ["products", "categories", "stock_count", "scrap", "r_stock"],
    reports: ["r_prod", "r_stock"], create: ["products", "stock_count", "scrap", "categories"],
    records: (c) => nPlural(PRODUCTS.filter((p) => !isSetupItem(p)).length, "product"),
    kpis: (c) => { const st = Object.entries(c.books.stock || {}), value = R2(st.reduce((s, [, x]) => s + x.value, 0));
      const goods = PRODUCTS.filter((p) => p.kind === "goods"), low = goods.filter((p) => ((c.books.stock[p.id] || {}).qty || 0) <= (p.reorder ?? 5)).length;
      const counts = (c.state.stockOps || []).filter((o) => o.kind !== "scrap"), last = counts.reduce((m, o) => (o.date > m ? o.date : m), "");
      return [["Stock value", money(value, false), "AED at cost"], ["Stocked items", String(goods.length), `${goods.filter((p) => ((c.books.stock[p.id] || {}).qty || 0) > 0).length} in stock`],
        ["Low on stock", String(low), "at or below their reorder level", low ? "warn" : ""], ["Last stock count", last ? dmy(last) : "None yet", `${counts.length} counts`]]; } },
  { id: "accounting", name: "Accounting", icon: Calculator, cat: "finance", tone: ["#34D399", "#047857"], home: "app_accounting", art: "accounting",
    desc: "Ledger, journals and assets", about: "Chart of accounts, journal entries, fixed assets and opening balances", screens: ["accounts", "acct_groups", "journal", "assets", "opening"],
    reports: ["r_tb", "r_gl", "r_pnl", "r_bs"], create: ["journal", "accounts", "assets"],
    records: (c) => nPlural(ACCOUNTS.length, "account"),
    kpis: (c) => { const y = TODAY.slice(0, 4) + "-01-01", r = pnl(c.books.flat, y, TODAY);
      return [["Net profit this year", money(r.net, false), `${r.nm.toFixed(1)}% of sales`, r.net < 0 ? "neg" : ""], ["Journal entries", String(c.state.manual.length), "entered by hand"],
        ["Fixed assets", String((c.state.assets || []).length), "on the register"], ["The books", c.books.balanced ? "Balanced" : "Out of balance", `${c.books.entries.length.toLocaleString("en-US")} entries`, c.books.balanced ? "pos" : "neg"]]; } },
  { id: "bank", name: "Bank & cash", icon: Landmark, cat: "finance", tone: ["#22D3EE", "#0E7490"], home: "app_bank", art: "bank",
    desc: "Receipts, payments and cheques", about: "Receipts, payments, post-dated cheques and bank balances", screens: ["payments", "pdc", "banking", "methods"],
    reports: ["r_method"], create: ["payments", "pdc", "banking"],
    records: (c) => nPlural(c.state.payments.length, "payment"),
    kpis: (c) => { const m = monthStart(), inn = R2(c.state.payments.filter((p) => p.kind === "in" && p.date >= m).reduce((s, p) => s + p.amount, 0));
      const out = R2(c.state.payments.filter((p) => p.kind === "out" && p.date >= m).reduce((s, p) => s + p.amount, 0));
      return [["Cash and bank", money(bankBalance(c.books), false), "AED today"], ["Received this month", money(inn, false), "AED"], ["Paid this month", money(out, false), "AED"],
        ["Open cheques", String(c.counts.pdc || 0), "post-dated, not yet cleared"]]; } },
  { id: "vat", name: "VAT & e-invoicing", icon: ShieldCheck, cat: "finance", tone: ["#FB7185", "#BE123C"], home: "app_vat", art: "vat",
    desc: "VAT return and e-invoices", about: "The FTA VAT return and PINT AE e-invoicing", screens: ["r_vat", "fta"], reports: ["r_vat"], create: [],
    records: (c) => { const v = vat201(c.state, quarterStart(), TODAY); return `${v.due >= 0 ? "Due" : "Refund"} AED ${shortAmt(Math.abs(v.due))} this quarter`; },
    kpis: (c) => { const v = vat201(c.state, quarterStart(), TODAY);
      return [["Output VAT", money(v.out.vat, false), "this quarter so far"], ["Input VAT", money(v.inp.vat, false), "recoverable"],
        [v.due >= 0 ? "VAT due" : "VAT refund", money(Math.abs(v.due), false), "AED this quarter", v.due > 0 ? "warn" : "pos"], ["TRN", COMPANY.trn || "Not registered", COMPANY.emirate || ""]]; } },
  { id: "reports", name: "Reports", icon: PieChart, cat: "insights", tone: ["#818CF8", "#4338CA"], home: "reports", art: "reports",
    desc: "Statements, ledgers, analysis", screens: ["reports", "r_pnl", "r_bs", "r_tb", "r_gl"],
    records: () => "15 reports" },
  { id: "dash", name: "Dashboard", icon: LayoutDashboard, cat: "insights", tone: ["#38BDF8", "#2563EB"], home: "dash", art: "dash",
    desc: "Live sales, cash and profit", screens: ["dash"], records: () => "Live" },
  { id: "contacts", name: "Contacts", icon: Users, cat: "people", tone: ["#F472B6", "#BE185D"], home: "app_contacts", art: "contacts",
    desc: "Customers, vendors, sales team", about: "Customers, vendors, the sales team and price lists", screens: ["customers", "vendors", "salespeople", "pricelists"],
    reports: ["r_partner", "r_stmt", "r_cust"], create: ["customers", "vendors", "salespeople"],
    records: (c) => nPlural(PARTNERS.length, "contact"),
    kpis: (c) => [["Customers", String(PARTNERS.filter((p) => p.role === "customer").length), "on file"], ["Vendors", String(PARTNERS.filter((p) => p.role === "vendor").length), "on file"],
      ["Sales team", String((c.state.salespeople || []).length), "people"], ["Price lists", String((c.state.priceLists || []).length), "active and planned"]] },
  { id: "org", name: "Companies", icon: Building2, cat: "setup", tone: ["#FBBF24", "#B45309"], home: "companies", art: "org",
    desc: "Companies, branches, group view", screens: ["companies", "branches", "r_branch", "r_group"],
    records: (c) => nPlural(companyList().length, "company", "companies") + ((c.state.branches || []).length ? " · " + nPlural(c.state.branches.length, "branch", "branches") : "") },
  { id: "users", name: "Users & access", icon: KeyRound, cat: "people", tone: ["#2DD4BF", "#0F766E"], home: "users", art: "users",
    desc: "Roles, PINs and approvals", screens: ["users"], records: (c) => nPlural((c.state.users || []).filter((u) => u.active !== false).length, "user") },
  { id: "settings", name: "Settings", icon: Settings, cat: "setup", tone: ["#94A3B8", "#334155"], home: "settings", art: "settings",
    desc: "Profile, sync and backup", screens: ["settings", "setup"],
    records: (c) => (c.state.setup && c.state.setup.backup ? `Backed up ${dmy(c.state.setup.backup)}` : "Not backed up yet") },
];
const APP_BY = Object.fromEntries(APPS.map((a) => [a.id, a]));
const APP_CATS = [["all", "All"], ["core", "Core"], ["finance", "Finance"], ["insights", "Insights"], ["people", "People"], ["setup", "Setup"]];
/* Which app a screen belongs to — for the overview pages that are not in the menu. */
const appOfView = (k) => (k && k.startsWith("app_") ? APP_BY[k.slice(4)] : null);
const appOpen = (a, allowed) => (a.home.startsWith("app_") ? a.screens.some(allowed) : allowed(a.home));

/* Recently opened screens, for "Jump back in". */
const RECENT_KEY = "mizan.recent";
function rememberView(k) {
  if (!k || k === "home") return;
  try { const l = JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]").filter((x) => x !== k); l.unshift(k); window.localStorage.setItem(RECENT_KEY, JSON.stringify(l.slice(0, 8))); } catch (e) {}
}
const recentViews = () => { try { return JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]"); } catch (e) { return []; } };

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
function AppsHome({ state, books, company, user, go, quickAdd, allowed, canAdd, counts, cmdItems, openSearch }) {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState(""), [hi, setHi] = useState(0), [mk, setMk] = useState(false);
  const ctx = { state, books, counts };
  const apps = APPS.filter((a) => appOpen(a, allowed));
  const shown = apps.filter((a) => cat === "all" || a.cat === cat);
  const results = useMemo(() => (q.trim() ? cmdItems.map((i) => ({ i, s: searchScore(q, i.label + " " + (i.hint || "") + " " + (i.search || ""), [i.label]) })).filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s).slice(0, 8).map((x) => x.i) : []), [q, cmdItems]);
  const run = (i) => { setQ(""); i.act(); };
  const recents = recentViews().map((k) => NAV_FLAT.find((n) => n.k === k) || (appOfView(k) && { k, l: appOfView(k).name + " overview" })).filter((x) => x && allowed(x.k)).slice(0, 5);
  const today = useMemo(() => { const inv = docsOf(state, "invoice").filter((d) => d.state === "posted" && d.date === TODAY);
    return { sales: R2(inv.reduce((s, d) => s + amounts(d).sub, 0)), recv: aging(state, "receivable", TODAY).grand, cash: bankBalance(books) }; }, [state, books]);
  const CREATE = [["Documents", [["invoices", "Invoice", Receipt], ["quotes", "Quotation", FileText], ["purchase_orders", "Purchase order", ClipboardCheck], ["bills", "Vendor bill", ShoppingCart], ["payments", "Receipt or payment", ArrowDownLeft]]],
    ["Records", [["customers", "Customer", Users], ["vendors", "Vendor", Truck], ["products", "Product or service", Package], ["journal", "Journal entry", BookOpen]]]];
  const first = (user.name || "").split(" ")[0];
  return <div className="ah">
    <section className="ah-hero">
      <div className="ah-bg" aria-hidden="true"><div className="ah-glow g1" /><div className="ah-glow g2" /><div className="ah-arc a1" /><div className="ah-arc a2" /><Skyline /></div>
      <div className="ah-center">
        <div className="ah-eyebrow">Welcome back{first ? ", " + first : ""}</div>
        <h1 className="ah-title">Everything <span>your business</span> needs</h1>
        <p className="ah-sub">Search, create and open everything in {company.name} from one place.</p>
        <div className="ah-search-wrap">
          <label className={cx("ah-search", q && "typing")}>
            <Search size={22} strokeWidth={2.2} />
            <input value={q} placeholder="Search invoices, customers, products, reports…" aria-label="Search everything"
              onChange={(e) => { setQ(e.target.value); setHi(0); }}
              onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
                else if (e.key === "Enter" && results[hi]) run(results[hi]); else if (e.key === "Escape") setQ(""); }} />
            <kbd>{MOD === "⌘" ? "⌘ K" : "Ctrl K"}</kbd>
            <button type="button" className="ah-spark" title="Open the full search" aria-label="Open the full search" onClick={openSearch}><Sparkles size={18} /></button>
          </label>
          {q.trim() && <div className="ah-results" role="listbox" aria-label="Search results">
            {results.length ? results.map((r, i) => { const I = r.icon || Search; return <button key={r.key} role="option" aria-selected={i === hi} className={cx("ah-res", i === hi && "on")}
              onMouseEnter={() => setHi(i)} onClick={() => run(r)}><span className="ic"><I size={15} /></span><span className="t">{r.label}</span>{r.hint && <span className="h">{r.hint}</span>}</button>; })
              : <div className="ah-nores">Nothing matches “{q}”</div>}
          </div>}
        </div>
        <div className="ah-create-wrap">
          <button className="ah-create" onClick={() => setMk((v) => !v)} aria-haspopup="menu" aria-expanded={mk}><span className="pl"><Plus size={16} strokeWidth={2.6} /></span>Create new<ChevronDown size={16} /></button>
          {mk && <><div className="pop-scrim" onMouseDown={() => setMk(false)} />
            <div className="ah-menu" role="menu">{CREATE.map(([g, items]) => { const ok = items.filter(([k]) => canAdd(k) && allowed(k)); return ok.length ? <div key={g}><div className="gl">{g}</div>
              {ok.map(([k, l, I]) => <button key={k} role="menuitem" onClick={() => { setMk(false); quickAdd(k); }}><span className="ic"><I size={15} /></span>{l}</button>)}</div> : null; })}</div></>}
        </div>
        {recents.length > 0 && <div className="ah-recent"><span>Jump back in</span>{recents.map((r) => <button key={r.k} onClick={() => go(r.k)}>{r.l}</button>)}</div>}
      </div>
      <div className="ah-glass left"><b>One platform.</b><b>Every part of your business.</b><i /></div>
      <div className="ah-glass right"><span className="bars"><i /><i /><i /></span><div>
        <small>Today</small><span>Sales <b>{money(today.sales, false)}</b></span><span>To collect <b>{money(today.recv, false)}</b></span><span>Cash &amp; bank <b>{money(today.cash, false)}</b></span></div></div>
    </section>
    {/* Approvers see what waits for them as soon as they arrive. */}
    <div className="ah-inbox"><ApprovalInbox state={state} user={user} go={go} /></div>
    <section className="ah-apps">
      <header>
        <div><h2>Business applications</h2><p>Run every part of {company.name} from one integrated platform.</p></div>
        <div className="ah-chips" role="tablist" aria-label="Filter applications">{APP_CATS.filter(([k]) => k === "all" || apps.some((a) => a.cat === k)).map(([k, l]) =>
          <button key={k} role="tab" aria-selected={cat === k} className={cx(cat === k && "on")} onClick={() => setCat(k)}>{l}</button>)}</div>
      </header>
      <div className="ah-grid">{shown.map((a, i) => <button key={a.id} className="ah-card" data-app={a.id} style={{ "--a1": a.tone[0], "--a2": a.tone[1], "--i": i }} onClick={() => go(a.home)}>
        <span className="ah-ic"><a.icon size={24} strokeWidth={2} /></span>
        <span className="ah-txt"><b>{a.name}</b><small>{a.desc}</small><em>{a.records(ctx)}</em></span>
        <AppArt kind={a.art} tone={a.tone} />
        <span className="ah-go"><ChevronRight size={16} strokeWidth={2.4} /></span>
      </button>)}</div>
    </section>
  </div>;
}

/* ------------------------------------------------------------ app overview */
function AppOverview({ app, state, books, go, quickAdd, allowed, canAdd, counts }) {
  const ctx = { state, books, counts };
  const kpis = app.kpis ? app.kpis(ctx) : [];
  const item = (k) => NAV_FLAT.find((n) => n.k === k) || { k, l: k, i: FileText };
  const countOf = (k) => {
    if (counts[k] != null) return counts[k];
    const P = PARTNERS, s = state;
    return ({ customers: P.filter((p) => p.role === "customer").length, vendors: P.filter((p) => p.role === "vendor").length, products: PRODUCTS.filter((p) => !isSetupItem(p)).length,
      categories: CATEGORIES.length, pricelists: (s.priceLists || []).length, salespeople: (s.salespeople || []).length, accounts: ACCOUNTS.length, journal: s.manual.length,
      assets: (s.assets || []).length, methods: METHODS.length, stock_count: (s.stockOps || []).filter((o) => o.kind !== "scrap").length, scrap: (s.stockOps || []).filter((o) => o.kind === "scrap").length,
      users: (s.users || []).length, branches: (s.branches || []).length, companies: companyList().length, expenses: docsOf(s, "bill").filter((d) => d.note === "Recorded through Expenses").length })[k];
  };
  const screens = app.screens.filter(allowed), creates = (app.create || []).filter((k) => allowed(k) && canAdd(k)), reports = (app.reports || []).filter(allowed);
  return <div className="ao" style={{ "--a1": app.tone[0], "--a2": app.tone[1] }}>
    <section className="ao-head">
      <span className="ao-ic"><app.icon size={30} strokeWidth={1.9} /></span>
      <div className="ao-t"><span className="ao-eyebrow">App</span><h1>{app.name}</h1><p>{app.about || app.desc}</p>
        {creates.length > 0 && <div className="ao-acts">{creates.map((k, i) => <Btn key={k} kind={i === 0 ? "pri" : undefined} icon={Plus} onClick={() => quickAdd(k)}>
          {CREATE_LABEL[k] || "New " + item(k).l.toLowerCase()}</Btn>)}</div>}</div>
      <AppArt kind={app.art} tone={app.tone} size={1.55} />
    </section>
    {kpis.length > 0 && <div className="ao-kpis">{kpis.map(([l, v, sub, tone]) => <div key={l} className={cx("ao-kpi", tone)}><small>{l}</small><b>{v}</b>{sub && <span>{sub}</span>}</div>)}</div>}
    <SectionTitle>In {app.name}</SectionTitle>
    <div className="ao-grid">{screens.map((k) => { const it = item(k), I = it.i || FileText, n = countOf(k);
      return <div key={k} className="ao-card" data-k={k}>
        <button className="ao-open" onClick={() => go(k)}><span className="ao-sic"><I size={18} strokeWidth={1.9} /></span>
          <span className="ao-st"><b>{it.l}</b><small>{SCREEN_INFO[k] || ""}</small></span>{n != null && <em>{n.toLocaleString("en-US")}</em>}<ChevronRight size={15} className="cv" /></button>
        {it.add && canAdd(k) && <button className="ao-new" onClick={() => quickAdd(k)} title={`New — ${it.l}`} aria-label={`Create new: ${it.l}`}><Plus size={14} strokeWidth={2.4} /></button>}
      </div>; })}</div>
    {reports.length > 0 && <><SectionTitle>Reports for {app.name.toLowerCase()}</SectionTitle>
      <div className="ao-reports">{reports.map((k) => { const it = item(k), I = it.i || PieChart; return <button key={k} onClick={() => go(k)}><I size={14} />{it.l}</button>; })}</div></>}
  </div>;
}

const APPS_CSS = `
/* ---- home ---- */
.mz{--sky-1:#9DB8E8;--sky-2:#DCE7F8}
.mz[data-theme="dark"]{--sky-1:#2C4677;--sky-2:#14213D}
.ah{display:flex;flex-direction:column;gap:0;margin:-6px 0 0}
/* The hero's decoration is clipped to its rounded box; its menus are not, so they open over the apps below. */
.ah-hero{position:relative;border-radius:28px;padding:56px 32px 190px;min-height:500px;
  background:radial-gradient(900px 420px at 15% 0%,rgba(255,255,255,.95),transparent 60%),radial-gradient(800px 380px at 100% 10%,rgba(255,226,198,.55),transparent 60%),
    linear-gradient(180deg,#E8F0FD 0%,#F3F0FF 52%,#FFF3E8 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.7),0 18px 50px rgba(30,50,90,.08)}
.mz[data-theme="dark"] .ah-hero{background:radial-gradient(900px 420px at 15% 0%,rgba(76,110,190,.35),transparent 60%),radial-gradient(800px 380px at 100% 10%,rgba(160,90,200,.22),transparent 60%),
    linear-gradient(180deg,#0E1830 0%,#141B33 55%,#1A1630 100%);box-shadow:inset 0 0 0 1px rgba(160,180,225,.12)}
.ah-bg{position:absolute;inset:0;border-radius:inherit;overflow:hidden;pointer-events:none}
.ah-glow{position:absolute;border-radius:50%;filter:blur(40px);opacity:.7}
.ah-glow.g1{width:420px;height:420px;left:-120px;top:-160px;background:color-mix(in srgb,var(--brand) 22%,transparent)}
.ah-glow.g2{width:380px;height:380px;right:-80px;top:40px;background:rgba(255,170,120,.28)}
.ah-arc{position:absolute;border-radius:50%;border:1px solid rgba(255,255,255,.75);pointer-events:none}
.mz[data-theme="dark"] .ah-arc{border-color:rgba(160,180,225,.14)}
.ah-arc.a1{width:1100px;height:1100px;left:50%;top:-860px;transform:translateX(-50%);box-shadow:0 30px 60px rgba(255,255,255,.35)}
.ah-arc.a2{width:900px;height:900px;left:-420px;bottom:-760px}
.ah-sky{position:absolute;left:0;right:0;bottom:0;width:100%;height:200px;pointer-events:none}
.ah-center{position:relative;max-width:820px;margin:0 auto;text-align:center;display:flex;flex-direction:column;align-items:center}
.ah-eyebrow{font-size:12.5px;letter-spacing:.42em;text-transform:uppercase;color:var(--ink-2);font-weight:600;margin-bottom:14px;animation:ahUp .7s cubic-bezier(.22,1,.36,1) both}
.mz .ah-title{font-size:clamp(30px,4.4vw,54px);line-height:1.05;letter-spacing:-.035em;font-weight:820;color:var(--ink);margin:0;animation:ahUp .7s .05s cubic-bezier(.22,1,.36,1) both}
.ah-title span{background:linear-gradient(90deg,var(--brand),#7C5CF5 70%,#B05CF0);-webkit-background-clip:text;background-clip:text;color:transparent}
.mz .ah-sub{font-size:16.5px;color:var(--ink-2);margin:20px 0 28px;animation:ahUp .7s .1s cubic-bezier(.22,1,.36,1) both}
.ah-search-wrap{position:relative;width:100%;max-width:740px;animation:ahUp .7s .15s cubic-bezier(.22,1,.36,1) both;z-index:6}
.ah-search{display:flex;align-items:center;gap:14px;height:66px;padding:0 10px 0 26px;border-radius:999px;background:rgba(255,255,255,.82);backdrop-filter:blur(18px) saturate(1.4);
  border:1px solid rgba(255,255,255,.95);box-shadow:0 0 0 1px color-mix(in srgb,var(--brand) 12%,transparent),0 18px 44px rgba(40,70,140,.14),0 0 0 6px rgba(255,255,255,.35);color:var(--ink);transition:box-shadow .25s}
.ah-search:focus-within{box-shadow:0 0 0 2px color-mix(in srgb,var(--brand) 45%,transparent),0 20px 50px color-mix(in srgb,var(--brand) 22%,transparent),0 0 0 8px color-mix(in srgb,var(--brand) 10%,transparent)}
.mz[data-theme="dark"] .ah-search{background:rgba(20,30,52,.82);border-color:rgba(160,180,225,.18);box-shadow:0 18px 44px rgba(0,0,0,.35)}
.ah-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:17px;color:var(--ink)}
.ah-search input::placeholder{color:var(--ink-3)}
.ah-search kbd{font-family:var(--sans);font-size:12px;font-weight:600;padding:5px 9px;border-radius:8px;background:var(--surface-3);color:var(--ink-2);border:0}
.ah-spark{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--brand),#8B5CF6);box-shadow:0 8px 20px color-mix(in srgb,var(--brand) 40%,transparent);transition:transform .2s}
.ah-spark:hover{transform:rotate(12deg) scale(1.06)}
.ah-results{position:absolute;left:18px;right:18px;top:74px;padding:6px;border-radius:18px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-3);text-align:left;max-height:380px;overflow:auto;animation:ahUp .2s ease both}
.ah-res{display:flex;align-items:center;gap:11px;width:100%;padding:9px 12px;border-radius:11px;font-size:13.5px;color:var(--ink);text-align:left}
.ah-res.on{background:var(--brand-50)}.ah-res .ic{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--surface-2);color:var(--brand);flex:0 0 auto}
.ah-res .t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ah-res .h{font-size:11.5px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:42%}
.ah-nores{padding:14px;font-size:13px;color:var(--ink-3);text-align:center}
.ah-create-wrap{position:relative;margin-top:24px;animation:ahUp .7s .2s cubic-bezier(.22,1,.36,1) both;z-index:5}
.ah-create{display:inline-flex;align-items:center;gap:12px;height:54px;padding:0 24px 0 12px;border-radius:999px;color:#fff;font-size:16px;font-weight:600;
  background:linear-gradient(90deg,var(--brand),#6D5DF6 60%,#9B5CF0);box-shadow:0 14px 32px color-mix(in srgb,var(--brand) 38%,transparent),inset 0 1px 0 rgba(255,255,255,.3);transition:transform .2s,box-shadow .2s}
.ah-create:hover{transform:translateY(-2px);box-shadow:0 18px 40px color-mix(in srgb,var(--brand) 45%,transparent)}
.ah-create .pl{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.95);color:var(--brand)}
.ah-menu{position:absolute;left:50%;top:64px;transform:translateX(-50%);z-index:1300;width:260px;padding:8px;border-radius:18px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-3);text-align:left;animation:ahUp .2s ease both}
.ah-menu .gl{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-4);font-weight:650;padding:8px 10px 4px}
.ah-menu button{display:flex;align-items:center;gap:11px;width:100%;padding:8px 10px;border-radius:10px;font-size:13.5px;color:var(--ink)}
.ah-menu button:hover{background:var(--surface-2)}.ah-menu .ic{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand)}
.ah-recent{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:7px;margin-top:20px;font-size:12.5px;color:var(--ink-3);animation:ahUp .7s .25s cubic-bezier(.22,1,.36,1) both}
.ah-recent button{height:30px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.95);color:var(--ink-2);font-size:12.5px;backdrop-filter:blur(8px);transition:background .15s,color .15s}
.ah-recent button:hover{background:#fff;color:var(--brand)}
.mz[data-theme="dark"] .ah-recent button{background:rgba(20,30,52,.7);border-color:rgba(160,180,225,.16)}
.ah-glass{position:absolute;z-index:1;padding:16px 20px;border-radius:20px;background:rgba(255,255,255,.42);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.8);box-shadow:0 12px 30px rgba(40,70,140,.08);color:var(--ink)}
.mz[data-theme="dark"] .ah-glass{background:rgba(20,30,52,.55);border-color:rgba(160,180,225,.14)}
.ah-glass.left{left:28px;bottom:104px;display:flex;flex-direction:column;gap:2px;font-size:22px;letter-spacing:-.01em}
.ah-glass.left b{font-weight:400}.ah-glass.left i{display:block;width:72px;height:2px;border-radius:2px;background:var(--ink-2);opacity:.5;margin-top:12px}
.ah-glass.right{right:28px;bottom:104px;display:flex;align-items:center;gap:16px}
.ah-glass.right .bars{display:flex;align-items:flex-end;gap:4px;height:40px}.ah-glass.right .bars i{width:8px;border-radius:3px;background:linear-gradient(180deg,var(--brand),color-mix(in srgb,var(--brand) 30%,transparent))}
.ah-glass.right .bars i:nth-child(1){height:40%}.ah-glass.right .bars i:nth-child(2){height:70%}.ah-glass.right .bars i:nth-child(3){height:100%}
.ah-glass.right div{display:flex;flex-direction:column;gap:2px;font-size:13px;color:var(--ink-2)}.ah-glass.right small{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
.ah-glass.right b{color:var(--ink);font-variant-numeric:tabular-nums;margin-left:4px}
@keyframes ahUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.ah-inbox{position:relative;z-index:3;margin:-78px 18px 0}.ah-inbox:empty{display:none}
.ah-inbox:not(:empty)+.ah-apps{margin-top:14px}
.ah-apps{position:relative;z-index:2;margin:-78px 18px 0;padding:22px 22px 24px;border-radius:26px;background:color-mix(in srgb,var(--surface) 82%,transparent);backdrop-filter:blur(20px) saturate(1.3);
  border:1px solid color-mix(in srgb,var(--surface) 70%,transparent);box-shadow:0 24px 60px rgba(30,50,90,.12),inset 0 1px 0 rgba(255,255,255,.6)}
.mz[data-theme="dark"] .ah-apps{box-shadow:0 24px 60px rgba(0,0,0,.4);border-color:var(--line)}
.ah-apps>header{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px}
.mz .ah-apps h2{font-size:23px;letter-spacing:-.02em;margin:0;color:var(--ink)}.mz .ah-apps header p{margin:4px 0 0;font-size:14px;color:var(--ink-2)}
.ah-chips{display:flex;gap:6px;flex-wrap:wrap}
.ah-chips button{height:36px;padding:0 18px;border-radius:999px;font-size:13px;font-weight:550;color:var(--ink-2);background:var(--surface);border:1px solid var(--line);transition:background .2s,color .2s,border-color .2s,box-shadow .2s}
.ah-chips button:hover{border-color:color-mix(in srgb,var(--brand) 40%,var(--line))}
.ah-chips button.on{background:linear-gradient(135deg,#15233F,#22355E);border-color:transparent;color:#fff;box-shadow:0 6px 16px rgba(21,35,63,.25)}
.mz[data-theme="dark"] .ah-chips button.on{background:var(--brand)}
.ah-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:14px}
.ah-card{position:relative;overflow:hidden;display:flex;align-items:flex-start;gap:14px;min-height:144px;padding:18px 16px 16px;border-radius:18px;text-align:left;
  background:linear-gradient(120deg,var(--surface) 30%,color-mix(in srgb,var(--a1) 12%,var(--surface)));border:1px solid color-mix(in srgb,var(--a1) 18%,var(--line));
  box-shadow:0 1px 2px rgba(19,26,43,.04),0 6px 16px rgba(19,26,43,.04);transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s,border-color .25s;
  animation:ahCard .6s calc(var(--i) * 45ms + .1s) cubic-bezier(.22,1,.36,1) both}
.ah-card:hover{transform:translateY(-3px);box-shadow:0 16px 34px color-mix(in srgb,var(--a2) 18%,transparent);border-color:color-mix(in srgb,var(--a1) 40%,var(--line))}
.ah-card:focus-visible{outline:2px solid var(--a2);outline-offset:2px}
@keyframes ahCard{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
.ah-ic{position:relative;z-index:1;width:54px;height:54px;flex:0 0 54px;border-radius:16px;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,var(--a1),var(--a2));
  box-shadow:0 10px 20px color-mix(in srgb,var(--a2) 35%,transparent),inset 0 1px 0 rgba(255,255,255,.35)}
.ah-txt{position:relative;z-index:1;display:flex;flex-direction:column;min-width:0;flex:1;padding-right:56px}
.ah-txt b{font-size:16.5px;letter-spacing:-.01em;color:var(--ink)}.ah-txt small{font-size:12.5px;line-height:1.45;color:var(--ink-3);margin-top:3px}
.ah-txt em{align-self:flex-start;margin-top:10px;font-style:normal;font-size:11.5px;font-weight:550;color:var(--ink-2);padding:3px 10px;border-radius:999px;background:var(--surface);border:1px solid var(--line);white-space:nowrap;font-variant-numeric:tabular-nums}
.ah-card .app-art{position:absolute;right:4px;bottom:-2px;width:min(124px,36%);height:auto;opacity:.95;transition:transform .45s cubic-bezier(.22,1,.36,1)}
.ah-card:hover .app-art{transform:translate(-4px,-3px) scale(1.04)}
.ah-go{position:absolute;right:12px;bottom:12px;z-index:1;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:var(--surface);color:var(--ink);box-shadow:0 4px 12px rgba(19,26,43,.14);transition:transform .2s,background .2s,color .2s}
.ah-card:hover .ah-go{background:var(--a2);color:#fff;transform:translateX(2px)}
/* ---- app overview ---- */
.ao{display:flex;flex-direction:column;gap:16px}
.ao-head{position:relative;overflow:hidden;display:flex;align-items:center;gap:20px;padding:26px 28px;border-radius:24px;
  background:radial-gradient(600px 240px at 0% 0%,color-mix(in srgb,var(--a1) 20%,transparent),transparent 70%),linear-gradient(120deg,var(--surface),color-mix(in srgb,var(--a1) 14%,var(--surface)));
  border:1px solid color-mix(in srgb,var(--a1) 22%,var(--line));box-shadow:var(--sh-1)}
.ao-ic{width:72px;height:72px;flex:0 0 72px;border-radius:22px;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,var(--a1),var(--a2));box-shadow:0 14px 30px color-mix(in srgb,var(--a2) 35%,transparent),inset 0 1px 0 rgba(255,255,255,.35)}
.ao-t{flex:1;min-width:0;position:relative;z-index:1}.ao-eyebrow{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--a2);font-weight:700}
.mz .ao-t h1{font-size:30px;letter-spacing:-.025em;margin:2px 0 4px;color:var(--ink)}.mz .ao-t p{margin:0;color:var(--ink-2);font-size:14px}
.ao-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.ao-head .app-art{flex:0 0 auto;margin-right:6px}
.ao-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.ao-kpi{padding:15px 17px;border-radius:16px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-1);display:flex;flex-direction:column;gap:3px;position:relative;overflow:hidden}
.ao-kpi::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--a1),var(--a2))}
.ao-kpi small{font-size:12px;color:var(--ink-3)}.ao-kpi b{font-size:21px;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--ink)}.ao-kpi span{font-size:11.5px;color:var(--ink-3)}
.ao-kpi.neg b{color:var(--neg)}.ao-kpi.pos b{color:var(--pos)}.ao-kpi.warn b{color:var(--warn,#B45309)}
.ao-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px}
.ao-card{position:relative;display:flex;align-items:stretch;border-radius:16px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-1);transition:border-color .2s,box-shadow .2s,transform .2s}
.ao-card:hover{border-color:color-mix(in srgb,var(--a1) 45%,var(--line));box-shadow:0 10px 24px color-mix(in srgb,var(--a2) 12%,transparent);transform:translateY(-1px)}
.ao-open{flex:1;min-width:0;display:flex;align-items:center;gap:13px;padding:15px 16px;text-align:left}
.ao-sic{width:42px;height:42px;flex:0 0 42px;border-radius:13px;display:grid;place-items:center;background:color-mix(in srgb,var(--a1) 14%,var(--surface));color:var(--a2)}
.ao-st{flex:1;min-width:0;display:flex;flex-direction:column}.ao-st b{font-size:14.5px;color:var(--ink)}.ao-st small{font-size:12px;color:var(--ink-3);line-height:1.45;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ao-open em{font-style:normal;font-size:12.5px;font-weight:600;color:var(--ink-2);padding:2px 9px;border-radius:999px;background:var(--surface-2);font-variant-numeric:tabular-nums}
.ao-open .cv{color:var(--ink-4);flex:0 0 auto}
.ao-new{width:44px;border-left:1px solid var(--line-2);display:grid;place-items:center;color:var(--a2);border-radius:0 16px 16px 0;transition:background .15s}
.ao-new:hover{background:color-mix(in srgb,var(--a1) 10%,transparent)}
.ao-reports{display:flex;flex-wrap:wrap;gap:8px}
.ao-reports button{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 14px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font-size:13px;color:var(--ink-2);transition:border-color .15s,color .15s}
.ao-reports button:hover{border-color:var(--a1);color:var(--a2)}
/* ---- menu: each app has its colour ---- */
.sb-head .ic.app{width:24px;height:24px;border-radius:7px;color:#fff!important;background:linear-gradient(145deg,var(--a1),var(--a2));box-shadow:0 3px 8px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.3)}
.sb-head .ic.app svg{width:14px;height:14px}
.sbar.rail .sb-sec.has-on>.sb-head .ic.app{box-shadow:0 0 0 3px rgba(255,255,255,.35)}
.tb-apps{position:relative}
@media(min-width:1700px){.ah-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:1100px){.ah-glass.left,.ah-glass.right{display:none}.ah-hero{padding-bottom:130px;min-height:0}}
@media(max-width:900px){.ao-head .app-art{display:none}}
@media(max-width:650px){.ah-hero{padding:34px 16px 110px;border-radius:22px;min-height:0}.ah-eyebrow{letter-spacing:.24em;font-size:11px}.ah-sub{font-size:14.5px}
  .ah-search{height:56px;padding-left:18px}.ah-search kbd{display:none}.ah-spark{width:40px;height:40px}.ah-apps{margin:-80px 0 0;padding:18px 14px}
  .ah-grid{grid-template-columns:1fr}.ao-head{padding:20px;flex-direction:column;align-items:flex-start}.ao-t h1{font-size:24px}}
@media (prefers-reduced-motion:reduce){.ah *,.ah{animation:none!important}}
`;
