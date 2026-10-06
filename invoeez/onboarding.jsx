/* ============================================================================
   ONBOARDING — sample-data banner, start-your-company, setup guide, spreadsheet
   import (products, customers & vendors) and opening balances.
   ========================================================================== */

const OPENING_ITEM = { id: "ob_balance", code: "OB-BAL", name: "Opening balance", category: "cat_opening", kind: "service", uom: "Balance",
  price: 0, cost: 0, tax: "nt", brand: "", packing: "", barcode: "", reorder: 0 };
const OPENING_CATEGORY = { id: "cat_opening", name: "Opening balances", income: "3900", expense: "3900", inventory: "1300", adjustment: "3900" };
const OPENING_ACCOUNT = { id: "3900", code: "3900", name: "Opening Balance Equity", type: "equity", std: true };
const isSetupItem = (p) => p.id === OPENING_ITEM.id || TEMPLATE_EXPENSE_ITEMS.some((x) => x.id === p.id) || /^EX-/.test(p.code || "");

/* Every opening entry offsets 3900, so the opening position never touches profit. */
function withOpeningSetup(s) {
  const accounts = s.accounts || [];
  return { ...s,
    accounts: ACC["3900"] || accounts.some((a) => a.code === "3900") ? accounts : [...accounts, { ...OPENING_ACCOUNT }],
    categories: (s.categories || []).some((c) => c.id === OPENING_CATEGORY.id) ? s.categories : [...(s.categories || []), { ...OPENING_CATEGORY }],
    products: (s.products || []).some((p) => p.id === OPENING_ITEM.id) ? s.products : [...(s.products || []), { ...OPENING_ITEM }] };
}
const docNumberOn = (docs, type, date, k = 0) => {
  const n = docs.filter((d) => d.type === type).reduce((m, d) => Math.max(m, +d.number.split("/").pop() || 0), 0);
  return `${DOCMETA[type].prefix}/${date.slice(0, 4)}/${String(n + 1 + k).padStart(4, "0")}`;
};
const nextSeq = (s) => Math.max(0, ...s.docs.map((x) => x.seq || 0), ...(s.stockOps || []).map((x) => x.seq || 0)) + 1;

function openingDocs(s, rows, kind, date) {
  const type = kind === "customer" ? "invoice" : "bill";
  let seq = nextSeq(s);
  return rows.map((r, k) => {
    const p = PMAP[r.partner];
    return { id: uid("d"), type, number: docNumberOn(s.docs, type, date, k), partner: r.partner, salesman: kind === "customer" ? p.salesman || "" : "",
      pricelist: "", date, due: r.due || addDays(date, p.terms || 0),
      lines: [{ id: uid("l"), product: OPENING_ITEM.id, desc: "Opening balance brought forward" + (r.ref ? " — " + r.ref : ""), qty: 1,
        price: R2(+r.amount), disc: 0, tax: "nt", account: "3900", priceSource: "Opening balance", manualPricing: true,
        accounts: { income: "3900", expense: "3900", inventory: "1300", adjustment: "3900" } }],
      ref: r.ref || "Opening balance", note: "Balance brought forward from the previous system.", state: "posted", seq: seq++, emirate: p.emirate };
  });
}
function openingStockOp(s, books, rows, date, reason = "Opening stock brought forward") {
  const n = (s.stockOps || []).filter((x) => x.kind === "count").length;
  return { id: uid("stockop"), kind: "count", date, reason, number: `COUNT/${date.slice(0, 4)}/${String(n + 1).padStart(4, "0")}`,
    state: "posted", seq: nextSeq(s), postedAt: new Date().toISOString(),
    lines: rows.map((r) => { const have = books.stock[r.product]?.qty || 0, p = PROD[r.product] || r.record;
      return { id: uid("countline"), product: r.product, expected: have, counted: R2(have + +r.qty), delta: R2(+r.qty), unit: R2(+r.unit),
        accounts: { inventory: p?.inventory || "1300", adjustment: "3900" } }; }) };
}

