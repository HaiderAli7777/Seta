/* ============================================================================
   3.23 — Access management.
   · Roles are ready-made sets of rights. For each area of the books (sales
     documents, customers, purchases, payments, reports…) a role says which of
     View, Create, Edit, Delete, Post, Export & print and Send someone may do,
     plus options: only their own documents, no cost prices, a discount limit,
     read-only. Eight built-in roles match common jobs (accountant, sales
     manager, salesperson, procurement manager, purchaser, storekeeper,
     viewer, administrator); each can be adjusted and new ones added.
   · Access rules — in the spirit of Odoo's Simplify Access Management — take
     rights away from chosen people or roles: hide apps and screens, block
     actions, hide or lock fields, limit which records they see, hide buttons
     and tabs, make someone read-only, stop exports or the search. Rules only
     restrict, and never apply to administrators, so nobody locks the company out.
   · As before this is enforced in the interface; a server enforces it again.
   ========================================================================== */

const ACTS = [["view", "View"], ["create", "Create"], ["edit", "Edit"], ["delete", "Delete"], ["post", "Post"], ["export", "Export & print"], ["send", "Send"]];
const ACT_HINT = { view: "See the screen and its records", create: "Add new records", edit: "Change existing records", delete: "Remove drafts and records",
  post: "Post to the ledger, approve or confirm", export: "PDF, Excel, CSV and printing", send: "WhatsApp and email" };
const ALL7 = ["view", "create", "edit", "delete", "post", "export", "send"];
/* The areas that can be protected, each a set of screens with the actions that make sense for it. */
const AREAS = [
  { k: "sales", app: "sales", l: "Sales documents", n: "Quotations, invoices and credit notes", s: ["quotes", "invoices", "credit_notes"], a: ALL7 },
  { k: "customers", app: "sales", l: "Customers", n: "Customer records, terms and delivery addresses", s: ["customers"], a: ["view", "create", "edit", "delete", "export"] },
  { k: "pricing", app: "sales", l: "Price lists & sales team", n: "Special prices, tiers and salespeople", s: ["pricelists", "salespeople"], a: ["view", "create", "edit", "delete"] },
  { k: "sales_reports", app: "sales", l: "Sales reports", n: "Profit by customer and product, aged receivable, statements", s: ["r_cust", "r_prod", "r_aged_ar", "r_stmt"], a: ["view", "export", "send"] },
  { k: "purchase", app: "purchase", l: "Purchase documents", n: "Purchase orders, vendor bills and debit notes", s: ["purchase_orders", "bills", "debit_notes"], a: ALL7 },
  { k: "expenses", app: "purchase", l: "Expenses", n: "Quick entry of running costs", s: ["expenses"], a: ["view", "create"] },
  { k: "vendors", app: "purchase", l: "Vendors", n: "Vendor records and terms", s: ["vendors"], a: ["view", "create", "edit", "delete", "export"] },
  { k: "purchase_reports", app: "purchase", l: "Purchase reports", n: "Aged payable", s: ["r_aged_ap"], a: ["view", "export"] },
  { k: "products", app: "inventory", l: "Products & categories", n: "Goods, services, prices and categories", s: ["products", "categories"], a: ["view", "create", "edit", "delete", "export"] },
  { k: "stock", app: "inventory", l: "Stock counts & scrap", n: "Counts and write-offs that adjust stock", s: ["stock_count", "scrap"], a: ["view", "create", "post"] },
  { k: "stock_reports", app: "inventory", l: "Stock valuation", n: "Quantity and value of stock", s: ["r_stock"], a: ["view", "export"] },
  { k: "journal", app: "accounting", l: "Journal entries & fixed assets", n: "Manual entries and the asset register", s: ["journal", "assets"], a: ["view", "create", "edit", "delete"] },
  { k: "accounts", app: "accounting", l: "Chart of accounts & opening balances", n: "Accounts, groups, opening balances and the setup guide", s: ["accounts", "acct_groups", "opening", "setup"], a: ["view", "create", "edit", "delete"] },
  { k: "planning", app: "accounting", l: "Cost centres & budgets", n: "Departments, projects and their budgets", s: ["cost_centers", "budgets"], a: ["view", "create", "edit", "delete"] },
  { k: "finance_reports", app: "reports", l: "Financial statements & analysis", n: "P&L, balance sheet, ledgers, budget vs actual, cost centres, branches", s: ["r_pnl", "r_bs", "r_tb", "r_gl", "r_partner", "r_method", "r_branch", "r_group", "r_cc", "r_budget"], a: ["view", "export"] },
  { k: "payments", app: "bank", l: "Receipts, payments & cheques", n: "Money in and out, post-dated cheques", s: ["payments", "pdc"], a: ["view", "create", "edit", "delete", "export"] },
  { k: "bank", app: "bank", l: "Bank, transfers & payment methods", n: "Bank and cash balances, transfers, methods", s: ["banking", "methods"], a: ["view", "create", "edit", "delete"] },
  { k: "vat", app: "vat", l: "VAT return & e-invoicing", n: "The FTA return and PINT AE e-invoices", s: ["r_vat", "fta"], a: ["view", "edit", "export"] },
  { k: "dashboard", app: "dash", l: "Dashboard", n: "Company-wide sales, profit and cash", s: ["dash"], a: ["view"] },
  { k: "admin", app: "settings", l: "Settings, users & companies", n: "Company settings, users, roles, access rules, companies and branches", s: ["settings", "users", "roles", "access_rules", "companies", "branches"], a: ["view", "edit"] },
];
const AREA_BY = Object.fromEntries(AREAS.map((a) => [a.k, a]));
const SCREEN_AREA = Object.fromEntries(AREAS.flatMap((a) => a.s.map((k) => [k, a.k])));
const REPORT_AREAS = ["sales_reports", "purchase_reports", "stock_reports", "finance_reports"];
/* Screens that show cost prices or margins — closed when cost is hidden. */
const COST_SCREENS = ["r_prod", "r_cust", "r_stock"];
const AREA_GROUPS = [["sales", "Sales", ShoppingBag], ["purchase", "Purchase", ShoppingCart], ["inventory", "Inventory", Warehouse], ["accounting", "Accounting", Calculator],
  ["bank", "Bank & cash", Landmark], ["vat", "VAT", ShieldCheck], ["reports", "Reports", PieChart], ["dash", "Dashboard", LayoutDashboard], ["settings", "Administration", Settings]];

const LEVELS = [["none", "None"], ["view", "View"], ["use", "Create & edit"], ["full", "Full"]];
const levelActs = (area, lv) => (lv === "none" ? [] : lv === "view" ? ["view"] : lv === "use" ? area.a.filter((x) => !["delete", "post"].includes(x)) : area.a.slice());
function levelOf(area, acts) {
  const set = new Set(acts || []);
  for (const lv of ["full", "use", "view", "none"]) { const w = levelActs(area, lv); if (w.length === set.size && w.every((x) => set.has(x))) return lv; }
  return "custom";
}
const levelLabel = (lv) => (LEVELS.find((x) => x[0] === lv) || ["", "Custom"])[1];

/* ---------------------------------------------------------------- roles */
const PERSONAS = [["admin", "Owner & administration"], ["accounting", "Accounting & finance"], ["sales_manager", "Sales management"], ["sales", "Selling"],
  ["procurement", "Procurement"], ["purchasing", "Purchasing"], ["stock", "Stock & warehouse"], ["viewer", "Overview & reports"]];