/* ------------------------------------------------------------ setup steps -- */
function setupSteps(state, company) {
  const setup = state.setup || {};
  const own = PRODUCTS.filter((p) => !isSetupItem(p));
  const opened = state.manual.some((e) => /^OPEN\//.test(e.number)) || state.docs.some((d) => d.lines.some((l) => l.product === OPENING_ITEM.id))
    || (state.stockOps || []).some((o) => /^Opening stock/.test(o.reason));
  return [
    { k: "company", t: "Add your company details", s: "Name, TRN, address and logo print on every invoice and report.", done: !!setup.company || (company.name !== COMPANY.name && company.name !== "Zenith General Trading L.L.C."), icon: Building2 },
    { k: "accounts", t: "Review your chart of accounts", s: `${ACCOUNTS.length} accounts are ready. Rename your bank accounts and add any you need.`, done: !!setup.accounts, icon: BookOpen },
    { k: "categories", t: "Check your product categories", s: `${CATEGORIES.filter((c) => c.id !== OPENING_CATEGORY.id).length} categories decide which revenue, cost and stock accounts each product uses.`, done: !!setup.categories, icon: Layers },
    { k: "products", t: "Add products & services", s: own.length ? `${own.length} products and services so far.` : "Type them in, or import your item list from Excel.", done: own.length > 0, icon: Package },
    { k: "customers", t: "Add your customers", s: PARTNERS.some((p) => p.role === "customer") ? `${PARTNERS.filter((p) => p.role === "customer").length} customers so far.` : "Import from Excel or add them one by one.", done: PARTNERS.some((p) => p.role === "customer"), icon: Users },
    { k: "vendors", t: "Add your vendors", s: PARTNERS.some((p) => p.role === "vendor") ? `${PARTNERS.filter((p) => p.role === "vendor").length} vendors so far.` : "Suppliers, landlord, utilities — anyone who bills you.", done: PARTNERS.some((p) => p.role === "vendor"), icon: ShoppingCart },
    { k: "opening", t: "Enter opening balances", s: "Bank balances, what customers owe, what you owe vendors and stock on hand.", done: !!setup.opening || opened, icon: Scale },
    { k: "invoice", t: "Create your first invoice", s: "Pick a customer, add products, post. Stock and accounts update by themselves.", done: state.docs.some((d) => d.type === "invoice" && !d.lines.some((l) => l.product === OPENING_ITEM.id)), icon: FileText },
    { k: "backup", t: "Download a backup", s: "Your books live in this browser. Keep a backup file somewhere safe.", done: !!setup.backup, icon: Download },
  ];
}

function SampleBanner({ onStart, onHide }) {
  return <div className="sample-banner" role="status">
    <span className="sb-icon"><Sparkles size={17} /></span>
    <span className="sb-text"><b>You are exploring a sample company.</b> Twelve months of invoices, bills, payments and stock for Zenith General Trading — try anything, nothing here is real.</span>
    <span className="sb-acts"><Btn kind="pri" icon={Rocket} onClick={onStart}>Start my company</Btn>
      <button className="icon-btn" title="Hide until next visit" aria-label="Hide sample banner" onClick={onHide}><X size={16} /></button></span>
  </div>;
}

function SetupProgress({ state, company, go }) {
  const steps = setupSteps(state, company), done = steps.filter((x) => x.done).length, next = steps.find((x) => !x.done);
  if (!next) return null;
  return <div className="setup-progress">
    <div className="sp-ring" style={{ "--p": (done / steps.length) * 100 }}><span>{done}/{steps.length}</span></div>
    <div className="sp-text"><span className="micro">GETTING STARTED</span><b>Next: {next.t.toLowerCase()}</b><small>{next.s}</small></div>
    <Btn kind="pri" icon={ArrowRight} onClick={() => go("setup")}>Continue setup</Btn>
  </div>;
}

/* ------------------------------------------------------- start a company -- */
function StartCompanyDialog({ state, company, close, onDone, backup }) {
  const sample = !!state.sample;
  const [f, setF] = useState({ name: sample ? "" : company.name === COMPANY.name ? "" : company.name, trn: "", licence: "", address: "", city: "", emirate: "Dubai",
    phone: "", email: "", admin: "", adminEmail: "" });
  const [keep, setKeep] = useState({ products: false, partners: false, pricing: false });
  const [ok, setOk] = useState(false), [step, setStep] = useState(1), [error, setError] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const own = PRODUCTS.filter((p) => !isSetupItem(p)).length;
  const txn = state.docs.length + state.payments.length + state.manual.length + (state.stockOps || []).length;
  const next = () => {
    if (f.name.trim().length < 2) return setError("Enter your company's registered name.");
    if (f.trn.trim() && !/^\d{15}$/.test(f.trn.replace(/\s/g, ""))) return setError("A UAE TRN has exactly 15 digits — or leave it blank for now.");
    if (f.admin.trim().length < 2) return setError("Enter your name. You will be the administrator.");
    setError(""); setStep(2);
  };
  const create = () => {
    const users = [{ id: "u1", name: f.admin.trim(), email: f.adminEmail.trim(), role: "admin", active: true }];
    const books = migrateBooks(freshBooks(state, { ...keep, users }));
    books.setup = {};
    onDone(books, { ...COMPANY, name: f.name.trim(), trn: f.trn.replace(/\s/g, ""), licence: f.licence.trim(), address: f.address.trim(),
      city: f.city.trim() || "United Arab Emirates", emirate: f.emirate, phone: f.phone.trim(), email: f.email.trim(), logo: "" });
  };
  return <StudioModal wide title={sample ? "Start my company" : "Start a new company"} sub={step === 1 ? "Step 1 of 2 · Who you are" : "Step 2 of 2 · What to keep"} close={close}>
    <div className="steps-dots"><i className="on" /><i className={step === 2 ? "on" : ""} /></div>
    {step === 1 ? <>
      <div className="studio-form">
        <Field label="Registered company name" span={2}><Input autoFocus value={f.name} placeholder="e.g. Al Manara Trading L.L.C." onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Tax Registration Number (TRN)"><Input value={f.trn} placeholder="15 digits, or leave blank" onChange={(e) => set("trn", e.target.value)} /></Field>
        <Field label="Trade licence"><Input value={f.licence} placeholder="Optional" onChange={(e) => set("licence", e.target.value)} /></Field>
        <Field label="Address" span={2}><Input value={f.address} placeholder="Office, building, street, area" onChange={(e) => set("address", e.target.value)} /></Field>
        <Field label="City and country"><Input value={f.city} placeholder="Dubai, United Arab Emirates" onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label="Emirate"><Select value={f.emirate} onChange={(e) => set("emirate", e.target.value)}>{EMIRATES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Telephone"><Input value={f.phone} placeholder="+971 4 000 0000" onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Accounts email"><Input type="email" value={f.email} placeholder="accounts@yourcompany.ae" onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Your name (administrator)"><Input value={f.admin} placeholder="Full name" onChange={(e) => set("admin", e.target.value)} /></Field>
        <Field label="Your email"><Input type="email" value={f.adminEmail} placeholder="Optional" onChange={(e) => set("adminEmail", e.target.value)} /></Field>
      </div>
      {error && <div role="alert" className="form-error">{error}</div>}
      <footer className="modal-actions"><Btn onClick={close}>Cancel</Btn><Btn kind="pri" icon={ArrowRight} onClick={next}>Next: choose what to keep</Btn></footer>
    </> : <>
      <div className="keep-list">
        {[["Chart of accounts", `${ACCOUNTS.length} accounts with VAT, bank, inventory and expense accounts`, true],
          ["Product categories", `${CATEGORIES.length} categories with their revenue, cost and stock accounts`, true],
          ["Expense items & payment methods", "Rent, utilities, telecom and the other items bills and expenses use", true]].map(([t, s]) =>
          <label key={t} className="keep-row locked"><input type="checkbox" checked disabled /><span className="kt"><b>{t}</b><small>{s}</small></span><Pill tone="ok">Always kept</Pill></label>)}
        {[["products", "Products & services", `${own} items you have entered`],
          ["partners", "Customers & vendors", `${PARTNERS.length} records`],
          ["pricing", "Price lists & sales team", `${(state.priceLists || []).length} price lists and ${(state.salespeople || []).length} salespeople`]].map(([k, t, s]) =>
          <label key={k} className={cx("keep-row", keep[k] && "on")}><input type="checkbox" checked={keep[k]} onChange={(e) => setKeep((x) => ({ ...x, [k]: e.target.checked }))} />
            <span className="kt"><b>{t}</b><small>{s}</small></span><Pill tone={keep[k] ? "ok" : ""}>{keep[k] ? "Keep" : "Remove"}</Pill></label>)}
      </div>
      <div className="info-strip warn-strip"><AlertTriangle size={20} /><span><b>{txn} transactions will be removed.</b><br />
        Invoices, bills, payments, journals, stock counts and fixed assets start empty. Download a backup first if you might want them back.</span>
        <Btn icon={Download} onClick={backup}>Backup</Btn></div>
      <label className="check-label confirm-check"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />I understand — start {f.name.trim() || "my company"} with clean books.</label>
      <footer className="modal-actions"><Btn onClick={() => setStep(1)}>Back</Btn><Btn kind="pri" icon={Rocket} disabled={!ok} onClick={create}>Create my company</Btn></footer>
    </>}
  </StudioModal>;
}

/* --------------------------------------------------- spreadsheet reading -- */
function parseCsv(text) {
  text = String(text).replace(/^﻿/, "");
  const first = text.split(/\r?\n/)[0] || "";
  const delim = [",", ";", "\t"].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}
async function readXlsx(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf), dec = new TextDecoder();
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65558); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("This file is not a valid Excel .xlsx workbook.");
  const entries = {}; let off = dv.getUint32(eocd + 16, true);
  for (let k = 0, n = dv.getUint16(eocd + 10, true); k < n && dv.getUint32(off, true) === 0x02014b50; k++) {
    const nl = dv.getUint16(off + 28, true), xl = dv.getUint16(off + 30, true), cl = dv.getUint16(off + 32, true);
    entries[dec.decode(u8.subarray(off + 46, off + 46 + nl))] = { method: dv.getUint16(off + 10, true), size: dv.getUint32(off + 20, true), at: dv.getUint32(off + 42, true) };
    off += 46 + nl + xl + cl;
  }
  const read = async (name) => {
    const e = entries[name]; if (!e) return null;
    const start = e.at + 30 + dv.getUint16(e.at + 26, true) + dv.getUint16(e.at + 28, true), data = u8.subarray(start, start + e.size);
    if (e.method === 0) return dec.decode(data);
    if (typeof DecompressionStream === "undefined") throw new Error("This browser cannot open .xlsx files. In Excel choose File › Save As › CSV and import that file instead.");
    return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
  };
  const xml = (s) => new DOMParser().parseFromString(s, "application/xml");
  const all = (doc, tag) => Array.from(doc.getElementsByTagNameNS("*", tag));
  const shared = [], ss = await read("xl/sharedStrings.xml");
  if (ss) all(xml(ss), "si").forEach((si) => shared.push(all(si, "t").map((t) => t.textContent).join("")));
  let path = "xl/worksheets/sheet1.xml";
  const wb = await read("xl/workbook.xml"), rels = await read("xl/_rels/workbook.xml.rels");
  if (wb && rels) {
    const sheet = all(xml(wb), "sheet")[0], rid = sheet && (sheet.getAttribute("r:id") || sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id"));
    const rel = all(xml(rels), "Relationship").find((r) => r.getAttribute("Id") === rid);
    if (rel) { const t = rel.getAttribute("Target").replace(/^\//, ""); path = t.startsWith("xl/") ? t : "xl/" + t; }
  }
  const sheetXml = await read(path) || await read(Object.keys(entries).find((k) => /^xl\/worksheets\/.+\.xml$/.test(k)));
  if (!sheetXml) throw new Error("No worksheet was found in this workbook.");
  const colOf = (ref) => { let n = 0; for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  return all(xml(sheetXml), "row").map((r) => {
    const out = [];
    all(r, "c").forEach((c, i) => {
      const t = c.getAttribute("t"), v = all(c, "v")[0], ix = c.getAttribute("r") ? colOf(c.getAttribute("r")) : i;
      out[ix] = t === "s" ? shared[+(v ? v.textContent : 0)] || "" : t === "inlineStr" ? all(c, "t").map((x) => x.textContent).join("") : v ? v.textContent : "";
    });
    return Array.from(out, (x) => (x == null ? "" : x));
  }).filter((r) => r.some((c) => String(c).trim() !== ""));
}
async function readSpreadsheet(file) {
  const name = file.name.toLowerCase();
  if (/\.(csv|txt)$/.test(name)) return parseCsv(await file.text());
  if (/\.xlsx$/.test(name)) return readXlsx(await file.arrayBuffer());
  if (/\.xls$/.test(name)) throw new Error("Old .xls files are not supported. Open the file in Excel and save it as .xlsx or CSV.");
  throw new Error("Choose an Excel .xlsx or a .csv file.");
}

/* -------------------------------------------------------- import columns -- */
const IMPORT_SPECS = {
  products: {
    title: "Import products & services", noun: "products",
    cols: [["code", "Product code / SKU", ["code", "productcode", "sku", "itemcode", "partnumber", "partno"]],
      ["name", "Product name", ["name", "productname", "item", "itemname", "description", "productdescription"]],
      ["type", "Type (goods or service)", ["type", "itemtype", "kind", "producttype"]],
      ["category", "Category", ["category", "productcategory", "group", "itemgroup"]],
      ["brand", "Brand", ["brand", "make", "manufacturer"]],
      ["barcode", "Barcode", ["barcode", "ean", "upc", "gtin"]],
      ["uom", "Unit", ["unit", "uom", "unitofmeasure", "units"]],
      ["packing", "Packing", ["packing", "pack", "packsize"]],
      ["price", "Sales price (excl. VAT)", ["salesprice", "price", "sellingprice", "saleprice", "rate", "unitprice"]],
      ["cost", "Cost price", ["cost", "costprice", "purchaseprice", "standardcost", "buyprice", "unitcost"]],
      ["tax", "VAT", ["vat", "tax", "vatrate", "taxrate", "vatcode"]],
      ["reorder", "Low-stock level", ["lowstocklevel", "lowstock", "reorder", "reorderlevel", "minstock", "minimumstock"]],
      ["qty", "Opening quantity", ["openingquantity", "openingqty", "qty", "quantity", "stock", "onhand", "stockonhand"]]],
    example: [["LT-1001", "Dell Latitude 3440 14\" i5 / 8GB / 256GB", "goods", "Laptops & notebooks", "Dell", "6291234500017", "Units", "Box of 1", 2450, 1780, "5%", 4, 12],
      ["SV-INST", "On-site installation (per hour)", "service", "Installation & cabling", "", "", "Hours", "", 200, 0, "5%", "", ""]],
  },
  partners: {
    title: "Import customers & vendors", noun: "customers and vendors",
    cols: [["name", "Name", ["name", "customername", "vendorname", "suppliername", "company", "companyname", "partner"]],
      ["role", "Type (customer or vendor)", ["type", "role", "partnertype", "customerorvendor"]],
      ["trn", "TRN", ["trn", "taxregistrationnumber", "vatnumber", "taxnumber", "vatno"]],
      ["emirate", "Emirate / territory", ["emirate", "territory", "region", "city", "state"]],
      ["address", "Address", ["address", "fulladdress", "street"]],
      ["contact", "Email", ["email", "emailaddress", "contact", "mail"]],
      ["phone", "Phone / WhatsApp", ["phone", "mobile", "whatsapp", "telephone", "tel", "phonenumber"]],
      ["terms", "Payment terms (days)", ["paymentterms", "terms", "creditdays", "days", "creditterms"]],
      ["balance", "Opening balance", ["openingbalance", "balance", "balancedue", "amountdue", "outstanding"]]],
    example: [["Al Manara Trading L.L.C.", "customer", "100123456700003", "Dubai", "Office 402, Al Barsha 1", "accounts@almanara.ae", "+971501112233", 30, 12500],
      ["Gulf Paper Supplies", "vendor", "100765432100003", "Sharjah", "Industrial Area 6", "ar@gulfpaper.ae", "+971655544433", 45, 4800]],
  },
};
const normHead = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
/* Reads 1,234.50 · AED 1,234 · (500) · 12% — blank is null, anything else unreadable is NaN. */
const numOf = (v) => {
  let t = String(v == null ? "" : v).replace(/aed|dhs?|,|%|\s/gi, "");
  if (!t) return null;
  const neg = /^\(.*\)$/.test(t); t = t.replace(/[()]/g, "");
  return /^-?\d*\.?\d+(e-?\d+)?$/i.test(t) ? (neg ? -1 : 1) * parseFloat(t) : NaN;
};
function vatOf(v) {
  const raw = String(v == null ? "" : v).trim(); if (!raw) return "s5";
  const n = numOf(raw);
  if (n != null && !Number.isNaN(n)) return n === 5 || n === 0.05 ? "s5" : n === 0 ? "z0" : null;
  const s = normHead(raw);
  if (/standard|^s5$|^vat5|^std/.test(s)) return "s5";
  if (/zero|^z0$|export/.test(s)) return "z0";
  if (/exempt|^ex$/.test(s)) return "ex";
  if (/outofscope|none|^nt$|^na$|notapplicable/.test(s)) return "nt";
  if (/reverse|rcm|rc5/.test(s)) return "rc5";
  return null;
}
function templateFor(kind, format) {
  const spec = IMPORT_SPECS[kind], head = spec.cols.map((c) => c[1]);
  if (format === "csv") return saveText([head, ...spec.example].map((r) => r.map((c) => /[",;\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(",")).join("\r\n"), `invoeez-${kind === "partners" ? "customers-vendors" : kind}-template.csv`, "text/csv;charset=utf-8");
  const guide = kind === "products"
    ? [["How to fill this sheet"], [], ["Product code / SKU", "Required and unique. Existing codes are updated."], ["Product name", "Required."], ["Type", "goods (kept in stock) or service."],
      ["Category", "Must match a category name — new names create a new category."], ["VAT", "5%, 0%, exempt or out of scope. Blank means 5%."],
      ["Opening quantity", "Optional. Stock on hand on your start date, valued at cost."], [], ["Categories in your books"], ...CATEGORIES.map((c) => [c.name])]
    : [["How to fill this sheet"], [], ["Name", "Required."], ["Type", "customer or vendor."], ["TRN", "15 digits, or blank if not VAT registered."],
      ["Emirate / territory", EMIRATES.join(", ") + ", Export or Import."], ["Payment terms", "Days to pay, e.g. 30."],
      ["Opening balance", "Optional. What the customer owes you, or what you owe the vendor, on your start date."]];
  const bytes = buildXlsx([{ name: spec.noun.slice(0, 31), rows: [head, ...spec.example], head: [0] }, { name: "Instructions", rows: guide, head: [0] }]);
  return saveBlob(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `invoeez-${kind === "partners" ? "customers-vendors" : kind}-template.xlsx`);
}

/* Map a sheet to records and check every row before anything is saved. */
function analyseImport(kind, rows, opts) {
  const spec = IMPORT_SPECS[kind];
  const head = (rows[0] || []).map(normHead), map = {};
  spec.cols.forEach(([key, label, alias]) => { const i = head.findIndex((h) => h === normHead(label) || alias.includes(h)); if (i >= 0) map[key] = i; });
  const missing = kind === "products" ? ["name"].filter((k) => map[k] == null) : ["name"].filter((k) => map[k] == null);
  const get = (r, k) => (map[k] == null ? "" : String(r[map[k]] == null ? "" : r[map[k]]).trim());
  const seen = new Set(), out = [];
  rows.slice(1).forEach((r, i) => {
    const errs = [], warn = [];
    if (kind === "products") {
      const name = get(r, "name"); let code = get(r, "code");
      const typeRaw = normHead(get(r, "type")), kindOf = /serv|labou?r|nonstock|nonstockitem/.test(typeRaw) ? "service" : "goods";
      if (name.length < 2) errs.push("Name is missing");
      if (!code) { code = (kindOf === "goods" ? "P-" : "S-") + String(PRODUCTS.length + out.length + 1).padStart(4, "0"); warn.push("Code generated"); }
      if (seen.has(normSearch(code))) errs.push("Code repeated in this file"); seen.add(normSearch(code));
      const existing = PRODUCTS.find((p) => normSearch(p.code) === normSearch(code));
      const catName = get(r, "category"), cat = CATEGORIES.find((c) => normSearch(c.name) === normSearch(catName));
      if (catName && !cat) warn.push(`New category “${catName}”`);
      const price = numOf(get(r, "price")), cost = numOf(get(r, "cost")), reorder = numOf(get(r, "reorder")), qty = numOf(get(r, "qty"));
      if ([price, cost, reorder, qty].some((n) => Number.isNaN(n) || (n != null && n < 0))) errs.push("Prices and quantities must be numbers, zero or more");
      const tax = vatOf(get(r, "tax")); if (!tax) errs.push("VAT must be 5%, 0%, exempt or out of scope");
      const barcode = get(r, "barcode").replace(/\.0$/, "");
      if (barcode && PRODUCTS.some((p) => p.barcode === barcode && (!existing || p.id !== existing.id))) errs.push("Barcode belongs to another product");
      if (qty && kindOf !== "goods") warn.push("Opening quantity ignored for services");
      if (existing && opts.existing === "skip") warn.push("Already exists — will be skipped");
      out.push({ row: i + 2, errs, warn, existing, skip: !!existing && opts.existing === "skip", catName, cat,
        rec: { ...(existing || newProduct()), code, name, kind: kindOf, brand: get(r, "brand") || existing?.brand || "", barcode: barcode || existing?.barcode || "",
          uom: get(r, "uom") || existing?.uom || (kindOf === "goods" ? "Units" : "Hours"), packing: get(r, "packing") || existing?.packing || "",
          price: price ?? existing?.price ?? 0, cost: cost ?? existing?.cost ?? 0, tax: tax || "s5", reorder: reorder ?? existing?.reorder ?? (kindOf === "goods" ? 5 : 0) },
        qty: kindOf === "goods" ? qty || 0 : 0 });
    } else {
      const name = get(r, "name"), roleRaw = normHead(get(r, "role"));
      const role = opts.role !== "column" ? opts.role : /vend|supp|creditor|payable/.test(roleRaw) ? "vendor" : /cust|client|debtor|receivable/.test(roleRaw) ? "customer" : "";
      if (name.length < 2) errs.push("Name is missing");
      if (!role) errs.push("Type must say customer or vendor");
      const trn = get(r, "trn").replace(/[\s-]/g, "").replace(/\.0$/, "");
      if (trn && !/^\d{15}$/.test(trn)) errs.push("TRN must have exactly 15 digits");
      const terr = get(r, "emirate"), emirate = [...EMIRATES, "Export", "Import"].find((x) => normSearch(x) === normSearch(terr)) || (/abu|ain/.test(normHead(terr)) ? "Abu Dhabi" : /rak|khaimah/.test(normHead(terr)) ? "Ras Al Khaimah" : "");
      if (terr && !emirate) warn.push(`Territory “${terr}” read as Dubai`);
      const terms = numOf(get(r, "terms")), balance = numOf(get(r, "balance"));
      if (Number.isNaN(terms) || (terms != null && terms < 0)) errs.push("Payment terms must be a number of days");
      if (Number.isNaN(balance)) errs.push("Opening balance must be a number");
      const key = normSearch(name) + "|" + role; if (seen.has(key)) errs.push("Repeated in this file"); seen.add(key);
      const existing = PARTNERS.find((p) => p.role === role && normSearch(p.name) === normSearch(name));
      if (existing && opts.existing === "skip") warn.push("Already exists — will be skipped");
      out.push({ row: i + 2, errs, warn, existing, skip: !!existing && opts.existing === "skip",
        rec: { ...(existing || newPartner(role || "customer")), role: role || "customer", name, trn: trn || existing?.trn || "", emirate: emirate || existing?.emirate || "Dubai",
          address: get(r, "address") || existing?.address || "", contact: get(r, "contact") || existing?.contact || "", phone: get(r, "phone") || existing?.phone || "",
          terms: terms ?? existing?.terms ?? 30 },
        balance: balance || 0 });
    }
  });
  return { map, missing, rows: out, ok: out.filter((x) => !x.errs.length && !x.skip) };
}

function ImportDialog({ kind, state, setState, books, close, toast }) {
  const spec = IMPORT_SPECS[kind];
  const [file, setFile] = useState(null), [rows, setRows] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [opts, setOpts] = useState({ existing: "update", role: kind === "partners" ? "column" : "", date: TODAY });
  const [drag, setDrag] = useState(false);
  const result = useMemo(() => (rows ? analyseImport(kind, rows, opts) : null), [rows, opts, kind]);
  const load = async (f) => {
    if (!f) return; setBusy(true); setError(""); setFile(f);
    try { const r = await readSpreadsheet(f); if (r.length < 2) throw new Error("The sheet needs a header row and at least one data row."); setRows(r); }
    catch (e) { setRows(null); setError(e.message || "That file could not be read."); }
    setBusy(false);
  };
  const withQty = result ? result.ok.filter((x) => x.qty > 0) : [], withBal = result ? result.ok.filter((x) => Math.abs(x.balance || 0) > 0.004) : [];
  const run = () => {
    const ok = result.ok; if (!ok.length) return;
    let next = { ...state };
    if (withQty.length || withBal.length) next = withOpeningSetup(next);
    if (kind === "products") {
      const cats = [...next.categories];
      const recs = ok.map((x) => {
        let c = x.cat || (x.catName && cats.find((y) => normSearch(y.name) === normSearch(x.catName)));
        if (!c && x.catName) { const base = cats.find((y) => y.id === (x.rec.kind === "goods" ? "cat_goods" : "cat_services")) || cats[0];
          c = { ...base, id: uid("cat"), name: x.catName }; cats.push(c); }
        if (!c) c = (x.existing && cats.find((y) => y.id === x.existing.category)) || cats.find((y) => y.id === (x.rec.kind === "goods" ? "cat_goods" : "cat_services")) || cats[0];
        return { ...x.rec, category: c.id, income: c.income, expense: c.expense, inventory: c.inventory, adjustment: c.adjustment };
      });
      const ids = new Set(recs.map((r) => r.id));
      next = { ...next, categories: cats, products: [...next.products.filter((p) => !ids.has(p.id)), ...recs] };
      if (withQty.length) {
        recs.forEach((r) => { PROD[r.id] = enrichProduct(r); });
        const lines = withQty.map((x) => { const r = recs.find((y) => y.code === x.rec.code); return { product: r.id, qty: x.qty, unit: r.cost, record: r }; });
        next = { ...next, stockOps: [...(next.stockOps || []), openingStockOp(next, books, lines, opts.date, "Opening stock — imported from " + (file?.name || "spreadsheet"))] };
      }
    } else {
      const recs = ok.map((x) => x.rec), ids = new Set(recs.map((r) => r.id));
      next = { ...next, partners: [...next.partners.filter((p) => !ids.has(p.id)), ...recs] };
      if (withBal.length) {
        recs.forEach((r) => { PMAP[r.id] = r; });
        const pos = (role) => withBal.filter((x) => x.rec.role === role).map((x) => ({ partner: x.rec.id, amount: Math.abs(x.balance), due: "", ref: "Opening balance" }));
        const inv = openingDocs(next, pos("customer"), "customer", opts.date);
        const bills = openingDocs({ ...next, docs: [...next.docs, ...inv] }, pos("vendor"), "vendor", opts.date);
        next = { ...next, docs: [...next.docs, ...inv, ...bills] };
      }
    }
    setState(next);
    toast(`${ok.length} ${spec.noun} imported${withQty.length ? ` · opening stock for ${withQty.length} items` : ""}${withBal.length ? ` · ${withBal.length} opening balances` : ""}`);
    close();
  };
  return <StudioModal wide title={spec.title} sub="Bring your list from Excel. Nothing is saved until you confirm." close={close}>
    <div className="import-steps">
      <section><span className="step-no">1</span><div><b>Get the template</b><p>Fill one row per {kind === "products" ? "product or service" : "customer or vendor"}. Your own column names usually work too.</p>
        <div className="row-btns"><Btn icon={FileSpreadsheet} onClick={() => templateFor(kind, "xlsx")}>Excel template</Btn><Btn icon={FileDown} onClick={() => templateFor(kind, "csv")}>CSV template</Btn></div></div></section>
      <section><span className="step-no">2</span><div><b>Choose your file</b><p>.xlsx or .csv — the first sheet is read.</p>
        <label className={cx("drop-zone", drag && "drag")} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); load(e.dataTransfer.files[0]); }}>
          <CloudUpload size={26} /><span>{busy ? "Reading…" : file ? file.name : "Drop the file here or click to browse"}</span>
          <input type="file" accept=".xlsx,.csv,.txt" onChange={(e) => { load(e.target.files[0]); e.target.value = ""; }} /></label></div></section>
    </div>
    {error && <div role="alert" className="form-error">{error}</div>}
    {result && <>
      {result.missing.length > 0 && <div role="alert" className="form-error">No “Name” column was found. Use the template headings in the first row.</div>}
      <div className="import-options">
        <Field label="If a record already exists"><Select value={opts.existing} onChange={(e) => setOpts({ ...opts, existing: e.target.value })}><option value="update">Update it with the sheet</option><option value="skip">Skip it</option></Select></Field>
        {kind === "partners" && <Field label="Import rows as"><Select value={opts.role} onChange={(e) => setOpts({ ...opts, role: e.target.value })}><option value="column">Use the Type column</option><option value="customer">All customers</option><option value="vendor">All vendors</option></Select></Field>}
        {(withQty.length > 0 || withBal.length > 0) && <Field label={kind === "products" ? "Opening stock date" : "Opening balance date"}><Input type="date" max={TODAY} value={opts.date} onChange={(e) => setOpts({ ...opts, date: e.target.value })} /></Field>}
      </div>
      <div className="import-summary">
        <span className="ok"><CircleCheck size={16} />{result.ok.length} ready</span>
        {result.rows.some((x) => x.errs.length) && <span className="bad"><CircleAlert size={16} />{result.rows.filter((x) => x.errs.length).length} need fixing</span>}
        {result.rows.some((x) => x.skip) && <span><Clock size={16} />{result.rows.filter((x) => x.skip).length} skipped</span>}
        {withQty.length > 0 && <span><Package size={16} />Opening stock for {withQty.length} items · AED {money(withQty.reduce((s, x) => s + x.qty * x.rec.cost, 0), false)}</span>}
        {withBal.length > 0 && <span><Scale size={16} />{withBal.length} opening balances</span>}
      </div>
      <div className="tbl-wrap import-preview"><table className="tbl">
        <thead><tr><th>Row</th>{kind === "products" ? <><th>Code</th><th>Name</th><th>Type</th><th>Category</th><th className="n">Price</th><th className="n">Cost</th><th className="n">Opening qty</th></>
          : <><th>Name</th><th>Type</th><th>TRN</th><th>Territory</th><th className="n">Terms</th><th className="n">Opening balance</th></>}<th>Check</th></tr></thead>
        <tbody>{result.rows.slice(0, 300).map((x) => <tr key={x.row} className={x.errs.length ? "row-bad" : x.skip ? "row-skip" : ""}>
          <td className="muted">{x.row}</td>
          {kind === "products" ? <><td className="mono">{x.rec.code}</td><td>{x.rec.name}</td><td>{x.rec.kind}</td><td>{x.cat?.name || x.catName || <span className="muted">Default</span>}</td>
            <td className="n">{money(x.rec.price)}</td><td className="n">{money(x.rec.cost)}</td><td className="n">{x.qty || "—"}</td></>
            : <><td>{x.rec.name}</td><td>{x.rec.role}</td><td className="mono">{x.rec.trn || <span className="muted">—</span>}</td><td>{x.rec.emirate}</td><td className="n">{x.rec.terms}</td><td className="n">{money(x.balance)}</td></>}
          <td>{x.errs.length ? <span className="neg">{x.errs.join(" · ")}</span> : <span className={x.warn.length ? "muted" : "pos"}>{x.warn.length ? x.warn.join(" · ") : x.existing ? "Will update" : "New"}</span>}</td>
        </tr>)}</tbody></table></div>
    </>}
    <footer className="modal-actions"><Btn onClick={close}>Cancel</Btn><Btn kind="pri" icon={Check} disabled={!result || !result.ok.length || result.missing.length > 0} onClick={run}>
      {result ? `Import ${result.ok.length} ${spec.noun}` : "Import"}</Btn></footer>
  </StudioModal>;
}

/* ------------------------------------------------------- opening balances -- */
function OpeningBalancesDialog({ state, setState, books, close, toast }) {
  const banks = ACCOUNTS.filter((a) => a.type === "bank");
  const [date, setDate] = useState(() => (state.docs.length ? TODAY : som(TODAY)));
  const [bank, setBank] = useState({});
  const row = () => ({ id: uid("ob"), partner: "", amount: "", due: "", ref: "" });
  const [cust, setCust] = useState([row()]), [vend, setVend] = useState([row()]);
  const [stock, setStock] = useState([{ id: uid("ob"), product: "", qty: "", unit: "" }]);
  const [error, setError] = useState("");
  const custOk = cust.filter((r) => r.partner && +r.amount > 0), vendOk = vend.filter((r) => r.partner && +r.amount > 0);
  const stockOk = stock.filter((r) => r.product && +r.qty > 0);
  const bankTotal = R2(banks.reduce((s, a) => s + (+bank[a.code] || 0), 0));
  const stockTotal = R2(stockOk.reduce((s, r) => s + +r.qty * +(r.unit === "" ? PROD[r.product]?.cost || 0 : r.unit), 0));
  const equity = R2(bankTotal + custOk.reduce((s, r) => s + +r.amount, 0) - vendOk.reduce((s, r) => s + +r.amount, 0) + stockTotal);
  const post = () => {
    if (!date || date > TODAY) return setError("Use today or an earlier date.");
    if (!bankTotal && !custOk.length && !vendOk.length && !stockOk.length) return setError("Enter at least one balance.");
    if (stockOk.some((r) => books.moves.some((m) => m.product === r.product && m.date > date))) return setError("One of these products already has stock movements after this date. Pick a later date.");
    let next = withOpeningSetup({ ...state });
    if (bankTotal || banks.some((a) => +bank[a.code])) {
      const lines = banks.filter((a) => +bank[a.code]).map((a) => { const v = R2(+bank[a.code]); return { acc: a.code, debit: v > 0 ? v : 0, credit: v < 0 ? -v : 0, label: "Opening balance", partner: null }; });
      lines.push({ acc: "3900", debit: bankTotal < 0 ? -bankTotal : 0, credit: bankTotal > 0 ? bankTotal : 0, label: "Opening balance equity", partner: null });
      const n = next.manual.filter((e) => /^OPEN\//.test(e.number)).length;
      next.manual = [...next.manual, { id: uid("je"), number: `OPEN/${date.slice(0, 4)}/${String(n + 1).padStart(4, "0")}`, date, ref: `Opening bank & cash balances — ${dmy(date)}`, journal: "Miscellaneous", lines }];
    }
    const inv = openingDocs(next, custOk, "customer", date);
    next = { ...next, docs: [...next.docs, ...inv] };
    const bills = openingDocs(next, vendOk, "vendor", date);
    next = { ...next, docs: [...next.docs, ...bills] };
    if (stockOk.length) next = { ...next, stockOps: [...(next.stockOps || []), openingStockOp(next, books, stockOk.map((r) => ({ product: r.product, qty: +r.qty, unit: r.unit === "" ? PROD[r.product].cost : +r.unit })), date)] };
    next.setup = { ...(next.setup || {}), opening: TODAY };
    setState(next); toast("Opening balances posted. Opening Balance Equity holds AED " + money(equity, false)); close();
  };
  const partnerRows = (rows, setRows, side) => <div className="ob-rows">
    {rows.map((r) => { const ch = (k, v) => setRows(rows.map((x) => (x.id === r.id ? { ...x, [k]: v } : x)));
      return <div className="ob-row" key={r.id}>
        <SmartPicker items={partnerOptions(side)} value={r.partner} onChange={(v) => ch("partner", v)} label={side === "sale" ? "Customer" : "Vendor"} placeholder={side === "sale" ? "Customer…" : "Vendor…"} />
        <Input n type="number" min="0" step="0.01" placeholder="Amount incl. VAT" value={r.amount} onChange={(e) => ch("amount", e.target.value)} />
        <Input type="date" title="Due date (optional)" value={r.due} onChange={(e) => ch("due", e.target.value)} />
        <Input placeholder="Invoice no. (optional)" value={r.ref} onChange={(e) => ch("ref", e.target.value)} />
        <button className="icon-btn" title="Remove row" onClick={() => setRows(rows.length > 1 ? rows.filter((x) => x.id !== r.id) : [row()])}><Trash2 size={15} /></button>
      </div>; })}
    <Btn size="sm" icon={Plus} onClick={() => setRows([...rows, row()])}>Add row</Btn></div>;
  return <StudioModal wide title="Opening balances" sub="Where your business stood on the day you start using InvoEez." close={close}>
    <div className="studio-form"><Field label="Start date (balances as at)"><Input type="date" max={TODAY} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <div className="info-strip"><Scale size={18} /><span>Each balance is posted against <b>3900 Opening Balance Equity</b>, so profit is not affected. Your accountant can later move that total to capital or retained earnings.</span></div></div>
    <h3 className="ob-head"><Landmark size={16} />Bank & cash</h3>
    <div className="ob-banks">{banks.map((a) => <Field key={a.code} label={`${a.code} · ${a.name}`}><Input n type="number" step="0.01" placeholder="0.00" value={bank[a.code] || ""} onChange={(e) => setBank({ ...bank, [a.code]: e.target.value })} /></Field>)}</div>
    <h3 className="ob-head"><ArrowDownLeft size={16} />Customers who owe you<small>One row per unpaid invoice gives the most accurate aging.</small></h3>
    {PARTNERS.some((p) => p.role === "customer") ? partnerRows(cust, setCust, "sale") : <p className="muted ob-empty">Add customers first, then come back.</p>}
    <h3 className="ob-head"><ArrowUpRight size={16} />Vendors you owe</h3>
    {PARTNERS.some((p) => p.role === "vendor") ? partnerRows(vend, setVend, "purchase") : <p className="muted ob-empty">Add vendors first, then come back.</p>}
    <h3 className="ob-head"><Package size={16} />Stock on hand<small>Valued at the unit cost you enter (defaults to the product cost).</small></h3>
    {PRODUCTS.some((p) => p.kind === "goods") ? <div className="ob-rows">{stock.map((r) => { const ch = (k, v) => setStock(stock.map((x) => (x.id === r.id ? { ...x, [k]: v } : x)));
      return <div className="ob-row stock" key={r.id}>
        <SmartPicker items={productOptions(books).filter((x) => PROD[x.id].kind === "goods")} value={r.product} onChange={(v) => ch("product", v)} label="Product" placeholder="Product…" />
        <Input n type="number" min="0" placeholder="Quantity" value={r.qty} onChange={(e) => ch("qty", e.target.value)} />
        <Input n type="number" min="0" step="0.01" placeholder={r.product ? "Cost " + money(PROD[r.product]?.cost, false) : "Unit cost"} value={r.unit} onChange={(e) => ch("unit", e.target.value)} />
        <button className="icon-btn" title="Remove row" onClick={() => setStock(stock.length > 1 ? stock.filter((x) => x.id !== r.id) : [{ id: uid("ob"), product: "", qty: "", unit: "" }])}><Trash2 size={15} /></button>
      </div>; })}<Btn size="sm" icon={Plus} onClick={() => setStock([...stock, { id: uid("ob"), product: "", qty: "", unit: "" }])}>Add product</Btn></div>
      : <p className="muted ob-empty">Add products first — or import them with an Opening quantity column.</p>}
    <div className="ob-total"><span>Opening Balance Equity</span><b>AED {money(equity, false)}</b></div>
    {error && <div role="alert" className="form-error">{error}</div>}
    <footer className="modal-actions"><Btn onClick={close}>Cancel</Btn><Btn kind="pri" icon={Check} onClick={post}>Post opening balances</Btn></footer>
  </StudioModal>;
}

/* ------------------------------------------------------------ setup page -- */
function SetupScreen({ state, setState, books, company, go, newDoc, toast, backup, startCompany, loadSample }) {
  const [dlg, setDlg] = useState(null);
  const steps = setupSteps(state, company), done = steps.filter((x) => x.done).length;
  const mark = (k, v = TODAY) => setState((s) => ({ ...s, setup: { ...(s.setup || {}), [k]: v } }));
  const act = {
    company: [["Open company profile", () => { mark("company"); go("settings"); }]],
    accounts: [["Review accounts", () => { mark("accounts"); go("accounts"); }]],
    categories: [["Open categories", () => { mark("categories"); go("categories"); }]],
    products: [["Import from Excel", () => setDlg("products"), true], ["Add one", () => go("products")]],
    customers: [["Import from Excel", () => setDlg("partners"), true], ["Add one", () => go("partners")]],
    vendors: [["Import from Excel", () => setDlg("partners"), true], ["Add one", () => go("vendors")]],
    opening: [["Enter balances", () => setDlg("opening"), true], ["Not needed", () => mark("opening")]],
    invoice: [["New invoice", () => newDoc("invoice"), true]],
    backup: [["Download backup", () => backup(), true]],
  };
  return <div className="setup-page">
    <PageHead eyebrow="Home" title="Setup guide" sub="Nine short steps from an empty company to your first invoice. Do them in any order.">
      <Btn icon={RotateCcw} onClick={startCompany}>Start a new company</Btn></PageHead>
    <div className="setup-grid">
      <Card className="setup-steps" title={`${done} of ${steps.length} done`} sub={done === steps.length ? "Your company is set up. Well done." : "Tick them off at your own pace."}
        right={<div className="setup-bar" aria-hidden="true"><i style={{ width: (done / steps.length) * 100 + "%" }} /></div>}>
        <ol>{steps.map((s, i) => <li key={s.k} className={s.done ? "done" : ""}>
          <span className="st-no">{s.done ? <Check size={15} strokeWidth={3} /> : i + 1}</span>
          <span className="st-icon"><s.icon size={18} /></span>
          <span className="st-text"><b>{s.t}</b><small>{s.s}</small></span>
          <span className="st-acts">{(act[s.k] || []).map(([l, f, pri]) => <Btn key={l} size="sm" kind={pri && !s.done ? "pri" : undefined} onClick={f}>{l}</Btn>)}</span>
        </li>)}</ol>
      </Card>
      <div className="setup-side">
        <Card title="Bring your data" sub="Excel or CSV, checked row by row before anything is saved">
          <div className="tool-list">
            <button onClick={() => setDlg("products")}><span className="quick-icon blue"><Package size={19} /></span><span><b>Products & services</b><small>Codes, prices, categories, barcodes and opening stock</small></span><ChevronRight size={16} /></button>
            <button onClick={() => setDlg("partners")}><span className="quick-icon peach"><Users size={19} /></span><span><b>Customers & vendors</b><small>TRN, terms, contacts and opening balances</small></span><ChevronRight size={16} /></button>
            <button onClick={() => setDlg("opening")}><span className="quick-icon lilac"><Scale size={19} /></span><span><b>Opening balances</b><small>Bank, receivables, payables and stock on your start date</small></span><ChevronRight size={16} /></button>
          </div>
          <div className="row-btns templates"><Btn size="sm" icon={FileSpreadsheet} onClick={() => templateFor("products", "xlsx")}>Products template</Btn><Btn size="sm" icon={FileSpreadsheet} onClick={() => templateFor("partners", "xlsx")}>Customers & vendors template</Btn></div>
        </Card>
      </div>
    </div>
    {(dlg === "products" || dlg === "partners") && <ImportDialog kind={dlg} state={state} setState={setState} books={books} toast={toast} close={() => setDlg(null)} />}
    {dlg === "opening" && <OpeningBalancesDialog state={state} setState={setState} books={books} toast={toast} close={() => setDlg(null)} />}
  </div>;
}

const ONBOARD_CSS = `
.sample-banner{display:flex;align-items:center;gap:14px;margin:18px 0 0;padding:12px 14px 12px 16px;border-radius:14px;background:linear-gradient(90deg,var(--brand-50),var(--surface));border:1px solid var(--brand-100);color:var(--ink-2);font-size:12.5px;line-height:1.5}
.sample-banner .sb-icon{width:34px;height:34px;flex:0 0 34px;border-radius:10px;display:grid;place-items:center;background:var(--surface);color:var(--brand);border:1px solid var(--brand-100)}
.sample-banner .sb-text{flex:1;min-width:0}.sample-banner .sb-text b{color:var(--ink);font-weight:600}
.sample-banner .sb-acts{display:flex;align-items:center;gap:6px;flex-shrink:0}
.setup-progress{display:flex;align-items:center;gap:18px;padding:16px 20px;margin-bottom:20px;border-radius:16px;border:1px solid var(--line);background:var(--surface);box-shadow:var(--sh-1)}
.sp-ring{--p:0;width:52px;height:52px;flex:0 0 52px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--brand) calc(var(--p)*1%),var(--surface-3) 0)}
.sp-ring span{width:40px;height:40px;border-radius:50%;background:var(--surface);display:grid;place-items:center;font-size:12px;font-weight:650;color:var(--ink)}
.sp-text{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0}.sp-text b{font-size:14px;color:var(--ink);font-weight:600}.sp-text small{font-size:12px;color:var(--ink-3)}
.steps-dots{display:flex;gap:6px;margin:-4px 0 18px}.steps-dots i{height:4px;flex:1;border-radius:4px;background:var(--surface-3)}.steps-dots i.on{background:var(--brand)}
.keep-list{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.keep-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;cursor:pointer;background:var(--surface)}
.keep-row.on{border-color:var(--brand);background:var(--brand-50)}.keep-row.locked{cursor:default;background:var(--surface-2)}
.keep-row input{width:17px;height:17px;accent-color:var(--brand)}.keep-row .kt{flex:1;display:flex;flex-direction:column;gap:2px}.keep-row b{font-size:13px;font-weight:600;color:var(--ink)}.keep-row small{font-size:12px;color:var(--ink-3)}
.warn-strip{background:var(--warn-50);border-color:#e9d3a8;color:var(--ink-2);align-items:center}.warn-strip>svg{color:var(--warn)}.warn-strip>span{flex:1}
.confirm-check{margin:16px 0 4px;font-size:13px;display:flex;gap:10px;align-items:center}.confirm-check input{width:17px;height:17px;accent-color:var(--brand)}
.import-steps{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
.import-steps section{display:flex;gap:12px;padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2)}
.import-steps section>div{flex:1;min-width:0}.import-steps b{font-size:13.5px;color:var(--ink)}.import-steps p{font-size:12px;color:var(--ink-3);margin:4px 0 12px;line-height:1.5}
.step-no{width:26px;height:26px;flex:0 0 26px;border-radius:50%;display:grid;place-items:center;background:var(--brand);color:#fff;font-size:12px;font-weight:650}
.row-btns{display:flex;gap:8px;flex-wrap:wrap}.row-btns.templates{margin-top:14px;padding-top:14px;border-top:1px solid var(--line-2)}
.drop-zone{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:92px;border:1.5px dashed var(--brand-100);border-radius:12px;background:var(--surface);color:var(--ink-3);font-size:12px;cursor:pointer;text-align:center;padding:12px;transition:background .15s,border-color .15s}
.drop-zone:hover,.drop-zone.drag{border-color:var(--brand);background:var(--brand-50);color:var(--brand)}.drop-zone svg{color:var(--brand)}.drop-zone input{display:none}
.import-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin:6px 0 14px}
.import-summary{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}.import-summary span{display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:6px 11px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line);color:var(--ink-2)}
.import-summary .ok{color:var(--pos);background:var(--pos-50);border-color:transparent}.import-summary .bad{color:var(--neg);background:var(--neg-50);border-color:transparent}
.import-preview{max-height:320px;overflow:auto;border:1px solid var(--line);border-radius:12px}.import-preview .tbl td{padding-top:9px;padding-bottom:9px}
.import-preview tr.row-bad td{background:var(--neg-50)}.import-preview tr.row-skip td{opacity:.55}
.studio-modal .ob-head{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--ink);margin:28px 0 12px;padding-top:18px;border-top:1px solid var(--line-2)}.ob-head small{font-weight:400;color:var(--ink-3);font-size:12px;margin-left:4px}.ob-head svg{color:var(--brand)}
.ob-banks{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.ob-rows{display:flex;flex-direction:column;gap:8px;align-items:flex-start}.ob-row{display:grid;grid-template-columns:minmax(200px,2fr) minmax(110px,1fr) 150px minmax(120px,1fr) 34px;gap:8px;width:100%;align-items:center}
.ob-row.stock{grid-template-columns:minmax(220px,2.4fr) minmax(100px,1fr) minmax(110px,1fr) 34px}.ob-empty{font-size:12.5px}
.ob-total{display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding:14px 16px;border-radius:12px;background:var(--surface-2);border:1px solid var(--line);font-size:13px}.ob-total b{font-size:16px;color:var(--ink)}
.setup-hero{display:flex;align-items:center;gap:16px;padding:18px 20px;border-radius:16px;border:1px solid var(--brand-100);background:var(--brand-50);margin-bottom:20px}.setup-hero>div{flex:1}.setup-hero b{font-size:14.5px;color:var(--ink)}.setup-hero p{font-size:12.5px;color:var(--ink-2);margin-top:4px;line-height:1.55}
.setup-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(300px,1fr);gap:20px;align-items:start}.setup-side{display:flex;flex-direction:column;gap:20px}
.setup-bar{width:160px;height:8px;border-radius:8px;background:var(--surface-3);overflow:hidden}.setup-bar i{display:block;height:100%;background:var(--brand);border-radius:8px;transition:width .4s}
.setup-steps ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}.setup-steps li{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--line-2)}.setup-steps li:last-child{border-bottom:0}
.st-no{width:28px;height:28px;flex:0 0 28px;border-radius:50%;display:grid;place-items:center;border:1.5px solid var(--line);font-size:12px;font-weight:650;color:var(--ink-3)}
.setup-steps li.done .st-no{background:var(--brand);border-color:var(--brand);color:#fff}
.st-icon{width:36px;height:36px;flex:0 0 36px;border-radius:10px;display:grid;place-items:center;background:var(--surface-2);color:var(--ink-2)}
.st-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.st-text b{font-size:13.5px;font-weight:600;color:var(--ink)}.st-text small{font-size:12px;color:var(--ink-3);line-height:1.45}
.setup-steps li.done .st-text b{color:var(--ink-3);text-decoration:line-through;text-decoration-color:var(--ink-4)}.st-acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.tool-list{display:flex;flex-direction:column;gap:8px}.tool-list button{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);text-align:left;cursor:pointer;color:var(--ink-3)}
.tool-list button:hover{border-color:var(--brand);background:var(--brand-50)}.tool-list button>span:nth-child(2){flex:1;display:flex;flex-direction:column;gap:2px}.tool-list b{font-size:13px;color:var(--ink);font-weight:600}.tool-list small{font-size:11.5px;color:var(--ink-3)}
.small-note{font-size:12px;line-height:1.55;margin-bottom:14px}
.import-preview td.mono{white-space:nowrap}
/* Readability and list polish */
.mz .tbl td{font-size:12.5px;padding-top:13px;padding-bottom:13px}.mz .tbl th{font-size:10.5px}
.mz .nav-item{font-size:12.5px}.mz .inp{font-size:13px}.mz .fld .lb{font-size:11.5px}.mz .btn{font-size:12.5px}.mz .page-head p{font-size:12.5px;line-height:1.55}
.nowrap{white-space:nowrap}.ref-cell{max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.late-note{display:block;width:max-content;margin-top:5px;font-size:10.5px;font-weight:600;color:var(--neg);background:var(--neg-50);padding:2px 8px;border-radius:999px}
.show-more{text-align:center;padding:16px!important;background:var(--surface-2)}
.doc-list-tbl td,.doc-list-tbl th{padding-left:12px;padding-right:12px}
@media (max-width:1500px){.hide-narrow{display:none}}
.acct-ref{font-family:var(--sans);display:flex;flex-direction:column;align-items:flex-end;gap:1px;text-align:right;font-size:11px;color:var(--ink-3);max-width:64%;line-height:1.35}
.acct-ref b{font-family:var(--mono);font-size:12px;color:var(--ink);font-weight:600}
@media (max-width:1100px){.setup-grid{grid-template-columns:1fr}}
@media (max-width:760px){.sample-banner{flex-wrap:wrap}.sample-banner .sb-acts{width:100%;justify-content:flex-end}.import-steps{grid-template-columns:1fr}
  .ob-row,.ob-row.stock{grid-template-columns:1fr 1fr}.ob-row>.smart-picker{grid-column:1/-1}.setup-steps li{flex-wrap:wrap}.st-acts{width:100%;justify-content:flex-start;padding-left:42px}.setup-progress{flex-wrap:wrap}.setup-hero{flex-direction:column;align-items:flex-start}
  .studio-modal .ob-head{flex-wrap:wrap}.ob-head small{flex-basis:100%;margin-left:24px!important}}
`;