const RT = (label, note, grad, persona, lv, opts) => ({ label, note, grad, persona, lv, opts: opts || {} });
const ROLE_TEMPLATES = {
  admin: RT("Administrator", "Everything, including users, access rules and settings", "g6", "admin", { "*": "full" }),
  accountant: RT("Accountant", "The full books, banking, VAT and reports — no user administration", "g1", "accounting", { "*": "full", dashboard: "view", admin: "none" }),
  sales: RT("Salesperson", "Quotations and invoices for their own customers; no cost prices; discounts up to 10%", "g3", "sales",
    { sales: "full", customers: "use", pricing: "view", products: "view", sales_reports: "full" }, { ownOnly: true, hideCost: true, maxDisc: 10 }),
  sales_manager: RT("Sales manager", "All sales, customers, prices and the sales team; any discount; sales reports", "g3", "sales_manager",
    { sales: "full", customers: "full", pricing: "full", sales_reports: "full", products: "view", dashboard: "view" }),
  clerk: RT("Purchaser", "Raises purchase orders and enters bills and expenses; cannot post", "g5", "purchasing",
    { purchase: "use", expenses: "use", vendors: "use", products: "view", purchase_reports: "full" }),
  procurement: RT("Procurement manager", "Purchasing, vendors and expenses; purchase and stock reports; usually approves orders", "g5", "procurement",
    { purchase: "full", expenses: "full", vendors: "full", purchase_reports: "full", products: "use", stock: "view", stock_reports: "full", payments: "view", dashboard: "view" }),
  storekeeper: RT("Storekeeper", "Products, stock counts and scrap; no cost prices", "g2", "stock", { products: "use", stock: "full" }, { hideCost: true }),
  viewer: RT("Viewer", "Read-only: the dashboard and reports", "g4", "viewer",
    { dashboard: "view", sales_reports: "full", purchase_reports: "full", stock_reports: "full", finance_reports: "full" }),
};
const expandLv = (lv) => Object.fromEntries(AREAS.map((a) => [a.k, levelActs(a, lv[a.k] || lv["*"] || "none")]));
/* Built-in roles (with any changes saved in the books) and the company's own roles. */
function roleDefs(state) {
  const over = (state && state.roles) || {}, out = {};
  Object.entries(ROLE_TEMPLATES).forEach(([k, t]) => {
    const o = k === "admin" ? null : over[k];
    out[k] = { key: k, builtin: true, changed: !!o, label: t.label, note: (o && o.note) || t.note, grad: t.grad, persona: (o && o.persona) || t.persona,
      rights: o && o.rights ? { ...expandLv(t.lv), ...o.rights } : expandLv(t.lv), opts: o && o.opts ? { ...o.opts } : { ...t.opts } };
  });
  Object.entries(over).forEach(([k, r]) => { if (!ROLE_TEMPLATES[k] && r && r.label) out[k] = { key: k, custom: true, label: r.label, note: r.note || "", grad: r.grad || "g2",
    persona: r.persona || "viewer", rights: { ...expandLv({}), ...(r.rights || {}) }, opts: { ...(r.opts || {}) } }; });
  return out;
}
/* ROLES keeps the shape other screens read (label, note, grad); refreshed on each render. */
function syncRoles(state) { const d = roleDefs(state); Object.keys(ROLES).forEach((k) => { if (!d[k]) delete ROLES[k]; }); Object.assign(ROLES, d); }
const roleOfUser = (u) => ROLES[u && u.role] || ROLES.viewer || { label: "Viewer", grad: "g4", persona: "viewer" };

/* -------------------------------------------------------- effective access */
/* What one person may do: their role's rights, less every active access rule that names them or their role. */
function accessFor(user, state) {
  const defs = roleDefs(state), admin = !!user && user.role === "admin", role = defs[user && user.role] || defs.viewer;
  const rights = {};
  AREAS.forEach((a) => (rights[a.k] = Object.fromEntries(a.a.map((x) => [x, admin || (role.rights[a.k] || []).includes(x)]))));
  const md = role.opts.maxDisc;
  const o = { role, admin, rights, hidden: new Set(), ownOnly: !!role.opts.ownOnly, hideCost: !!role.opts.hideCost, maxDisc: md === "" || md == null || isNaN(+md) ? null : +md,
    readOnly: !!role.opts.readOnly, fields: {}, buttons: new Set(), tabs: new Set(), days: null, branchOnly: false, noSearch: false, noExport: false, rules: [] };
  if (!admin && user) (state.accessRules || []).filter((r) => r.active !== false && ((r.users || []).includes(user.id) || (r.roles || []).includes(user.role))).forEach((r) => {
    o.rules.push(r);
    (r.hide || []).forEach((k) => o.hidden.add(k));
    Object.entries(r.deny || {}).forEach(([a, acts]) => (acts || []).forEach((x) => { if (o.rights[a] && x in o.rights[a]) o.rights[a][x] = false; }));
    Object.entries(r.fields || {}).forEach(([f, v]) => { if (v === "hide" || (v === "readonly" && o.fields[f] !== "hide")) o.fields[f] = v; });
    (r.buttons || []).forEach((b) => o.buttons.add(b)); (r.tabs || []).forEach((t) => o.tabs.add(t));
    if (r.own) o.ownOnly = true;
    if (r.branchOnly) o.branchOnly = true;
    if (+r.days > 0) o.days = o.days ? Math.min(o.days, +r.days) : +r.days;
    if (r.maxDisc !== "" && r.maxDisc != null && !isNaN(+r.maxDisc)) o.maxDisc = o.maxDisc == null ? +r.maxDisc : Math.min(o.maxDisc, +r.maxDisc);
    if (r.readOnly) o.readOnly = true;
    if (r.noSearch) o.noSearch = true;
    if (r.noExport) o.noExport = true;
  });
  if (o.fields.cost === "hide") o.hideCost = true;
  if (o.hideCost) { o.fields.cost = "hide"; COST_SCREENS.forEach((k) => o.hidden.add(k)); }
  if (o.readOnly) Object.values(o.rights).forEach((x) => Object.keys(x).forEach((k) => { if (k !== "view" && k !== "export") x[k] = false; }));
  if (o.noExport) Object.values(o.rights).forEach((x) => { if ("export" in x) x.export = false; });
  return o;
}
/* Can this person open a screen? Screens outside every area (Home, overviews) follow their content. */
function screenOpen(acc, k) {
  if (!acc) return true;
  if (acc.hidden.has(k)) return false;
  if (k === "reports") return REPORT_AREAS.some((a) => acc.rights[a].view && AREA_BY[a].s.some((s) => !acc.hidden.has(s)));
  const a = SCREEN_AREA[k];
  return !a || !!acc.rights[a].view;
}
const screenCan = (acc, k, act) => { const a = SCREEN_AREA[k]; return !acc || !a || !!(acc.rights[a] && acc.rights[a][act]); };
/* The coarse permissions older screens ask for. */
function legacyCan(acc, p) {
  const r = acc.rights, any = (...l) => l.some(Boolean);
  return ({ view: r.dashboard.view, sell: r.sales.create, buy: r.purchase.create, post: any(r.sales.post, r.purchase.post), bank: r.bank.create,
    master: any(r.customers.create, r.vendors.create, r.products.create, r.accounts.edit), journal: r.journal.create, reports: r.finance_reports.view,
    tax: r.vat.view, settings: r.admin.edit })[p] || false;
}
/* The signed-in person's access, for components deep in the tree (set by the shell on each render). */
var ACC_NOW = null;
const accOk = (area, act) => !ACC_NOW || !!(ACC_NOW.rights[area] && ACC_NOW.rights[area][act]);
const accField = (f) => (ACC_NOW && ACC_NOW.fields[f]) || "";
const accBtn = (b) => !ACC_NOW || !ACC_NOW.buttons.has(b);
const accTab = (t) => !ACC_NOW || !ACC_NOW.tabs.has(t);
/* A document is someone's own when they created or requested it, or are its salesperson. */
const isMine = (user, d) => !!user && (d.createdBy === user.id || d.requestedBy === user.id || (!!user.salesperson && d.salesman === user.salesperson));
/* The documents a person may see: their own only, or only recent ones, when a rule says so. */
function scopeDocs(state, acc, user) {
  if (!acc || (!acc.ownOnly && !acc.days)) return state;
  const cut = acc.days ? addDays(TODAY, -acc.days) : "";
  return { ...state, docs: state.docs.filter((d) => (!acc.ownOnly || isMine(user, d)) && (!cut || d.date >= cut)) };
}
/* What a set of rights adds up to per app, for summaries: "full", "edit", "view" or "". */
function appLevels(acc) {
  const out = {};
  AREA_GROUPS.forEach(([g]) => {
    const as = AREAS.filter((a) => a.app === g && a.s.some((k) => !acc.hidden.has(k)));
    const lv = as.map((a) => (a.a.every((x) => acc.rights[a.k][x]) ? 3 : a.a.some((x) => x !== "view" && x !== "export" && acc.rights[a.k][x]) ? 2 : acc.rights[a.k].view ? 1 : 0));
    const m = lv.length ? Math.max(...lv) : 0;
    out[g] = m === 3 && lv.every((x) => x === 3) ? "full" : m >= 2 ? "edit" : m === 1 ? "view" : "";
  });
  return out;
}
const LV_TXT = { full: "Full", edit: "Works in", view: "Views", "": "No access" };
function accessNotes(acc) {
  const n = [];
  if (acc.admin) return ["Everything — administrators are never restricted"];
  if (acc.readOnly) n.push("Read-only");
  if (acc.ownOnly) n.push("Own documents only");
  if (acc.hideCost) n.push("No cost prices or margins");
  if (acc.maxDisc != null) n.push(`Discounts up to ${acc.maxDisc}%`);
  if (acc.days) n.push(`Last ${acc.days} days only`);
  if (acc.branchOnly) n.push("Home branch only");
  if (acc.noExport) n.push("No export or printing");
  if (acc.noSearch) n.push("No search");
  if (acc.fields.price === "readonly") n.push("Prices locked");
  if (acc.fields.discount === "readonly") n.push("Discounts locked");
  if (acc.buttons.size) n.push(`${acc.buttons.size} ${acc.buttons.size === 1 ? "button" : "buttons"} hidden`);
  const hs = [...acc.hidden].filter((k) => !COST_SCREENS.includes(k) || !acc.hideCost);
  if (hs.length) n.push(`${hs.length} ${hs.length === 1 ? "screen" : "screens"} hidden`);
  return n;
}

/* ------------------------------------------------------- rule vocabulary */
const RULE_FIELDS = [["cost", "Cost price & margin", ["show", "hide"], "Product costs, margins, valuation and profit reports"],
  ["balance", "Customer & vendor balances", ["show", "hide"], "What each customer owes and what you owe vendors, on their lists"],
  ["price", "Unit price on documents", ["show", "readonly"], "Prices come from the product and price lists"],
  ["discount", "Discounts on documents", ["show", "readonly"], "Line discounts and the discount on the whole document"],
  ["salesman", "Salesperson on documents", ["show", "readonly"], "Keeps the commission owner fixed"],
  ["pricelist", "Price list on documents", ["show", "readonly"], "Keeps the agreed price list"]];
const FIELD_MODE = { show: "Visible", readonly: "Read-only", hide: "Hidden" };
const RULE_BUTTONS = [["duplicate", "Duplicate"], ["reset", "Reset to draft"], ["reverse", "Credit / debit note"], ["payment", "Record payment"], ["pdc", "Post-dated cheque"],
  ["print", "Print / send"], ["convert", "Convert quotation to invoice"], ["import", "Import from Excel"]];
const RULE_TABS = [["journal", "Journal entry"], ["history", "Price history"], ["activity", "Activity & approval trail"]];
const RULE_TEMPLATES = [
  ["no-cost", "Hide cost prices from sales", "Sales staff never see costs, margins or profit reports", { roles: ["sales", "sales_manager"], fields: { cost: "hide" } }],
  ["auditor", "Read-only auditor", "Sees everything, changes nothing", { readOnly: true }],
  ["no-delete", "No deleting or resetting documents", "Drafts can't be deleted and posted documents can't go back", { deny: { sales: ["delete"], purchase: ["delete"], payments: ["delete"], journal: ["delete"] }, buttons: ["reset"] }],
  ["own", "Own documents only", "Each person sees only documents they raised or sell", { own: true }],
  ["no-export", "No exports or printing", "Keeps price lists and statements inside InvoEez", { noExport: true, buttons: ["print"] }],
  ["locked-prices", "Fixed prices and a 5% discount limit", "Prices from price lists only; discounts capped", { fields: { price: "readonly" }, maxDisc: 5 }],
];
const blankRule = () => ({ id: uid("acr"), name: "", active: true, users: [], roles: [], hide: [], deny: {}, fields: {}, buttons: [], tabs: [], own: false, branchOnly: false, days: "", maxDisc: "", readOnly: false, noSearch: false, noExport: false });
function ruleSummary(r) {
  const s = [];
  if (r.readOnly) s.push("Read-only");
  if ((r.hide || []).length) s.push(`Hides ${r.hide.length} ${r.hide.length === 1 ? "screen" : "screens"}`);
  const den = Object.entries(r.deny || {}).filter(([, v]) => v && v.length);
  if (den.length) s.push(`Blocks ${den.reduce((n, [, v]) => n + v.length, 0)} actions`);
  Object.entries(r.fields || {}).forEach(([f, v]) => { if (v && v !== "show") s.push(`${(RULE_FIELDS.find((x) => x[0] === f) || [f, f])[1]} ${v === "hide" ? "hidden" : "read-only"}`); });
  if (r.own) s.push("Own documents only");
  if (+r.days > 0) s.push(`Last ${r.days} days`);
  if (r.branchOnly) s.push("Home branch only");
  if (r.maxDisc !== "" && r.maxDisc != null) s.push(`Discount ≤ ${r.maxDisc}%`);
  if ((r.buttons || []).length) s.push(`${r.buttons.length} ${r.buttons.length === 1 ? "button" : "buttons"} hidden`);
  if ((r.tabs || []).length) s.push(`${r.tabs.length} ${r.tabs.length === 1 ? "tab" : "tabs"} hidden`);
  if (r.noExport) s.push("No exports");
  if (r.noSearch) s.push("No search");
  return s.length ? s : ["Nothing restricted yet"];
}

/* ------------------------------------------------------------ small UI */
function LevelSeg({ area, acts, onChange, disabled }) {
  const lv = levelOf(area, acts), opts = area.a.length === 1 ? [["none", "None"], ["full", "View"]] : LEVELS;
  return <div className={cx("lv-seg", lv === "custom" && "custom")} role="radiogroup" aria-label={`${area.l} — level`}>
    {opts.map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={lv === k} disabled={disabled} className={cx(lv === k && "on", "lv-" + k)} onClick={() => onChange(levelActs(area, k))}>{l}</button>)}</div>;
}
function ActChips({ area, acts, onChange, disabled, deny }) {
  const set = new Set(acts || []);
  return <div className="act-chips">{ACTS.filter(([x]) => area.a.includes(x)).map(([x, l]) => { const on = set.has(x);
    return <button key={x} type="button" disabled={disabled} title={ACT_HINT[x]} aria-pressed={on} className={cx("ac", on && "on", deny && "deny")}
      onClick={() => { const n = new Set(set); if (on) { n.delete(x); if (x === "view" && !deny) area.a.forEach((y) => n.delete(y)); } else { n.add(x); if (x !== "view" && !deny) n.add("view"); }
        onChange(area.a.filter((y) => n.has(y))); }}>{on ? (deny ? <Ban size={11} /> : <Check size={11} strokeWidth={3} />) : null}{l}</button>; })}</div>;
}
const RoleBadge = ({ r }) => <span className={cx("gt sm", r.grad)}><UserCog size={15} strokeWidth={1.9} /></span>;

/* ----------------------------------------------------------- roles screen */
function RolesScreen({ state, setState, toast, go, create }) {
  const defs = roleDefs(state), users = state.users || SEED_USERS;
  const keys = Object.keys(defs);
  const [sel, setSel] = useState(keys.includes("accountant") ? "accountant" : keys[0]);
  const [ed, setEd] = useState(null);
  const startNew = (from) => { const b = defs[from || "sales"]; setEd({ key: uid("role"), custom: true, isNew: true, label: "", note: "", grad: b.grad, persona: b.persona, rights: JSON.parse(JSON.stringify(b.rights)), opts: { ...b.opts } }); };
  useCreate(create, () => startNew());
  const r = ed || defs[sel] || defs.admin;
  const users_of = (k) => users.filter((u) => u.role === k);
  const editing = !!ed, locked = r.key === "admin";
  const setArea = (a, acts) => setEd((x) => ({ ...(x || JSON.parse(JSON.stringify(defs[sel]))), rights: { ...(x || defs[sel]).rights, [a]: acts } }));
  const setOpt = (k, v) => setEd((x) => { const base = x || JSON.parse(JSON.stringify(defs[sel])); return { ...base, opts: { ...base.opts, [k]: v } }; });
  const save = () => {
    const rec = { rights: ed.rights, opts: ed.opts, note: ed.note, persona: ed.persona, ...(ed.custom ? { label: ed.label.trim(), grad: ed.grad } : {}) };
    setState((x) => ({ ...x, roles: { ...(x.roles || {}), [ed.key]: rec } }));
    toast(`${ed.custom ? ed.label.trim() : ed.label} saved — applies to ${nPlural(users_of(ed.key).length, "person", "people")} straight away`); setSel(ed.key); setEd(null);
  };
  const reset = () => { setState((x) => { const o = { ...(x.roles || {}) }; delete o[r.key]; return { ...x, roles: o }; }); setEd(null); toast(`${r.label} is back to its standard rights`); };
  const remove = () => { if (users_of(r.key).length) { toast(`Move ${nPlural(users_of(r.key).length, "person", "people")} to another role first`, "warn"); return; }
    setState((x) => { const o = { ...(x.roles || {}) }; delete o[r.key]; return { ...x, roles: o }; }); setEd(null); setSel("accountant"); toast(`${r.label} deleted`, "warn"); };
  const accPrev = accessFor({ id: "__prev", role: r.key }, { ...state, roles: { ...(state.roles || {}), ...(editing ? { [r.key]: { label: r.label || "New role", rights: r.rights, opts: r.opts } } : {}) }, accessRules: [] });
  const lv = appLevels(accPrev);
  return <div className="acc-screen">
    <PageHead eyebrow="Users & access" title="Roles" sub="A role is a ready-made set of rights for a job. Give each person a role, then fine-tune individuals with access rules.">
      <Btn kind="pri" icon={Plus} onClick={() => startNew()}>New role</Btn>
    </PageHead>
    <div className="rl-wrap">
      <aside className="rl-list" aria-label="Roles">{Object.values(defs).map((d) => <button key={d.key} className={cx("rl-item", (ed ? ed.key : sel) === d.key && "on")} data-role={d.key}
        onClick={() => { setEd(null); setSel(d.key); }}>
        <RoleBadge r={d} /><span className="rl-t"><b>{d.label}</b><small>{d.note}</small></span>
        <span className="rl-n" title="People with this role">{users_of(d.key).length}</span>{d.custom ? <em>Custom</em> : d.changed ? <em className="ch">Adjusted</em> : null}</button>)}
        {ed && ed.isNew && <button className="rl-item on"><RoleBadge r={ed} /><span className="rl-t"><b>{ed.label || "New role"}</b><small>Not saved yet</small></span></button>}
      </aside>
      <section className="rl-ed" data-role={r.key}>
        <header className="rl-head"><RoleBadge r={r} />
          <div className="rl-ht">{r.custom ? <Input value={r.label} placeholder="Role name, e.g. Branch cashier" aria-label="Role name" onChange={(e) => setEd({ ...r, label: e.target.value })} /> : <h2>{r.label}</h2>}
            <Input value={r.note} placeholder="What this role is for" aria-label="Description" disabled={locked} onChange={(e) => setEd({ ...r, note: e.target.value })} /></div>
          <div className="rl-acts">{editing ? <><Btn onClick={() => setEd(null)}>Cancel</Btn><Btn kind="pri" icon={Check} disabled={r.custom && !r.label.trim()} onClick={save}>Save role</Btn></>
            : <>{r.changed && <Btn icon={RotateCcw} onClick={reset}>Standard rights</Btn>}<Btn icon={Copy} onClick={() => startNew(r.key)}>Copy as new role</Btn>{r.custom && <Btn kind="danger" icon={Trash2} onClick={remove}>Delete</Btn>}</>}</div>
        </header>
        <div className="rl-sum">{AREA_GROUPS.map(([g, l, I]) => <span key={g} className={cx("rl-app", "lv-" + (lv[g] || "none"))}><I size={13} />{l}<b>{LV_TXT[lv[g] || ""]}</b></span>)}
          <span className="rl-people"><Users size={13} />{users_of(r.key).map((u) => u.name).join(", ") || "Nobody has this role yet"}</span></div>
        {locked ? <div className="rl-locked"><ShieldCheck size={18} />Administrators always have every right, and access rules never apply to them — so the company can't be locked out.</div> : <>
        <div className="rl-opts">
          <label className={cx("opt-sw", r.opts.ownOnly && "on")}><input type="checkbox" checked={!!r.opts.ownOnly} onChange={(e) => setOpt("ownOnly", e.target.checked)} />
            <span><b>Own documents only</b><small>Documents they raised, requested or sell</small></span><Switch on={!!r.opts.ownOnly} /></label>
          <label className={cx("opt-sw", r.opts.hideCost && "on")}><input type="checkbox" checked={!!r.opts.hideCost} onChange={(e) => setOpt("hideCost", e.target.checked)} />
            <span><b>Hide cost prices & margins</b><small>Also hides valuation and profit reports</small></span><Switch on={!!r.opts.hideCost} /></label>
          <label className={cx("opt-sw", r.opts.readOnly && "on")}><input type="checkbox" checked={!!r.opts.readOnly} onChange={(e) => setOpt("readOnly", e.target.checked)} />
            <span><b>Read-only</b><small>Can look and export, never change</small></span><Switch on={!!r.opts.readOnly} /></label>
          <div className="opt-num"><span><b>Discount limit</b><small>Highest discount on a line or document</small></span>
            <span className="on-wrap"><Input n type="number" min="0" max="100" step="1" value={r.opts.maxDisc ?? ""} placeholder="No limit" aria-label="Discount limit %" onChange={(e) => setOpt("maxDisc", e.target.value === "" ? "" : +e.target.value)} /><i>%</i></span></div>
          <div className="opt-num"><span><b>Home shows</b><small>What Home puts first for them</small></span>
            <Select value={r.persona} aria-label="Home shows" onChange={(e) => setEd({ ...(ed || JSON.parse(JSON.stringify(r))), persona: e.target.value })}>{PERSONAS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></div>
        </div>
        <div className="rl-matrix">{AREA_GROUPS.map(([g, l, I]) => { const as = AREAS.filter((a) => a.app === g); if (!as.length) return null;
          return <div key={g} className="rm-group"><div className="rm-gh"><I size={14} />{l}</div>
            {as.map((a) => <div key={a.k} className="rm-row" data-area={a.k}><div className="rm-l"><b>{a.l}</b><small>{a.n}</small></div>
              <LevelSeg area={a} acts={r.rights[a.k]} onChange={(acts) => setArea(a.k, acts)} />
              <ActChips area={a} acts={r.rights[a.k]} onChange={(acts) => setArea(a.k, acts)} /></div>)}</div>; })}</div></>}
      </section>
    </div>
  </div>;
}

/* ---------------------------------------------------- access rules screen */
function AccessRulesScreen({ state, setState, toast, go, create }) {
  const rules = state.accessRules || [], users = (state.users || SEED_USERS).filter((u) => u.active !== false), defs = roleDefs(state);
  const [ed, setEd] = useState(null), [tab, setTab] = useState("who");
  useCreate(create, () => { setEd(blankRule()); setTab("who"); });
  const fromTemplate = ([, name, , t]) => { setEd({ ...blankRule(), name, ...JSON.parse(JSON.stringify(t)) }); setTab("who"); };
  const save = () => { const rec = { ...ed, name: ed.name.trim() || "Access rule" };
    setState((x) => { const l = x.accessRules || []; return { ...x, accessRules: l.some((r) => r.id === rec.id) ? l.map((r) => (r.id === rec.id ? rec : r)) : [...l, rec] }; });
    toast(`${rec.name} saved — applies straight away`); setEd(null); };
  const toggle = (r) => { setState((x) => ({ ...x, accessRules: (x.accessRules || []).map((y) => (y.id === r.id ? { ...y, active: y.active === false } : y)) }));
    toast(`${r.name} ${r.active === false ? "switched on" : "switched off"}`); };
  const remove = (r) => removeWithUndo({ setState, toast, key: "accessRules", rec: r, label: r.name, fallback: [], verb: "deleted" });
  const who = (r) => [...(r.users || []).map((id) => (users.find((u) => u.id === id) || {}).name).filter(Boolean), ...(r.roles || []).map((k) => "Everyone: " + ((defs[k] || {}).label || k))];
  if (ed) {
    const upd = (patch) => setEd((x) => ({ ...x, ...patch }));
    const tg = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
    const affected = users.filter((u) => u.role !== "admin" && ((ed.users || []).includes(u.id) || (ed.roles || []).includes(u.role)));
    const tabs = [["who", "Applies to", Users], ["menus", "Apps & menus", EyeOff], ["actions", "Actions", Ban], ["fields", "Fields", SlidersHorizontal], ["records", "Records", Lock],
      ["buttons", "Buttons & tabs", MoreHorizontal], ["general", "General", Settings]];
    return <div className="acc-screen">
      <PageHead eyebrow="Users & access · Access rules" title={ed.name || "New access rule"} sub="A rule only ever takes rights away. Pick who it applies to, then what to hide or block.">
        <Btn onClick={() => setEd(null)}>Cancel</Btn><Btn kind="pri" icon={Check} className="keep" onClick={save}>Save rule</Btn>
      </PageHead>
      <div className="ar-ed">
        <nav className="ar-tabs" aria-label="Rule sections">{tabs.map(([k, l, I]) => <button key={k} className={cx(tab === k && "on")} data-tab={k} onClick={() => setTab(k)}><I size={15} />{l}</button>)}</nav>
        <section className="ar-body">
          {tab === "who" && <>
            <Field label="Rule name"><Input value={ed.name} placeholder="e.g. Sales team — no cost prices" onChange={(e) => upd({ name: e.target.value })} /></Field>
            <h4 className="ar-h">People</h4>
            <div className="ar-people">{users.map((u) => { const on = (ed.users || []).includes(u.id), adm = u.role === "admin";
              return <button key={u.id} disabled={adm} className={cx("ar-person", on && "on")} data-user={u.id} onClick={() => upd({ users: tg(ed.users || [], u.id) })} title={adm ? "Administrators are never restricted" : ""}>
                <span className="me">{initials(u.name)}</span><span className="ap-t"><b>{u.name}</b><small>{adm ? "Administrator · never restricted" : (defs[u.role] || {}).label}</small></span>{on && <Check size={14} strokeWidth={3} />}</button>; })}</div>
            <h4 className="ar-h">Everyone with the role</h4>
            <div className="ar-roles">{Object.values(defs).filter((d) => d.key !== "admin").map((d) => { const on = (ed.roles || []).includes(d.key);
              return <button key={d.key} className={cx("chipbtn", on && "on")} data-role={d.key} onClick={() => upd({ roles: tg(ed.roles || [], d.key) })}>{on && <Check size={12} strokeWidth={3} />}{d.label}</button>; })}</div>
          </>}
          {tab === "menus" && <div className="ar-menus">{APPS.map((a) => { const ks = [...new Set(appScreens(a))]; if (!ks.length) return null;
            const all = ks.every((k) => (ed.hide || []).includes(k));
            return <div key={a.id} className={cx("ar-app", all && "off")} style={{ "--a1": a.tone[0], "--a2": a.tone[1] }}>
              <label className="ar-app-h"><input type="checkbox" checked={all} onChange={() => upd({ hide: all ? (ed.hide || []).filter((k) => !ks.includes(k)) : [...new Set([...(ed.hide || []), ...ks])] })} />
                <span className="ab-ic"><a.icon size={14} /></span><b>{a.name}</b><small>{all ? "Hidden" : "Hide the whole app"}</small></label>
              <div className="ar-scr">{ks.map((k) => { const on = (ed.hide || []).includes(k);
                return <button key={k} className={cx("chipbtn", on && "off")} data-k={k} onClick={() => upd({ hide: tg(ed.hide || [], k) })}>{on ? <EyeOff size={12} /> : <Eye size={12} />}{tabLabel(k)}</button>; })}</div></div>; })}</div>}
          {tab === "actions" && <div className="rl-matrix ar-deny">{AREA_GROUPS.map(([g, l, I]) => { const as = AREAS.filter((a) => a.app === g && a.a.length > 1); if (!as.length) return null;
            return <div key={g} className="rm-group"><div className="rm-gh"><I size={14} />{l}</div>
              {as.map((a) => <div key={a.k} className="rm-row" data-area={a.k}><div className="rm-l"><b>{a.l}</b><small>Blocked actions are crossed out</small></div>
                <ActChips deny area={{ ...a, a: a.a.filter((x) => x !== "view") }} acts={(ed.deny || {})[a.k] || []} onChange={(acts) => upd({ deny: { ...(ed.deny || {}), [a.k]: acts } })} /></div>)}</div>; })}</div>}
          {tab === "fields" && <div className="ar-fields">{RULE_FIELDS.map(([f, l, modes, n]) => <div key={f} className="ar-field" data-field={f}><span><b>{l}</b><small>{n}</small></span>
            <div className="seg">{modes.map((m) => <button key={m} className={cx(((ed.fields || {})[f] || "show") === m && "on")} onClick={() => upd({ fields: { ...(ed.fields || {}), [f]: m } })}>{FIELD_MODE[m]}</button>)}</div></div>)}
            <div className="ar-field"><span><b>Discount limit</b><small>Highest discount allowed on a line or on the whole document</small></span>
              <span className="on-wrap"><Input n type="number" min="0" max="100" value={ed.maxDisc} placeholder="No limit" aria-label="Discount limit %" onChange={(e) => upd({ maxDisc: e.target.value === "" ? "" : +e.target.value })} /><i>%</i></span></div></div>}
          {tab === "records" && <div className="ar-fields">
            <label className={cx("opt-sw", ed.own && "on")}><input type="checkbox" checked={!!ed.own} onChange={(e) => upd({ own: e.target.checked })} />
              <span><b>Only their own documents</b><small>Documents they raised or requested, or where they are the salesperson (link a user to a salesperson on the user form)</small></span><Switch on={!!ed.own} /></label>
            <label className={cx("opt-sw", ed.branchOnly && "on")}><input type="checkbox" checked={!!ed.branchOnly} onChange={(e) => upd({ branchOnly: e.target.checked })} />
              <span><b>Only their home branch</b><small>Documents, reports and new records stay in the branch on their user form</small></span><Switch on={!!ed.branchOnly} /></label>
            <div className="ar-field"><span><b>Only recent documents</b><small>Hide documents older than this many days</small></span>
              <span className="on-wrap"><Input n type="number" min="1" value={ed.days} placeholder="All" aria-label="Days" onChange={(e) => upd({ days: e.target.value === "" ? "" : +e.target.value })} /><i>days</i></span></div></div>}
          {tab === "buttons" && <>
            <h4 className="ar-h">Hide these buttons on documents</h4>
            <div className="ar-roles">{RULE_BUTTONS.map(([b, l]) => { const on = (ed.buttons || []).includes(b);
              return <button key={b} className={cx("chipbtn", on && "off")} data-btn={b} onClick={() => upd({ buttons: tg(ed.buttons || [], b) })}>{on ? <EyeOff size={12} /> : <Eye size={12} />}{l}</button>; })}</div>
            <h4 className="ar-h">Hide these tabs on documents</h4>
            <div className="ar-roles">{RULE_TABS.map(([t, l]) => { const on = (ed.tabs || []).includes(t);
              return <button key={t} className={cx("chipbtn", on && "off")} data-tab-k={t} onClick={() => upd({ tabs: tg(ed.tabs || [], t) })}>{on ? <EyeOff size={12} /> : <Eye size={12} />}{l}</button>; })}</div></>}
          {tab === "general" && <div className="ar-fields">
            {[["readOnly", "Read-only", "They can look and export but never change anything"], ["noExport", "No exports, printing or downloads", "PDF, Excel, CSV and printing are switched off"],
              ["noSearch", "No search", "The search box and Ctrl K are switched off"]].map(([k, l, n]) =>
              <label key={k} className={cx("opt-sw", ed[k] && "on")}><input type="checkbox" checked={!!ed[k]} onChange={(e) => upd({ [k]: e.target.checked })} /><span><b>{l}</b><small>{n}</small></span><Switch on={!!ed[k]} /></label>)}
            <label className={cx("opt-sw", ed.active !== false && "on")}><input type="checkbox" checked={ed.active !== false} onChange={(e) => upd({ active: e.target.checked })} />
              <span><b>Rule is on</b><small>Switch a rule off to pause it without losing it</small></span><Switch on={ed.active !== false} /></label></div>}
        </section>
        <aside className="ar-side">
          <h4>What this rule does</h4><ul>{ruleSummary(ed).map((t) => <li key={t}>{t}</li>)}</ul>
          <h4>Who it affects</h4>{affected.length ? <ul className="ar-aff">{affected.map((u) => <li key={u.id}><span className="me">{initials(u.name)}</span>{u.name}</li>)}</ul> : <p>Nobody yet — pick people or a role.</p>}
          <p className="ar-note"><ShieldCheck size={14} />Administrators are never restricted.</p>
        </aside>
      </div>
    </div>;
  }
  return <div className="acc-screen">
    <PageHead eyebrow="Users & access" title="Access rules" sub="Take rights away from particular people or roles: hide apps and screens, block actions, hide or lock fields, limit records, hide buttons. Rules only restrict.">
      <Btn kind="pri" icon={Plus} onClick={() => { setEd(blankRule()); setTab("who"); }}>New rule</Btn>
    </PageHead>
    <div className="ar-tpl"><span>Start from a common rule</span>{RULE_TEMPLATES.map((t) => <button key={t[0]} data-tpl={t[0]} onClick={() => fromTemplate(t)}><b>{t[1]}</b><small>{t[2]}</small></button>)}</div>
    {!rules.length ? <Card><EmptyState icon={ShieldBan} title="No access rules yet">Roles already give each person sensible rights. Add a rule when someone needs less — for example to hide cost prices from the sales team, or to make an auditor read-only.</EmptyState></Card>
    : <div className="ar-list">{rules.map((r) => <div key={r.id} className={cx("ar-card", r.active === false && "off")} data-rule={r.id}>
        <button className={cx("ar-sw", r.active !== false && "on")} onClick={() => toggle(r)} aria-pressed={r.active !== false} title={r.active === false ? "Switch on" : "Switch off"}><Switch on={r.active !== false} /></button>
        <div className="ar-ct"><b>{r.name}</b><div className="ar-who">{who(r).length ? who(r).map((n) => <span key={n}>{n}</span>) : <span className="none">Applies to nobody yet</span>}</div>
          <div className="ar-sum">{ruleSummary(r).map((t) => <Pill key={t}>{t}</Pill>)}</div></div>
        <div className="cc-acts"><button className="icon-btn" title="Edit" onClick={() => { setEd(JSON.parse(JSON.stringify(r))); setTab("who"); }}><Pencil size={14} /></button>
          <button className="icon-btn" title="Delete" onClick={() => remove(r)}><Trash2 size={14} /></button></div>
      </div>)}</div>}
  </div>;
}

/* ------------------------------------------------- who can do what overview */
function AccessOverview({ state, me, setMe, toast, onEdit }) {
  const users = state.users || SEED_USERS;
  return <Card title="Who can do what" pad={false} sub="Each person's access after their role and access rules — click a name to change it, or View as to see InvoEez through their eyes"
    className="acc-ov">
    <div className="tbl-wrap"><table className="tbl acc-tbl">
      <thead><tr><th>Person</th>{AREA_GROUPS.map(([g, l, I]) => <th key={g} className="c"><I size={13} /><span>{l}</span></th>)}<th>Restrictions</th><th /></tr></thead>
      <tbody>{users.map((u) => { const acc = accessFor(u, state), lv = appLevels(acc), notes = accessNotes(acc);
        return <tr key={u.id} style={u.active === false ? { opacity: .5 } : undefined} data-user={u.id}>
          <td><button className="linkish acc-name" onClick={() => onEdit(u)}><b>{u.name}</b></button><small className="acc-role">{roleOfUser(u).label}</small></td>
          {AREA_GROUPS.map(([g]) => <td key={g} className="c"><span className={cx("lvdot", "lv-" + (lv[g] || "none"))} title={LV_TXT[lv[g] || ""]}>{lv[g] === "full" ? "Full" : lv[g] === "edit" ? "Edit" : lv[g] === "view" ? "View" : "—"}</span></td>)}
          <td><div className="acc-notes">{notes.slice(0, 3).map((n) => <Pill key={n}>{n}</Pill>)}{notes.length > 3 && <Pill>+{notes.length - 3}</Pill>}</div></td>
          <td className="r">{u.id !== me && u.active !== false && <Btn size="sm" icon={Eye} onClick={() => { setMe(u.id); toast(`Now signed in as ${u.name} — switch back from the account menu`); }}>View as</Btn>}</td></tr>; })}</tbody>
    </table></div>
  </Card>;
}

const ACCESS_CSS = `
/* ---- hidden by access ---- */
.mz[data-hidecost] .cost-data{display:none!important}
.mz[data-hidebal] .bal-data{display:none!important}
.view[data-noc] .page-head .acts .btn.pri:not(.keep),.view[data-noc] .act-create{display:none!important}
.view[data-noe] .act-edit,.view[data-noe] button[title="Edit"],.view[data-noe] button[title^="Edit "]{display:none!important}
.view[data-nod] .act-delete,.view[data-nod] button[title="Delete"],.view[data-nod] button[title^="Delete "],.view[data-nod] button[title="Remove"]{display:none!important}
.view[data-nox] .exp-group,.view[data-nox] .act-export{display:none!important}
.view[data-nos] .act-send{display:none!important}
.mz[data-nosearch] .omni,.mz[data-nosearch] .ah-search-wrap,.mz[data-nosearch] .sb-search,.mz[data-nosearch] .nav-search{display:none!important}
.u-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.u-kpis>div{position:relative;overflow:hidden;display:flex;flex-direction:column;gap:2px;padding:14px 16px;border-radius:16px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-1)}
.u-kpis>div::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,var(--pri-a,var(--brand)),var(--sb-acc,#8B5CF6))}
.u-kpis small{font-size:12px;color:var(--ink-3)}.u-kpis b{font-size:22px;letter-spacing:-.02em;color:var(--ink)}.u-kpis span{font-size:11.5px;color:var(--ink-3)}
@media(max-width:800px){.u-kpis{grid-template-columns:1fr 1fr}}
.mz[data-noexport] .exp-group,.mz[data-noexport] .act-export{display:none!important}
.mz[data-noimport] .act-import{display:none!important}
/* ---- roles ---- */
.rl-wrap{display:grid;grid-template-columns:300px minmax(0,1fr);gap:16px;align-items:start}
.rl-list{display:flex;flex-direction:column;gap:6px;position:sticky;top:12px}
.rl-item{display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:14px;border:1px solid var(--line);background:var(--surface);text-align:left;transition:border-color .15s,box-shadow .15s}
.rl-item:hover{border-color:color-mix(in srgb,var(--brand) 40%,var(--line))}
.rl-item.on{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 14%,transparent)}
.rl-t{flex:1;min-width:0;display:flex;flex-direction:column}.rl-t b{font-size:13.5px;color:var(--ink)}.rl-t small{font-size:11.5px;color:var(--ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rl-n{min-width:24px;height:22px;padding:0 7px;border-radius:999px;display:grid;place-items:center;font-size:11.5px;font-weight:700;background:var(--surface-2);color:var(--ink-2)}
.rl-item em{font-style:normal;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--brand);background:var(--brand-50);padding:2px 6px;border-radius:6px}.rl-item em.ch{color:#B45309;background:#FEF3C7}
.rl-ed{display:flex;flex-direction:column;gap:14px;padding:18px;border-radius:20px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-1);min-width:0}
.rl-head{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap}.rl-head .gt{width:44px;height:44px;flex-basis:44px;border-radius:13px}
.rl-ht{flex:1;min-width:240px;display:flex;flex-direction:column;gap:6px}.mz .rl-ht h2{margin:0;font-size:21px;letter-spacing:-.02em;color:var(--ink)}
.rl-ht .inp{max-width:560px}.rl-acts{display:flex;gap:8px;flex-wrap:wrap}
.rl-sum{display:flex;flex-wrap:wrap;gap:6px;padding:12px;border-radius:14px;background:var(--surface-2)}
.rl-app{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:999px;font-size:12px;color:var(--ink-2);background:var(--surface);border:1px solid var(--line)}
.rl-app b{font-weight:650}.rl-app.lv-full b{color:var(--pos)}.rl-app.lv-edit b{color:var(--brand)}.rl-app.lv-view b{color:#B45309}.rl-app.lv-none{opacity:.55}
.rl-people{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-3);margin-left:auto;padding:0 4px}
.rl-locked{display:flex;align-items:center;gap:10px;padding:16px;border-radius:14px;background:var(--brand-50);color:var(--ink-2);font-size:13.5px}.rl-locked svg{color:var(--brand)}
.rl-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px}
.opt-sw,.opt-num,.ar-field{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--surface);cursor:pointer}
.opt-sw input{position:absolute;opacity:0;pointer-events:none}.opt-sw.on{border-color:color-mix(in srgb,var(--brand) 45%,var(--line));background:color-mix(in srgb,var(--brand) 5%,var(--surface))}
.opt-sw>span:first-of-type,.opt-num>span:first-child,.ar-field>span:first-child{display:flex;flex-direction:column;min-width:0}
.opt-sw b,.opt-num b,.ar-field b{font-size:13px;color:var(--ink)}.opt-sw small,.opt-num small,.ar-field small{font-size:11.5px;color:var(--ink-3);line-height:1.4}
.opt-num{cursor:default}.opt-num .sel,.opt-num select{width:180px}
.on-wrap{display:inline-flex;align-items:center;gap:6px}.on-wrap .inp{width:96px}.on-wrap i{font-style:normal;font-size:12px;color:var(--ink-3)}
.rl-matrix{display:flex;flex-direction:column;gap:12px}
.rm-group{border:1px solid var(--line);border-radius:16px;overflow:hidden}
.rm-gh{display:flex;align-items:center;gap:8px;padding:9px 14px;background:var(--surface-2);font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-2)}
.rm-row{display:grid;grid-template-columns:minmax(200px,1.2fr) auto minmax(0,1.6fr);align-items:center;gap:14px;padding:10px 14px;border-top:1px solid var(--line-2)}
.rm-l{display:flex;flex-direction:column;min-width:0}.rm-l b{font-size:13px;color:var(--ink)}.rm-l small{font-size:11.5px;color:var(--ink-3)}
.lv-seg{display:inline-flex;padding:3px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line);gap:2px}
.lv-seg button{height:28px;padding:0 10px;border-radius:7px;font-size:12px;font-weight:600;color:var(--ink-3);white-space:nowrap}
.lv-seg button.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(19,26,43,.12)}
.lv-seg button.on.lv-full{color:var(--pos)}.lv-seg button.on.lv-use{color:var(--brand)}.lv-seg button.on.lv-view{color:#B45309}
.lv-seg.custom{border-style:dashed}
.act-chips{display:flex;flex-wrap:wrap;gap:5px}
.ac{display:inline-flex;align-items:center;gap:4px;height:26px;padding:0 9px;border-radius:999px;font-size:11.5px;font-weight:600;color:var(--ink-3);border:1px solid var(--line);background:var(--surface);transition:all .15s}
.ac.on{color:var(--pos);border-color:color-mix(in srgb,var(--pos) 40%,var(--line));background:color-mix(in srgb,var(--pos) 9%,var(--surface))}
.ac.deny.on{color:var(--neg);border-color:color-mix(in srgb,var(--neg) 40%,var(--line));background:color-mix(in srgb,var(--neg) 8%,var(--surface));text-decoration:line-through}
.ac:disabled{opacity:.5}
/* ---- access rules ---- */
.ar-tpl{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;margin-bottom:16px}
.ar-tpl>span{grid-column:1 / -1;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
.ar-tpl button{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border-radius:14px;border:1px dashed color-mix(in srgb,var(--brand) 40%,var(--line));background:var(--surface);text-align:left;transition:background .15s,border-color .15s}
.ar-tpl button:hover{background:var(--brand-50);border-style:solid}.ar-tpl b{font-size:13px;color:var(--ink)}.ar-tpl small{font-size:11.5px;color:var(--ink-3)}
.ar-list{display:flex;flex-direction:column;gap:10px}
.ar-card{display:flex;align-items:flex-start;gap:14px;padding:14px 16px;border-radius:16px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-1)}
.ar-card.off{opacity:.6}.ar-sw{padding-top:3px}
.ar-ct{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}.ar-ct>b{font-size:14.5px;color:var(--ink)}
.ar-who{display:flex;flex-wrap:wrap;gap:5px}.ar-who span{font-size:12px;padding:2px 9px;border-radius:999px;background:var(--brand-50);color:var(--brand);font-weight:600}.ar-who span.none{background:var(--surface-2);color:var(--ink-3)}
.ar-sum{display:flex;flex-wrap:wrap;gap:5px}
.ar-ed{display:grid;grid-template-columns:210px minmax(0,1fr) 260px;gap:16px;align-items:start}
.ar-tabs{display:flex;flex-direction:column;gap:3px;position:sticky;top:12px}
.ar-tabs button{display:flex;align-items:center;gap:9px;height:40px;padding:0 12px;border-radius:11px;font-size:13.5px;font-weight:550;color:var(--ink-2);text-align:left}
.ar-tabs button:hover{background:var(--surface-2)}.ar-tabs button.on{background:var(--surface);color:var(--brand);box-shadow:var(--sh-1);border:1px solid var(--line)}
.ar-body{display:flex;flex-direction:column;gap:12px;padding:18px;border-radius:20px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-1);min-width:0}
.mz .ar-h{margin:6px 0 0;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
.ar-people{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}
.ar-person{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:12px;border:1px solid var(--line);background:var(--surface);text-align:left}
.ar-person.on{border-color:var(--brand);background:var(--brand-50)}.ar-person:disabled{opacity:.5;cursor:not-allowed}.ar-person svg{color:var(--brand)}
.ap-t{flex:1;min-width:0;display:flex;flex-direction:column}.ap-t b{font-size:13px;color:var(--ink)}.ap-t small{font-size:11.5px;color:var(--ink-3)}
.ar-roles{display:flex;flex-wrap:wrap;gap:6px}
.chipbtn{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 11px;border-radius:999px;font-size:12.5px;font-weight:550;color:var(--ink-2);border:1px solid var(--line);background:var(--surface);transition:all .15s}
.chipbtn.on{color:var(--brand);border-color:var(--brand);background:var(--brand-50)}
.chipbtn.off{color:var(--neg);border-color:color-mix(in srgb,var(--neg) 40%,var(--line));background:color-mix(in srgb,var(--neg) 7%,var(--surface));text-decoration:line-through}
.ar-menus{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}
.ar-app{padding:12px;border-radius:14px;border:1px solid var(--line);display:flex;flex-direction:column;gap:9px}.ar-app.off{background:color-mix(in srgb,var(--neg) 4%,var(--surface))}
.ar-app-h{display:flex;align-items:center;gap:9px;cursor:pointer}.ar-app-h b{font-size:13.5px;color:var(--ink)}.ar-app-h small{margin-left:auto;font-size:11.5px;color:var(--ink-3)}
.ar-app-h .ab-ic{width:26px;height:26px;border-radius:8px}
.ar-scr{display:flex;flex-wrap:wrap;gap:5px}.ar-scr .chipbtn{height:26px;font-size:11.5px;padding:0 9px}
.ar-fields{display:flex;flex-direction:column;gap:8px}
.ar-field{cursor:default}.ar-field .seg{flex:0 0 auto}
.ar-side{position:sticky;top:12px;padding:16px;border-radius:18px;background:var(--surface-2);border:1px solid var(--line);display:flex;flex-direction:column;gap:8px}
.mz .ar-side h4{margin:0;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
.ar-side ul{margin:0 0 6px;padding:0 0 0 16px;display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--ink)}
.ar-side .ar-aff{list-style:none;padding:0}.ar-aff li{display:flex;align-items:center;gap:8px}.ar-aff .me,.ar-person .me{width:26px;height:26px;font-size:10.5px}
.ar-side p{margin:0;font-size:12.5px;color:var(--ink-3)}.ar-note{display:flex;align-items:center;gap:6px}
/* ---- overview ---- */
.acc-tbl th.c,.acc-tbl td.c{text-align:center}.acc-tbl th.c svg{display:block;margin:0 auto 2px;color:var(--ink-3)}.acc-tbl th.c span{font-size:10px}
.acc-name{font-size:13.5px}.acc-role{display:block;font-size:11.5px;color:var(--ink-3)}
.lvdot{display:inline-flex;min-width:40px;height:22px;padding:0 7px;border-radius:999px;align-items:center;justify-content:center;font-size:11px;font-weight:700}
.lvdot.lv-full{background:color-mix(in srgb,var(--pos) 13%,var(--surface));color:var(--pos)}.lvdot.lv-edit{background:var(--brand-50);color:var(--brand)}
.lvdot.lv-view{background:#FEF3C7;color:#B45309}.lvdot.lv-none{color:var(--ink-4)}
.mz[data-theme="dark"] .lvdot.lv-view,.mz[data-theme="dark"] .rl-item em.ch{background:rgba(245,158,11,.16);color:#FBBF24}
.acc-notes{display:flex;flex-wrap:wrap;gap:4px;max-width:360px}.acc-notes .pill{font-size:10.5px}.acc-tbl td{vertical-align:middle}.acc-tbl td.r{text-align:right;white-space:nowrap}
.u-acc{display:flex;flex-wrap:wrap;gap:4px}.u-acc .pill{font-size:10.5px}
.u-acts{display:flex;align-items:center;justify-content:flex-end;gap:4px;white-space:nowrap}.u-acts .btn{margin-right:4px}.u-acts .icon-btn{width:28px;height:28px;display:inline-grid;place-items:center}
.u-preview{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:14px;background:var(--surface-2);margin-bottom:16px}
.u-preview h4{margin:0;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)}
.u-rules{display:flex;flex-wrap:wrap;gap:6px}
@media(max-width:1300px){.ar-ed{grid-template-columns:190px minmax(0,1fr)}.ar-side{grid-column:1 / -1;position:static}}
@media(max-width:1000px){.rl-wrap{grid-template-columns:1fr}.rl-list{position:static;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}.rm-row{grid-template-columns:1fr}
  .ar-ed{grid-template-columns:1fr}.ar-tabs{position:static;flex-direction:row;overflow:auto}.ar-tabs button{flex:0 0 auto}}
`;
