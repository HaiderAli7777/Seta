/* ============================================================================
   3.18 — Several companies, several branches.
   · Companies: each company keeps its own books, profile, VAT settings, users
     and cloud link in this browser. The menu's company card switches between
     them; "Add a company" sets one up in a minute and can copy the chart of
     accounts, users, products, customers and price lists from the current one.
     The first company keeps the original storage keys, so nothing moves.
   · Branches: a company can have branches (Head office, Deira shop, Abu Dhabi
     warehouse…). Every invoice, bill, payment, expense, journal, transfer, stock
     count and cheque belongs to one; anything recorded before branches existed
     belongs to the default branch. Users have a home branch, which new records
     take automatically.
   · Reporting: every ledger entry carries its branch, so each financial report
     can be run for one branch or all of them; "Branch performance" compares the
     branches side by side and the "Group report" puts the companies together.
   · 3.19: a guided branch set-up, richer branch details, document numbers per
     branch (INV/DRA/2026/0001), a working branch you can switch, users who see
     only their own branch, a Companies screen with every company's figures,
     a colour for each company, and editing or backing up any company.
   ========================================================================== */

/* ------------------------------------------------------------ companies */
/* Function declarations, so the storage keys can be worked out while the rest of the app is still loading. */
function activeCompanyId() {
  try { const v = window.localStorage.getItem("mizan.activeCompany"); return v && /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : "main"; } catch (e) { return "main"; }
}
function coKey(base, id) { const c = id || activeCompanyId(); return c === "main" ? base : base + "@" + c; }
function readJSONKey(k) { try { const v = window.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function companyList() {
  let list = readJSONKey("mizan.companies");
  if (!Array.isArray(list)) list = [];
  if (!list.some((c) => c.id === "main")) { const p = readJSONKey("mizan.company"); list.unshift({ id: "main", name: (p && p.name) || "My Company", trn: (p && p.trn) || "" }); }
  return list;
}
function saveCompanyList(list) { try { window.localStorage.setItem("mizan.companies", JSON.stringify(list)); return true; } catch (e) { return false; } }
/* Keep the list's name and TRN in step with the open company's profile. */
function touchCompany(profile, extra) {
  const id = activeCompanyId(), list = companyList();
  const i = list.findIndex((c) => c.id === id), rec = { id, name: profile.name || "Company", trn: profile.trn || "", emirate: profile.emirate || "", logo: profile.logo ? 1 : 0, ...(extra || {}) };
  if (i >= 0 && Object.keys(rec).every((k) => list[i][k] === rec[k])) return;
  if (i >= 0) list[i] = { ...list[i], ...rec }; else list.push(rec);
  saveCompanyList(list);
}
/* Each company has its own colour theme, so it is always clear whose books are open. */
function companyAccent(c) {
  const a = (c && c.accent) || readStr(coKey(ACCENT_KEY, c && c.id));
  return ACCENTS[a] ? a : "ocean";
}
/* The colour that marks a company in lists: the theme's accent (graphite's blue is too close to ocean's, so it is slate). */
const accentTag = (k) => (k === "graphite" ? "#4B5563" : (ACCENTS[k] || ACCENTS.ocean).c1);
const coColor = (c) => accentTag(companyAccent(c));
function readStr(k) { try { return window.localStorage.getItem(k) || ""; } catch (e) { return ""; } }
function setCompanyAccent(id, accent) {
  try { window.localStorage.setItem(coKey(ACCENT_KEY, id), accent); } catch (e) { return; }
  saveCompanyList(companyList().map((c) => (c.id === id ? { ...c, accent } : c)));
}
/* Another company's profile can be edited without opening it. */
function saveCompanyProfile(id, profile) {
  try { window.localStorage.setItem(coKey("mizan.company", id), JSON.stringify(profile)); } catch (e) { return false; }
  saveCompanyList(companyList().map((c) => (c.id === id ? { ...c, name: profile.name || c.name, trn: profile.trn || "", emirate: profile.emirate || "", logo: profile.logo ? 1 : 0 } : c)));
  return true;
}
function backupCompany(id, name) {
  const raw = readStr(coKey("mizan.books.v2", id));
  if (!raw) return false;
  saveText(raw, `invoeez-books-${(name || id).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}-${TODAY}.json`, "application/json");
  return true;
}
function switchCompany(id) {
  try { window.localStorage.setItem("mizan.activeCompany", id); } catch (e) { return; }
  window.setTimeout(() => window.location.reload(), 60);
}
/* A new company: its books and profile are written under its own keys, then the app reopens on it. */
function createCompany(books, profile, accent) {
  const id = "co" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  try {
    window.localStorage.setItem(coKey("mizan.books.v2", id), JSON.stringify(books));
    window.localStorage.setItem(coKey("mizan.company", id), JSON.stringify(profile));
    if (accent) window.localStorage.setItem(coKey(ACCENT_KEY, id), accent);
  } catch (e) {
    try { window.localStorage.removeItem(coKey("mizan.books.v2", id)); window.localStorage.removeItem(coKey("mizan.company", id)); } catch (x) {}
    return { error: "This browser has no room left for another company. Back up and remove one you no longer need, or use cloud sync." };
  }
  saveCompanyList([...companyList(), { id, name: profile.name, trn: profile.trn || "", emirate: profile.emirate || "", ...(accent ? { accent } : {}) }]);
  switchCompany(id);
  return { id };
}
function removeCompany(id) {
  /* The open company, and the first one (whose books use the original storage keys), stay. */
  if (id === activeCompanyId() || id === "main") return false;
  ["mizan.books.v2", "mizan.company", "mizan.fta", "mizan.cloud", "mizan.cloud.conflicts", "mizan.cloud.log", ACCENT_KEY].forEach((k) => { try { window.localStorage.removeItem(coKey(k, id)); } catch (e) {} });
  saveCompanyList(companyList().filter((c) => c.id !== id));
  return true;
}
/* Another company's books and profile, for the group report. */
function readCompany(id) {
  const raw = readJSONKey(coKey("mizan.books.v2", id)), prof = readJSONKey(coKey("mizan.company", id));
  const books = raw && Array.isArray(raw.docs) && !raw.sample ? migrateBooks(raw) : null;
  return { id, books, profile: { ...COMPANY, ...(prof || {}) } };
}

/* ------------------------------------------------------------- branches */
let BRANCHES = [], ME_BRANCH = "", REPORT_BRANCH = "", REPORT_BRANCH_ID = "", REPORT_SET_BRANCH = () => {};
const BR = {};
/* var, not let: document numbers can be worked out while the sample books are being built, before this file has run. */
var BRANCH_SERIES = false, BRANCH_DEF = "", LOCK_BRANCH = "";
function syncBranches(list, cfg) {
  BRANCHES = (list || []).filter((b) => b && b.id);
  Object.keys(BR).forEach((k) => delete BR[k]);
  BRANCHES.forEach((b) => (BR[b.id] = b));
  BRANCH_SERIES = !!(cfg && cfg.series); BRANCH_DEF = (cfg && cfg.def) || "";
}
const branchCfg = (s) => ({ series: !!(s && s.branchSeries), def: (s && s.defaultBranch) || "" });

/* Numbering. One series for the company (INV/2026/0001), or, with numbering per branch, a series for each branch
   (INV/DRA/2026/0001). The default branch keeps the company's series, so its numbering simply carries on. */
function branchSeries(branch) { return BRANCH_SERIES && branch && branch !== BRANCH_DEF && BR[branch] && BR[branch].code ? BR[branch].code : ""; }
const seriesOf = (num) => { const p = String(num || "").split("/"); return p.length >= 4 ? p[1] : ""; };
function seriesNext(list, prefix, branch) {
  const code = branchSeries(branch);
  const n = list.filter((x) => seriesOf(x.number) === code).reduce((m, x) => Math.max(m, +String(x.number || "").split("/").pop() || 0), 0);
  return `${prefix}/${code ? code + "/" : ""}${TODAY.slice(0, 4)}/${String(n + 1).padStart(4, "0")}`;
}
const cleanCode = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
/* "Deira shop" → DEI, "Abu Dhabi branch" → ADH, "Jebel Ali free zone" → JAF: words like shop or branch are left out. */
const GENERIC_WORDS = ["SHOP", "BRANCH", "OFFICE", "STORE", "WAREHOUSE", "OUTLET", "SHOWROOM", "THE", "LLC", "BR", "MAIN"];
const suggestCode = (name, taken) => {
  const all = String(name || "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const words = all.filter((w) => !GENERIC_WORDS.includes(w)).length ? all.filter((w) => !GENERIC_WORDS.includes(w)) : all;
  let base = words.length > 1 ? words.slice(0, 3).map((w) => w[0]).join("") : (words[0] || "BR").slice(0, 3);
  if (base.length === 2) base += words[words.length - 1][1] || "X";
  let code = base, i = 2;
  while (taken.includes(code)) code = base.slice(0, 2) + i++;
  return code;
};

/* The working branch: where this person's new records go today. It lasts for this browser tab. */
const workKey = () => coKey("mizan.workBranch");
function readWorkBranch(userId) { try { const v = JSON.parse(window.sessionStorage.getItem(workKey()) || "null"); return v && v.u === userId ? v.b : ""; } catch (e) { return ""; } }
function saveWorkBranch(userId, b) { try { if (b) window.sessionStorage.setItem(workKey(), JSON.stringify({ u: userId, b })); else window.sessionStorage.removeItem(workKey()); } catch (e) {} }
const branchOn = () => BRANCHES.length > 1;
function defaultBranchId(state) {
  const l = (state && state.branches) || [];
  const d = l.find((b) => b.id === state.defaultBranch) || l.find((b) => b.active !== false) || l[0];
  return d ? d.id : "";
}
/* New records go to the signed-in user's home branch, else the default branch. */
function homeBranch(state) { return ME_BRANCH && BR[ME_BRANCH] && BR[ME_BRANCH].active !== false ? ME_BRANCH : defaultBranchId(state); }
const branchName = (id) => (BR[id] ? BR[id].name : "");
/* A payment against a document sits in that document's branch. */
function branchOfPayment(state, p) { const d = p.doc && state.docs.find((x) => x.id === p.doc); return d ? branchOfRecord(state, d) : branchOfRecord(state, p); }
/* Screens that look across branches, closed to someone who works in one branch only. */
const BRANCH_WIDE = ["r_branch", "r_group", "branches", "companies"];
function branchOfRecord(state, rec) { return (rec && rec.branch && BR[rec.branch] ? rec.branch : "") || defaultBranchId(state); }

/* Ledger entries carry their branch; reports filter on it. A balanced entry always sits in one branch, so a branch's books balance too. */
function tagBranches(state, entries) {
  const DEF = defaultBranchId(state);
  if (!DEF) return;
  const ok = (b) => (b && (state.branches || []).some((x) => x.id === b) ? b : DEF);
  const bd = new Map((state.docs || []).map((x) => [x.id, ok(x.branch)]));
  /* A payment or cheque against a document sits in that document's branch, so each branch's receivables and payables clear. */
  const follow = (list) => new Map((list || []).map((x) => [x.id, x.doc && bd.has(x.doc) ? bd.get(x.doc) : x.branch]));
  const bp = follow(state.payments), bc = follow(state.pdcs), bo = new Map((state.stockOps || []).map((x) => [x.id, x.branch]));
  entries.forEach((e) => {
    e.branch = ok(e.docId ? bd.get(e.docId) : e.payId ? bp.get(e.payId) : e.stockOpId ? bo.get(e.stockOpId) : e.pdcId ? bc.get(e.pdcId) : e.branch);
  });
}
function branchBooks(books, b) {
  if (!b) return books;
  const entries = books.entries.filter((e) => e.branch === b), flat = books.flat.filter((l) => l.branch === b);
  const totalD = R2(flat.reduce((s, l) => s + l.debit, 0)), totalC = R2(flat.reduce((s, l) => s + l.credit, 0));
  return { ...books, entries, flat, totalD, totalC, balanced: Math.abs(totalD - totalC) < 0.01, branch: b };
}
/* Transactions of one branch. A payment against a document follows that document, so what a customer owes a branch is right. */
function branchState(state, b) {
  if (!b) return state;
  const DEF = defaultBranchId(state), of = (x) => (x.branch && (state.branches || []).some((y) => y.id === x.branch) ? x.branch : DEF);
  const docB = new Map(state.docs.map((d) => [d.id, of(d)]));
  const mine = (x) => of(x) === b;
  return { ...state, docs: state.docs.filter(mine), manual: state.manual.filter(mine), stockOps: (state.stockOps || []).filter(mine),
    payments: state.payments.filter((p) => (p.doc && docB.has(p.doc) ? docB.get(p.doc) : of(p)) === b),
    pdcs: (state.pdcs || []).filter((c) => (c.doc && docB.has(c.doc) ? docB.get(c.doc) : of(c)) === b) };
}

/* ------------------------------------------------------------- controls */
function BranchField({ value, onChange, disabled, label = "Branch", span, free }) {
  if (!branchOn()) return null;
  /* Someone who works in one branch only records there. */
  const lock = !free && LOCK_BRANCH && BR[LOCK_BRANCH] && (!value || value === LOCK_BRANCH);
  const v = lock ? LOCK_BRANCH : value;
  return <Field label={label} span={span}><Select value={v || ""} disabled={disabled || lock} aria-label={label} onChange={(e) => onChange(e.target.value)}>
    {BRANCHES.filter((b) => b.active !== false || b.id === v).map((b) => <option key={b.id} value={b.id}>{b.name + (b.code ? " · " + b.code : "")}</option>)}
  </Select></Field>;
}
function BranchPick({ value, onChange, dark }) {
  if (!branchOn()) return null;
  if (LOCK_BRANCH && BR[LOCK_BRANCH]) return <div className={cx("br-pick locked", dark && "dark")} title="You see your own branch only"><Lock size={13} /><span>{BR[LOCK_BRANCH].name}</span></div>;
  return <div className={cx("br-pick", dark && "dark")}><Store size={14} />
    <Select value={value || ""} aria-label="Branch" onChange={(e) => onChange(e.target.value)}>
      <option value="">All branches</option>
      {BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
    </Select></div>;
}

/* --------------------------------------------------- company switcher */
/* The menu's company card opens this: every company with its colour, the working branch, and Add / Manage. */
function CompanySwitcher({ company, accent, close, add, manage, at, work, setWork, home }) {
  const all = companyList(), active = activeCompanyId();
  const [q, setQ] = useState("");
  const list = all.filter((c) => !q || hits(q, c.id === active ? company.name : c.name, c.trn, c.emirate));
  const brs = branchOn() && !LOCK_BRANCH ? BRANCHES.filter((b) => b.active !== false) : [];
  const logoOf = (c, on) => (on ? company.logo : c.logo ? (readJSONKey(coKey("mizan.company", c.id)) || {}).logo : "");
  return <><div className="pop-scrim" onMouseDown={close} />
    <div className="co-pop" role="dialog" aria-label="Companies" style={at}>
      <header><b>Companies</b><small>Each company has its own books, users and VAT settings</small></header>
      {all.length > 4 && <label className="co-search"><Search size={14} /><input autoFocus placeholder="Find a company" aria-label="Find a company" value={q} onChange={(e) => setQ(e.target.value)} /></label>}
      <div className="co-list">{list.map((c) => {
        const on = c.id === active, nm = on ? company.name : c.name, trn = on ? company.trn : c.trn, logo = logoOf(c, on);
        return <button key={c.id} className={cx("co-row", on && "on")} onClick={() => { if (!on) switchCompany(c.id); else close(); }}>
          {logo ? <img className="co-av img" src={logo} alt="" /> : <span className="co-av" style={{ "--co": on ? accentTag(accent) : coColor(c) }}>{initials(nm)}</span>}
          <span className="co-t"><b>{nm}</b><small>{trn ? "TRN " + trn : "Not VAT registered"}{c.emirate ? " · " + c.emirate : ""}{c.branches > 1 ? ` · ${c.branches} branches` : ""}</small></span>
          {on ? <Pill tone="ok">Open</Pill> : <ArrowRight size={15} />}</button>; })}
        {!list.length && <div className="co-none">No company matches “{q}”</div>}</div>
      {brs.length > 1 && <div className="co-work">
        <div className="co-work-h"><MapPin size={13} /><b>Working in</b><small>New records go to this branch</small></div>
        <div className="co-work-list" role="radiogroup" aria-label="Working branch">{brs.map((b) => <button key={b.id} role="radio" aria-checked={work === b.id}
          className={cx("co-wb", work === b.id && "on")} onClick={() => setWork(b.id)}>{work === b.id && <Check size={12} />}{b.name}{b.id === home && <em>home</em>}</button>)}</div></div>}
      <footer><Btn size="sm" kind="pri" icon={Plus} onClick={add}>Add a company</Btn><button className="linkish" onClick={manage}>Manage companies</button></footer>
    </div></>;
}

/* Settings › Companies: the short version; the Companies screen has the rest. */
function CompaniesCard({ company, onAdd, toast, backup, go }) {
  const [list, setList] = useState(companyList);
  const active = activeCompanyId();
  const drop = (c) => {
    if (!window.confirm(`Remove ${c.name} and all its books from this browser? Download its backup first if you might need it — this cannot be undone here.`)) return;
    if (removeCompany(c.id)) { setList(companyList()); toast(`${c.name} removed from this browser`, "warn"); }
  };
  return <Card title="Companies" sub="Run several companies from one InvoEez — each with its own books, users, TRN and VAT return" pad={false}
    right={go && <Btn size="sm" icon={Building2} onClick={() => go("companies")}>All companies</Btn>}>
    <div className="setsec" id="companies">
      {list.map((c) => { const on = c.id === active; return <div key={c.id} className="setrow co-setrow">
        <span className="co-av" style={{ "--co": coColor(c) }}>{initials(on ? company.name : c.name)}</span>
        <div className="st"><b>{on ? company.name : c.name}{on && <> <Pill tone="ok">Open now</Pill></>}</b><span>{(on ? company.trn : c.trn) ? "TRN " + (on ? company.trn : c.trn) : "Not VAT registered"}{c.emirate ? " · " + c.emirate : ""}</span></div>
        {on ? <Btn size="sm" icon={Download} onClick={backup}>Back up</Btn> : <><Btn size="sm" icon={ArrowRight} onClick={() => switchCompany(c.id)}>Open</Btn>
          {c.id !== "main" && <button className="icon-btn" title={`Remove ${c.name}`} aria-label={`Remove ${c.name}`} onClick={() => drop(c)}><Trash2 size={14} /></button>}</>}
      </div>; })}
      <div className="co-add"><Btn kind="pri" icon={Plus} onClick={onAdd}>Add a company</Btn>
        <span>Takes a minute: name, TRN and address, then choose what to copy from {company.name} — chart of accounts, users, products, customers.</span></div>
    </div>
  </Card>;
}

/* --------------------------------------------------------- companies screen */
const COMPANY_FIELDS = [["name", "Registered company name", 2], ["nameAr", "Company name in Arabic", 2, "rtl"], ["trn", "Tax Registration Number (TRN)"], ["licence", "Trade licence"],
  ["address", "Address line 1"], ["address2", "Address line 2"], ["city", "City and country"], ["emirate", "Emirate"], ["phone", "Telephone"], ["email", "Accounts email"]];
/* Edit any company's details — the open one or another — without switching to it. */
function CompanyEditDialog({ initial, title, close, onSave }) {
  const [f, setF] = useState({ ...initial });
  const [err, setErr] = useState("");
  const save = () => {
    if ((f.name || "").trim().length < 2) return setErr("Enter the company's registered name.");
    const trn = String(f.trn || "").replace(/\s/g, "");
    if (trn && !/^\d{15}$/.test(trn)) return setErr("A UAE TRN has exactly 15 digits — or leave it blank.");
    onSave({ ...f, name: f.name.trim(), trn });
  };
  return <StudioModal wide title={title} sub="Printed on its tax invoices, statements and reports" close={close}>
    <div className="studio-form">{COMPANY_FIELDS.map(([k, l, span, dir]) => k === "emirate"
      ? <Field key={k} label={l}><Select value={f.emirate || "Dubai"} onChange={(e) => setF({ ...f, emirate: e.target.value })}>{EMIRATES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
      : <Field key={k} label={l} span={span}><Input value={f[k] || ""} dir={dir} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>)}</div>
    {err && <div role="alert" className="form-error">{err}</div>}
    <footer className="modal-actions"><Btn onClick={close}>Cancel</Btn><Btn kind="pri" icon={Check} onClick={save}>Save details</Btn></footer>
  </StudioModal>;
}

/* One company's headline: figures this year, size, and what is left to set up. */
function companySnapshot(c, ctx) {
  const on = c.id === ctx.active, yr = TODAY.slice(0, 4) + "-01-01";
  const x = on ? { books: ctx.state, profile: ctx.company } : readCompany(c.id);
  const p = { ...x.profile, name: on ? ctx.company.name : x.profile.name || c.name };
  const base = { c, on, p, accent: on ? ctx.accent : companyAccent(c) };
  if (!x.books) return { ...base, missing: true };
  const b = x.books;
  const figs = on ? companyFigures(ctx.books, yr, TODAY) : withCompanyMasters(b, ctx.state, () => companyFigures(deriveBooks(b), yr, TODAY));
  const last = b.docs.reduce((m, d) => (d.date > m ? d.date : m), "");
  const setup = [["Details and TRN", !!(p.trn && p.address)], ["Logo", !!p.logo], ["Branches", (b.branches || []).length > 1], ["Team", (b.users || []).length > 1],
    ["First invoice", b.docs.some((d) => d.type === "invoice")]];
  return { ...base, figs, docs: b.docs.length, branches: (b.branches || []).length, users: (b.users || []).filter((u) => u.active !== false).length, last, setup };
}

function CompaniesScreen({ state, books, company, setCompany, accent, setAccent, toast, onAdd, backup, go }) {
  const [tick, setTick] = useState(0), [edit, setEdit] = useState(null);
  const active = activeCompanyId();
  const snaps = useMemo(() => companyList().map((c) => companySnapshot(c, { active, state, books, company, accent })), [state, books, company, accent, tick]);
  const live = snaps.filter((x) => !x.missing);
  const sum = (f) => R2(live.reduce((s, x) => s + f(x), 0));
  const paint = (x, a) => { if (x.on) setAccent(a); else setCompanyAccent(x.c.id, a); setTick((t) => t + 1); toast(`${x.p.name} is now ${ACCENTS[a].name}`); };
  const drop = (x) => {
    if (!window.confirm(`Remove ${x.p.name} and all its books from this browser? Download its backup first if you might need it — this cannot be undone here.`)) return;
    if (removeCompany(x.c.id)) { setTick((t) => t + 1); toast(`${x.p.name} removed from this browser`, "warn"); }
  };
  const saveDetails = (x, prof) => {
    if (x.on) setCompany({ ...company, ...prof });
    else saveCompanyProfile(x.c.id, { ...x.p, ...prof });
    setEdit(null); setTick((t) => t + 1); toast(`${prof.name} details saved`);
  };
  return <div>
    <PageHead eyebrow="Administration" title="Companies" sub={`${snaps.length} compan${snaps.length === 1 ? "y" : "ies"} in this InvoEez — each with its own books, users, TRN and VAT return`}>
      <Btn kind="pri" icon={Plus} onClick={onAdd}>Add a company</Btn>
    </PageHead>
    {snaps.length > 1 && <div className="cs-sum">
      {[["Companies", String(snaps.length), Building2], ["Group sales this year", money(sum((x) => x.figs.r.revenue), false), BarChart3], ["Group net profit", money(sum((x) => x.figs.r.net), false), Store],
        ["Cash and bank", money(sum((x) => x.figs.cash), false), Banknote]].map(([l, v, Ic]) => <div key={l} className="cs-tile"><span><Ic size={16} /></span><small>{l}</small><b>{v}</b></div>)}
      <button className="cs-tile link" onClick={() => go("r_group")}><span><ArrowRight size={16} /></span><small>Side by side</small><b>Group report</b></button>
    </div>}
    <div className="cs-grid">{snaps.map((x) => {
      const col = accentTag(x.accent), done = x.setup ? x.setup.filter((s) => s[1]).length : 0;
      return <div key={x.c.id} className={cx("card cs-card", x.on && "on")} style={{ "--co": col }} data-company={x.c.id}>
        <div className="cs-band" />
        <div className="cs-top">
          {x.p.logo ? <img className="cs-logo" src={x.p.logo} alt="" /> : <span className="cs-av">{initials(x.p.name)}</span>}
          <div className="cs-t"><b>{x.p.name}</b>{x.p.nameAr && <span className="ar" dir="rtl" lang="ar">{x.p.nameAr}</span>}
            <small>{x.p.trn ? "TRN " + x.p.trn : "Not VAT registered"}{x.p.emirate ? " · " + x.p.emirate : ""}</small></div>
          {x.on ? <Pill tone="ok">Open now</Pill> : null}
        </div>
        {x.missing ? <div className="cs-missing">Still the sample, or never opened — open it to set it up.</div> : <>
          <div className="cs-figs">
            <div><small>Sales this year</small><b>{money(x.figs.r.revenue, false)}</b></div>
            <div><small>Net profit</small><b className={x.figs.r.net < 0 ? "neg" : ""}>{money(x.figs.r.net, false)}</b></div>
            <div><small>Cash and bank</small><b>{money(x.figs.cash, false)}</b></div>
            <div><small>Customers owe</small><b>{money(x.figs.recv, false)}</b></div>
          </div>
          <div className="cs-meta"><span><Store size={13} />{x.branches > 1 ? `${x.branches} branches` : "No branches"}</span><span><Users size={13} />{x.users} user{x.users === 1 ? "" : "s"}</span>
            <span><FileText size={13} />{x.docs} documents</span>{x.last && <span>Last entry {dmy(x.last)}</span>}</div>
          <div className="cs-setup" title={x.setup.map(([t, ok]) => (ok ? "✓ " : "○ ") + t).join("\n")}>
            <div className="cs-bar"><i style={{ width: (done / x.setup.length) * 100 + "%" }} /></div>
            <span>{done === x.setup.length ? "Fully set up" : `Set up ${done} of ${x.setup.length} · next: ${((t) => t[0].toLowerCase() + t.slice(1))(x.setup.find((s) => !s[1])[0])}`}</span>
          </div></>}
        <div className="cs-acts">
          {x.on ? <Btn size="sm" icon={Store} onClick={() => go("branches")}>Branches</Btn> : <Btn size="sm" kind="pri" icon={ArrowRight} onClick={() => switchCompany(x.c.id)}>Open</Btn>}
          <Btn size="sm" icon={Pencil} onClick={() => setEdit(x)}>Edit details</Btn>
          <Btn size="sm" icon={Download} onClick={() => (x.on ? backup() : backupCompany(x.c.id, x.p.name) ? toast(`${x.p.name} backup downloaded`) : toast("Nothing to back up yet", "warn"))}>Back up</Btn>
          <span className="cs-swatches" role="radiogroup" aria-label={`Colour for ${x.p.name}`}>{Object.entries(ACCENTS).map(([k, a]) => <button key={k} role="radio" aria-checked={x.accent === k}
            className={cx("cs-sw", x.accent === k && "on")} style={{ background: `linear-gradient(135deg,${a.sw[0]} 45%,${accentTag(k)} 46%)` }} title={a.name} aria-label={a.name} onClick={() => paint(x, k)} />)}</span>
          {!x.on && x.c.id !== "main" && <button className="icon-btn" title={`Remove ${x.p.name}`} aria-label={`Remove ${x.p.name}`} onClick={() => drop(x)}><Trash2 size={14} /></button>}
        </div>
      </div>; })}
      <button className="cs-card add" onClick={onAdd}><span className="cs-add-ic"><Plus size={22} /></span><b>Add a company</b>
        <small>Name, TRN and address, then choose what to copy from {company.name}: chart of accounts, users, products, customers, price lists.</small></button>
    </div>
    {edit && <CompanyEditDialog title={`Edit ${edit.p.name}`} initial={edit.p} close={() => setEdit(null)} onSave={(prof) => saveDetails(edit, prof)} />}
  </div>;
}

/* --------------------------------------------------------- branches screen */
const blankOwnBranch = (state, company) => ({ id: uid("bra"), name: "", nameAr: "", code: "", address: "", address2: "", addressAr: "", emirate: company.emirate || "Dubai",
  phone: "", email: "", licence: "", manager: "", active: true });

/* The first time: three short steps — head office, the other branches, then people and numbering. */
function BranchWizard({ state, setState, company, users, close, toast }) {
  const [step, setStep] = useState(1);
  const [ho, setHo] = useState(() => ({ ...blankOwnBranch(state, company), name: "Head office", code: "HO", address: company.address || "", address2: company.address2 || "",
    phone: company.phone || "", email: company.email || "", licence: company.licence || "" }));
  const [rows, setRows] = useState(() => [blankOwnBranch(state, company)]);
  const [series, setSeries] = useState(false);
  const people = (users || []).filter((u) => u.active !== false);
  const [who, setWho] = useState(() => Object.fromEntries(people.map((u) => [u.id, { branch: "", only: false }])));
  const [err, setErr] = useState("");
  const named = rows.filter((r) => r.name.trim());
  const all = [ho, ...named];
  const codes = all.map((b, i) => cleanCode(b.code) || suggestCode(b.name, all.slice(0, i).map((x) => cleanCode(x.code))));
  const next1 = () => { if (ho.name.trim().length < 2) return setErr("Give the head office a name."); setErr(""); setStep(2); };
  const next2 = () => {
    const names = all.map((b) => b.name.trim().toLowerCase());
    if (named.some((b) => b.name.trim().length < 2)) return setErr("Each branch needs a name of at least two letters.");
    if (new Set(names).size !== names.length) return setErr("Two branches have the same name.");
    if (new Set(codes).size !== codes.length) return setErr("Two branches have the same short code.");
    setErr(""); setStep(3);
  };
  const finish = () => {
    const recs = all.map((b, i) => ({ ...b, name: b.name.trim(), code: codes[i] }));
    const homeOf = (u) => (who[u.id] && who[u.id].branch) || recs[0].id;
    setState((s) => ({ ...s, branches: recs, defaultBranch: recs[0].id, branchSeries: series,
      users: (s.users || []).map((u) => (who[u.id] ? { ...u, branch: homeOf(u), ...(who[u.id].only && u.role !== "admin" ? { branchOnly: true } : {}) } : u)) }));
    toast(`${recs.length} branches set up — everything recorded so far belongs to ${recs[0].name}`);
    close();
  };
  const setRow = (i, k, v) => setRows((l) => l.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const year = TODAY.slice(0, 4), nextPlain = nextNumber(state.docs, "invoice", "");
  return <StudioModal wide title="Set up branches" sub={["Step 1 of 3 · Head office", "Step 2 of 3 · Your other branches", "Step 3 of 3 · People and numbering"][step - 1]} close={close}>
    <div className="steps-dots"><i className="on" /><i className={step >= 2 ? "on" : ""} /><i className={step === 3 ? "on" : ""} /></div>
    {step === 1 && <>
      <div className="info-strip"><Building2 size={20} /><span><b>{company.name} becomes the head office.</b><br />Every invoice, bill and payment recorded so far belongs to it. Check the details it prints on its documents.</span></div>
      <div className="studio-form">
        <Field label="Branch name"><Input value={ho.name} onChange={(e) => setHo({ ...ho, name: e.target.value })} /></Field>
        <Field label="Short code"><Input value={ho.code} maxLength={6} onChange={(e) => setHo({ ...ho, code: cleanCode(e.target.value) })} /></Field>
        <Field label="Address line 1"><Input value={ho.address} placeholder="Building, street" onChange={(e) => setHo({ ...ho, address: e.target.value })} /></Field>
        <Field label="Address line 2"><Input value={ho.address2} placeholder="Area, P.O. Box" onChange={(e) => setHo({ ...ho, address2: e.target.value })} /></Field>
        <Field label="Emirate"><Select value={ho.emirate} onChange={(e) => setHo({ ...ho, emirate: e.target.value })}>{EMIRATES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Telephone"><Input value={ho.phone} onChange={(e) => setHo({ ...ho, phone: e.target.value })} /></Field>
      </div>
      {err && <div role="alert" className="form-error">{err}</div>}
      <footer className="modal-actions"><Btn onClick={close}>Cancel</Btn><Btn kind="pri" icon={ArrowRight} onClick={next1}>Next: your branches</Btn></footer></>}
    {step === 2 && <>
      <p className="bw-lead">Add every shop, warehouse or office you run. A short code (DRA, AUH…) is suggested from the name; it can appear in document numbers.</p>
      <div className="bw-rows">
        <div className="bw-row head"><span>Branch name</span><span>Code</span><span>Emirate</span><span>Address line 1</span><span /></div>
        <div className="bw-row ho"><span><Store size={14} />{ho.name}</span><span className="mono">{codes[0]}</span><span>{ho.emirate}</span><span>{ho.address || "—"}</span><span><Pill tone="ok">Default</Pill></span></div>
        {rows.map((r, i) => { const ci = named.indexOf(r) + 1; return <div className="bw-row" key={r.id}>
          <Input value={r.name} placeholder={["e.g. Deira shop", "e.g. Abu Dhabi branch", "e.g. Sharjah warehouse"][i % 3]} aria-label={`Branch ${i + 1} name`} autoFocus={i === rows.length - 1 && i > 0}
            onChange={(e) => setRow(i, "name", e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && r.name.trim()) setRows((l) => [...l, blankOwnBranch(state, company)]); }} />
          <Input value={r.code} maxLength={6} placeholder={ci ? codes[ci] : "Code"} aria-label={`Branch ${i + 1} code`} onChange={(e) => setRow(i, "code", cleanCode(e.target.value))} />
          <Select value={r.emirate} aria-label={`Branch ${i + 1} emirate`} onChange={(e) => setRow(i, "emirate", e.target.value)}>{EMIRATES.map((x) => <option key={x}>{x}</option>)}</Select>
          <Input value={r.address} placeholder="Building, street" aria-label={`Branch ${i + 1} address`} onChange={(e) => setRow(i, "address", e.target.value)} />
          <button className="icon-btn" title="Remove this row" aria-label="Remove this row" disabled={rows.length === 1} onClick={() => setRows((l) => l.filter((_, j) => j !== i))}><X size={14} /></button>
        </div>; })}
      </div>
      <button className="bw-add" onClick={() => setRows((l) => [...l, blankOwnBranch(state, company)])}><Plus size={14} />Add another branch</button>
      {err && <div role="alert" className="form-error">{err}</div>}
      <footer className="modal-actions"><Btn onClick={() => { setErr(""); setStep(1); }}>Back</Btn>
        <Btn kind="pri" icon={ArrowRight} onClick={next2}>{named.length ? `Next: people and numbering` : "Skip — only the head office for now"}</Btn></footer></>}
    {step === 3 && <>
      <div className="micro" style={{ marginBottom: 9 }}>Document numbers</div>
      <div className="picks bw-picks">
        <button className={cx("pick", !series && "on")} onClick={() => setSeries(false)}><b>One series for the company</b><span>Every branch continues the same numbers.</span>
          <code>{nextPlain}</code></button>
        <button className={cx("pick", series && "on")} onClick={() => setSeries(true)}><b>Each branch numbers its own</b><span>{all[0].name} carries on; the others start their own series.</span>
          <code>{all.length > 1 ? `INV/${codes[1]}/${year}/0001` : nextPlain}</code></button>
      </div>
      {people.length > 0 && <><div className="micro" style={{ margin: "18px 0 9px" }}>Where people work</div>
        <div className="bw-people">{people.map((u) => { const w = who[u.id] || { branch: "", only: false }, admin = u.role === "admin";
          return <div className="bw-person" key={u.id}>
            <span className="bw-av">{initials(u.name)}</span><span className="bw-pn"><b>{u.name}</b><small>{(ROLES[u.role] || ROLES.viewer).label}</small></span>
            <Select value={w.branch || all[0].id} aria-label={`Home branch for ${u.name}`} onChange={(e) => setWho({ ...who, [u.id]: { ...w, branch: e.target.value } })}>
              {all.map((b) => <option key={b.id} value={b.id}>{b.name.trim() || "Branch"}</option>)}</Select>
            <label className={cx("check-label bw-only", admin && "dis")} title={admin ? "Administrators always see every branch" : ""}>
              <input type="checkbox" disabled={admin} checked={!admin && w.only} onChange={(e) => setWho({ ...who, [u.id]: { ...w, only: e.target.checked } })} />Only this branch</label>
          </div>; })}</div></>}
      <footer className="modal-actions"><Btn onClick={() => setStep(2)}>Back</Btn><Btn kind="pri" icon={Check} onClick={finish}>{`Create ${all.length} branch${all.length === 1 ? "" : "es"}`}</Btn></footer></>}
  </StudioModal>;
}

function BranchesScreen({ state, setState, books, company, toast, go, users, create, work, setWork }) {
  const list = state.branches || [];
  const [ed, setEd] = useState(null), [wiz, setWiz] = useState(false);
  useCreate(create, () => (list.length ? setEd(blankOwnBranch(state, company)) : setWiz(true)));
  const def = defaultBranchId(state);
  const yr = TODAY.slice(0, 4) + "-01-01";
  const stats = useMemo(() => {
    const out = {};
    list.forEach((b) => { const bb = branchBooks(books, b.id); const r = pnl(bb.flat, yr, TODAY);
      out[b.id] = { revenue: r.revenue, net: r.net, docs: state.docs.filter((d) => d.state === "posted" && branchOfRecord(state, d) === b.id).length }; });
    return out;
  }, [books, list]);
  const save = () => {
    const rec = { ...ed, name: ed.name.trim(), code: cleanCode(ed.code) || suggestCode(ed.name, list.filter((x) => x.id !== ed.id).map((x) => x.code)) };
    setState((s) => { const l = s.branches || []; const exists = l.some((x) => x.id === rec.id);
      return { ...s, branches: exists ? l.map((x) => (x.id === rec.id ? rec : x)) : [...l, rec], defaultBranch: s.defaultBranch || (exists ? s.defaultBranch : rec.id) }; });
    toast(`${rec.name} saved`); setEd(null);
  };
  const toggle = (b) => {
    if (b.id === def && b.active !== false) return toast("The default branch cannot be switched off — make another branch the default first", "warn");
    setState((s) => ({ ...s, branches: s.branches.map((x) => (x.id === b.id ? { ...x, active: x.active === false } : x)) }));
  };
  const remove = (b) => {
    const used = state.docs.some((d) => d.branch === b.id) || state.payments.some((p) => p.branch === b.id) || state.manual.some((e) => e.branch === b.id) || b.id === def;
    if (used) return toast(`${b.name} has transactions${b.id === def ? " (and is the default)" : ""} — switch it off instead of removing it`, "warn");
    setState((s) => ({ ...s, branches: s.branches.filter((x) => x.id !== b.id) })); toast(`${b.name} removed`, "warn");
  };
  const valid = ed && ed.name.trim().length >= 2 && !list.some((x) => x.id !== ed.id && x.name.trim().toLowerCase() === ed.name.trim().toLowerCase())
    && !(cleanCode(ed.code) && list.some((x) => x.id !== ed.id && x.code === cleanCode(ed.code)));
  const people = (users || []).filter((u) => u.active !== false);
  const limited = people.filter((u) => u.branchOnly && u.role !== "admin").length;
  const series = !!state.branchSeries;
  const nextOf = (b) => nextNumber(state.docs, "invoice", b.id);
  const f = (k) => ({ value: ed[k] || "", onChange: (e) => setEd({ ...ed, [k]: k === "code" ? cleanCode(e.target.value) : e.target.value }) });
  return <div>
    <PageHead eyebrow="Administration" title="Branches" sub={list.length ? `${list.length} branch${list.length === 1 ? "" : "es"} — every transaction belongs to one, and every report can be run for one or all` : "Run shops, warehouses or offices as branches of this company, and report on each"}>
      {list.length > 0 && <Btn kind="pri" icon={Plus} onClick={() => setEd(blankOwnBranch(state, company))}>New branch</Btn>}
    </PageHead>
    {!list.length && !ed && <Card><div className="br-intro">
      <span className="br-intro-ic"><Store size={26} /></span>
      <div><h3>Set up branches in three short steps</h3>
        <ol><li><b>Head office</b> is made from your company details. Everything recorded so far belongs to it.</li>
          <li><b>Your other branches</b> — add them all on one screen: name, short code, emirate and address.</li>
          <li><b>People and numbering</b> — where each user works, who sees only their branch, and whether each branch numbers its own documents.</li></ol>
        <p>From then on, invoices, bills, payments, expenses and journals carry a branch (your users' branch by default), and every report has a branch filter. The VAT return stays one return for the whole company, as the FTA requires.</p>
        <Btn kind="pri" icon={Store} onClick={() => setWiz(true)}>Set up branches</Btn></div></div></Card>}
    {list.length > 0 && <div className="card br-settings">
      <div className="bs-col"><span className="bs-ic"><Hash size={16} /></span><div><b>Document numbers</b>
        <div className="seg bs-seg" role="radiogroup" aria-label="Document numbers">{[[false, "One series"], [true, "Per branch"]].map(([v, l]) => <button key={l} role="radio" aria-checked={series === v}
          className={series === v ? "on" : ""} onClick={() => { setState((s) => ({ ...s, branchSeries: v })); toast(v ? "Each branch now numbers its own documents" : "All branches share the company's numbers"); }}>{l}</button>)}</div>
        <small>{series ? `${(BR[def] || {}).name || "The default branch"} keeps the company's numbers; the others use their code, e.g. ${list.find((b) => b.id !== def && b.code) ? `INV/${list.find((b) => b.id !== def && b.code).code}/${TODAY.slice(0, 4)}/0001` : "INV/DRA/2026/0001"}` : "Every branch continues the same invoice, bill and receipt numbers"}</small></div></div>
      <div className="bs-col"><span className="bs-ic"><Star size={16} /></span><div><b>Default branch</b>
        <Select value={def} aria-label="Default branch" onChange={(e) => setState((s) => ({ ...s, defaultBranch: e.target.value }))}>{list.filter((b) => b.active !== false).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
        <small>Used for anything recorded before branches, and for users with no home branch</small></div></div>
      <div className="bs-col"><span className="bs-ic"><Users size={16} /></span><div><b>People</b>
        <span className="bs-big">{people.length} user{people.length === 1 ? "" : "s"}{limited ? ` · ${limited} see only their branch` : ""}</span>
        <button className="linkish" onClick={() => go("users")}>Set home branches in Users &amp; access</button></div></div>
    </div>}
    {ed && <Card title={list.some((x) => x.id === ed.id) ? `Edit ${ed.name || "branch"}` : "New branch"} sub="Printed on the documents it issues; the company's TRN applies to every branch" style={{ marginBottom: 16 }}
      right={<><Btn onClick={() => setEd(null)}>Cancel</Btn><Btn kind="pri" icon={Check} disabled={!valid} onClick={save}>Save branch</Btn></>}>
      <div className="setgrid br-form">
        <Field label="Branch name" span={2}><Input autoFocus placeholder="e.g. Deira shop" {...f("name")} /></Field>
        <Field label="Short code"><Input maxLength={6} placeholder={ed.name ? suggestCode(ed.name, list.filter((x) => x.id !== ed.id).map((x) => x.code)) : "e.g. DRA"} {...f("code")} /></Field>
        <Field label="Emirate"><Select value={ed.emirate} onChange={(e) => setEd({ ...ed, emirate: e.target.value })}>{EMIRATES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Address line 1"><Input placeholder="Building, street" {...f("address")} /></Field>
        <Field label="Address line 2"><Input placeholder="Area, P.O. Box" {...f("address2")} /></Field>
        <Field label="Telephone"><Input placeholder="+971 4 000 0000" {...f("phone")} /></Field>
        <Field label="Email"><Input placeholder="branch@yourcompany.ae" {...f("email")} /></Field>
        <Field label="Branch name in Arabic"><Input dir="rtl" lang="ar" placeholder="اسم الفرع" {...f("nameAr")} /></Field>
        <Field label="Address in Arabic"><Input dir="rtl" lang="ar" placeholder="العنوان" {...f("addressAr")} /></Field>
        <Field label="Branch trade licence"><Input placeholder="Optional" {...f("licence")} /></Field>
        <Field label="Branch manager"><Select value={ed.manager || ""} onChange={(e) => setEd({ ...ed, manager: e.target.value })}><option value="">Nobody chosen</option>
          {people.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
      </div>
      {ed.name.trim().length >= 2 && !valid && <div className="form-error">{list.some((x) => x.id !== ed.id && x.name.trim().toLowerCase() === ed.name.trim().toLowerCase()) ? "Another branch already has that name." : "Another branch already uses that code."}</div>}
    </Card>}
    {list.length > 0 && <div className="br-grid-cards">{list.map((b) => { const st = stats[b.id] || {}, here = people.filter((u) => (u.branch || def) === b.id), mgr = people.find((u) => u.id === b.manager);
      return <div key={b.id} className={cx("card br-own", b.active === false && "off", b.id === def && "def", work === b.id && "work")} data-branch={b.id}>
        <div className="bo-top"><span className="bo-ic"><Store size={18} /></span>
          <div className="bo-t"><b>{b.name}{b.code && <em>{b.code}</em>}</b><small>{[b.address, b.address2, b.emirate].filter(Boolean).join(", ") || "No address yet"}</small>
            {(b.phone || mgr) && <small className="bo-sub">{[b.phone, mgr && "Manager: " + mgr.name].filter(Boolean).join(" · ")}</small>}</div>
          <span className="bo-pills">{b.id === def && <Pill tone="ok">Default</Pill>}{b.active === false && <Pill>Switched off</Pill>}{work === b.id && <Pill tone="info">You work here</Pill>}</span></div>
        <div className="bo-stats"><div><small>Sales this year</small><b>{money(st.revenue || 0, false)}</b></div><div><small>Profit this year</small><b className={(st.net || 0) < 0 ? "neg" : ""}>{money(st.net || 0, false)}</b></div><div><small>Documents</small><b>{st.docs || 0}</b></div></div>
        <div className="bo-people">{here.length ? here.map((u) => <span key={u.id} title={u.name + (u.branchOnly && u.role !== "admin" ? " · sees only this branch" : "")} className={u.branchOnly && u.role !== "admin" ? "only" : ""}>{initials(u.name)}</span>) : <small>No users have this as their home branch</small>}
          <small className="bo-next" title="The next invoice number for this branch"><Hash size={11} />{nextOf(b)}</small></div>
        <div className="bo-acts">
          <Btn size="sm" icon={Pencil} onClick={() => setEd({ ...blankOwnBranch(state, company), ...b })}>Edit</Btn>
          {b.id !== def && b.active !== false && <Btn size="sm" icon={Star} onClick={() => setState((s) => ({ ...s, defaultBranch: b.id }))}>Make default</Btn>}
          {setWork && !LOCK_BRANCH && b.active !== false && work !== b.id && <Btn size="sm" icon={MapPin} onClick={() => setWork(b.id)}>Work here</Btn>}
          <Btn size="sm" onClick={() => toggle(b)}>{b.active === false ? "Switch on" : "Switch off"}</Btn>
          <span className="bo-icons"><button className="icon-btn" title="Branch performance report" aria-label={`Report for ${b.name}`} onClick={() => go("r_branch")}><BarChart3 size={14} /></button>
          <button className="icon-btn" title={`Remove ${b.name}`} aria-label={`Remove ${b.name}`} onClick={() => remove(b)}><Trash2 size={14} /></button></span>
        </div>
      </div>; })}</div>}
    {wiz && <BranchWizard state={state} setState={setState} company={company} users={users} close={() => setWiz(false)} toast={toast} />}
  </div>;
}

/* ------------------------------------------------------ branch performance */
function BranchPerformance({ state, books, p, setP, toast, go }) {
  const list = state.branches || [];
  const rows = useMemo(() => list.map((b) => {
    const bb = branchBooks(books, b.id), r = pnl(bb.flat, p.from, p.to), st = branchState(state, b.id);
    const inv = st.docs.filter((d) => d.state === "posted" && d.type === "invoice" && inRange(d.date, p.from, p.to));
    const ar = aging(st, "receivable", p.to);
    const cash = R2(st.payments.filter((x) => x.kind === "in" && inRange(x.date, p.from, p.to)).reduce((s, x) => s + x.amount, 0));
    return { b, r, invoices: inv.length, avg: inv.length ? R2(r.revenue / inv.length) : 0, ar: ar.grand, cash, balanced: bb.balanced };
  }), [state, books, p.from, p.to]);
  const all = pnl(books.flat, p.from, p.to);
  const sum = (f) => R2(rows.reduce((s, x) => s + f(x), 0));
  if (list.length < 2) return <ReportFrame toast={toast} title="Branch performance" icon={Store} nobranch chips={[`${dmy(p.from)} – ${dmy(p.to)}`]}>
    <EmptyState icon={Store} title="Add branches to compare them">Set up branches in Utilities & tools › Branches; this report then puts them side by side.</EmptyState>
    <div className="row-btns" style={{ justifyContent: "center", paddingBottom: 18 }}><Btn kind="pri" icon={Store} onClick={() => go("branches")}>Set up branches</Btn></div></ReportFrame>;
  const best = rows.slice().sort((a, b) => b.r.net - a.r.net)[0];
  const lines = [["Revenue", (x) => x.r.revenue, true], ["Cost of sales", (x) => -x.r.cost], ["Gross profit", (x) => x.r.gross, true, "sub"], ["Gross margin", (x) => x.r.gm, false, "pct"],
    ["Operating expenses", (x) => -x.r.expense], ["Net profit", (x) => x.r.net, true, "total"], ["Net margin", (x) => x.r.nm, false, "pct"],
    ["Invoices issued", (x) => x.invoices, false, "count"], ["Average invoice", (x) => x.avg], ["Cash collected", (x) => x.cash], ["Customers owe (at period end)", (x) => x.ar]];
  const total = { r: { revenue: all.revenue, cost: all.cost, gross: all.gross, gm: all.gm, expense: all.expense, net: all.net, nm: all.nm }, invoices: sum((x) => x.invoices),
    avg: sum((x) => x.invoices) ? R2(all.revenue / sum((x) => x.invoices)) : 0, cash: sum((x) => x.cash), ar: sum((x) => x.ar) };
  const fmt = (v, kind) => (kind === "pct" ? `${(+v || 0).toFixed(1)}%` : kind === "count" ? String(v) : money(v));
  return <div className="grid">
    <ReportFrame toast={toast} title="Branch performance" icon={Store} nobranch
      chips={[`${dmy(p.from)} – ${dmy(p.to)}`, `${list.length} branches`, "AED"]} meta={`${dmy(p.from)} to ${dmy(p.to)} · ${list.length} branches · AED`}
      right={<PeriodBar p={p} setP={setP} nobranch />}>
      <Insight tone="">{best && best.r.net > 0 ? <><b>{best.b.name}</b> made the most profit: <b>{aed(best.r.net)}</b> on sales of {aed(best.r.revenue)} ({best.r.nm.toFixed(1)}% net margin). </> : null}
        All branches together: sales {aed(all.revenue)}, net profit {aed(all.net)}.</Insight>
      <div className="rpt-grid">
        <VizCard title="Sales and net profit by branch" sub={`${dmy(p.from)} – ${dmy(p.to)} · AED · hover a branch for the figures`}
          legend={[{ name: "Sales", color: "var(--s1)" }, { name: "Net profit", color: "var(--s2)" }]}>
          <ColumnChart data={rows.map((x) => ({ label: x.b.code || x.b.name, full: x.b.name, revenue: x.r.revenue, net: x.r.net }))}
            series={[{ key: "revenue", name: "Sales", color: "var(--s1)" }, { key: "net", name: "Net profit", color: "var(--s2)" }]} ariaLabel="Sales and net profit by branch" />
        </VizCard>
        <VizCard title="Share of sales" sub="Each branch's part of the company's revenue">
          <ShareMeters items={rows.map((x) => ({ id: x.b.id, name: x.b.name, r: x.r }))} total={all.revenue} />
        </VizCard>
      </div>
      <SectionTitle>Side by side</SectionTitle>
      <div className="tbl-wrap"><table className="tbl fin-tbl br-tbl">
        <thead><tr><th></th>{rows.map((x) => <th key={x.b.id} className="n">{x.b.name}{x.b.active === false && <small> (off)</small>}</th>)}<th className="n">All branches</th></tr></thead>
        <tbody>{lines.map(([label, f, , kind]) => <tr key={label} className={kind === "total" ? "fin-total" : kind === "sub" ? "fin-sub" : "fin-acc"}>
          <td>{label}</td>{rows.map((x) => <td key={x.b.id} className={cx("n", f(x) < 0 && kind !== "pct" && label !== "Cost of sales" && label !== "Operating expenses" && "neg")}>{fmt(f(x), kind)}</td>)}
          <td className="n" style={{ fontWeight: 650 }}>{fmt(f(total), kind)}</td></tr>)}</tbody>
      </table></div>
      <p className="br-note">Each branch's figures come from the transactions recorded under it; the "All branches" column is the whole company and always equals the profit and loss statement. Cash collected and what customers owe follow the invoice a payment settles. Open a single branch's statements with the Branch filter on any report.</p>
    </ReportFrame>
  </div>;
}

/* Each branch's or company's share of sales, with its net margin underneath. */
function ShareMeters({ items, total }) {
  return <div className="meters">{items.map((x) => <Meter key={x.id} label={x.name} value={Math.max(0, x.r.revenue)} max={Math.max(total, 1)}
    text={total ? `${((x.r.revenue / total) * 100).toFixed(1)}%` : "—"} tone={x.r.net < 0 ? "neg" : undefined}
    note={`AED ${money(x.r.revenue, false)} · ${x.r.revenue ? ((x.r.net / x.r.revenue) * 100).toFixed(1) : "0.0"}% net margin`} />)}</div>;
}

/* ------------------------------------------------------------ group report */
/* Work something out with another company's chart of accounts, products, customers and branches loaded, then put this company's back. */
function withCompanyMasters(other, mine, fn) {
  const load = (b) => { syncAccounts(b.accounts || []); syncPartners(b.partners || []); syncProducts(b.products || [], b.categories || DEFAULT_CATEGORIES);
    syncMethods(b.methods || []); syncBranches(b.branches || [], branchCfg(b)); };
  try { load(other); return fn(); } finally { load(mine); }
}
/* One company's headline figures, worked out with that company's own chart of accounts loaded. */
function companyFigures(bk, from, to) {
  const r = pnl(bk.flat, from, to), b = balanceSheet(bk.flat, to, to.slice(0, 4) + "-01-01");
  const bal = (t) => R2(bk.flat.filter((l) => l.date <= to && ACC[l.acc] && ACC[l.acc].type === t).reduce((s, l) => s + l.debit - l.credit, 0));
  return { r, assets: b.totA, liab: b.totL, equity: b.totE, cash: bal("bank"), recv: bal("receivable"), pay: -bal("payable"), balanced: bk.balanced && Math.abs(b.diff) < 0.01 };
}
function GroupReport({ state, books, company, p, setP, toast, onAdd }) {
  const list = companyList(), active = activeCompanyId();
  const cols = useMemo(() => list.map((c) => {
    if (c.id === active) return { c: { ...c, name: company.name }, ...companyFigures(books, p.from, p.to) };
    const x = readCompany(c.id);
    if (!x.books) return { c: { ...c, name: x.profile.name || c.name }, missing: true };
    return { c: { ...c, name: x.profile.name || c.name }, ...withCompanyMasters(x.books, state, () => companyFigures(deriveBooks(x.books), p.from, p.to)) };
  }), [books, state, company, p.from, p.to]);
  const live = cols.filter((x) => !x.missing);
  const tot = (f) => R2(live.reduce((s, x) => s + f(x), 0));
  if (list.length < 2) return <ReportFrame toast={toast} title="Group report" icon={Building2} nobranch chips={[`${dmy(p.from)} – ${dmy(p.to)}`]}>
    <EmptyState icon={Building2} title="One company so far">Add your other companies (Settings › Companies, or the company name at the top of the menu) and this report puts them together.</EmptyState>
    <div className="row-btns" style={{ justifyContent: "center", paddingBottom: 18 }}><Btn kind="pri" icon={Plus} onClick={onAdd}>Add a company</Btn></div></ReportFrame>;
  const pct = (x) => (x.r.revenue ? (x.r.net / x.r.revenue) * 100 : 0);
  const lines = [["Revenue", (x) => x.r.revenue], ["Cost of sales", (x) => -x.r.cost], ["Gross profit", (x) => x.r.gross, "sub"], ["Operating expenses", (x) => -x.r.expense], ["Net profit", (x) => x.r.net, "total"],
    ["Net margin", pct, "pct"], [null], ["Cash and bank", (x) => x.cash], ["Customers owe", (x) => x.recv], ["Owed to vendors", (x) => x.pay],
    ["Total assets", (x) => x.assets, "sub"], ["Total liabilities", (x) => x.liab], ["Equity", (x) => x.equity, "total"]];
  const T = { r: { revenue: tot((x) => x.r.revenue), cost: tot((x) => x.r.cost), gross: tot((x) => x.r.gross), expense: tot((x) => x.r.expense), net: tot((x) => x.r.net) },
    cash: tot((x) => x.cash), recv: tot((x) => x.recv), pay: tot((x) => x.pay), assets: tot((x) => x.assets), liab: tot((x) => x.liab), equity: tot((x) => x.equity) };
  return <div className="grid">
    <ReportFrame toast={toast} title="Group report" icon={Building2} nobranch chips={[`${dmy(p.from)} – ${dmy(p.to)}`, `${live.length} companies`, "AED"]}
      meta={`${dmy(p.from)} to ${dmy(p.to)} · balances at ${dmy(p.to)} · ${live.length} companies · AED`} right={<PeriodBar p={p} setP={setP} nobranch />}>
      <Insight tone="">The group made <b>{aed(T.r.net)}</b> net profit on sales of {aed(T.r.revenue)} from {dmy(p.from)} to {dmy(p.to)}, and holds {aed(T.cash)} in cash and bank.</Insight>
      <div className="rpt-grid">
        <VizCard title="Sales and net profit by company" sub={`${dmy(p.from)} – ${dmy(p.to)} · AED · hover a company for the figures`}
          legend={[{ name: "Sales", color: "var(--s1)" }, { name: "Net profit", color: "var(--s2)" }]}>
          <ColumnChart data={live.map((x) => ({ label: initials(x.c.name) || x.c.name.slice(0, 3), full: x.c.name, revenue: x.r.revenue, net: x.r.net }))}
            series={[{ key: "revenue", name: "Sales", color: "var(--s1)" }, { key: "net", name: "Net profit", color: "var(--s2)" }]} ariaLabel="Sales and net profit by company" />
        </VizCard>
        <VizCard title="Share of group sales" sub="Each company's part of the group's revenue">
          <ShareMeters items={live.map((x) => ({ id: x.c.id, name: x.c.name, r: x.r }))} total={T.r.revenue} />
        </VizCard>
      </div>
      <SectionTitle>Companies side by side</SectionTitle>
      <div className="tbl-wrap"><table className="tbl fin-tbl br-tbl">
        <thead><tr><th></th>{cols.map((x) => <th key={x.c.id} className="n">{x.c.name}{x.c.id === active && <small> (open)</small>}</th>)}<th className="n">Group total</th></tr></thead>
        <tbody>{lines.map(([label, f, kind], i) => label === null ? <tr key={"g" + i} className="fin-sec"><td colSpan={cols.length + 2}>Balances at {dmy(p.to)}</td></tr>
          : <tr key={label} className={kind === "total" ? "fin-total" : kind === "sub" ? "fin-sub" : "fin-acc"}><td>{label}</td>
            {cols.map((x) => <td key={x.c.id} className="n">{x.missing ? "—" : kind === "pct" ? `${f(x).toFixed(1)}%` : money(f(x))}</td>)}
            <td className="n" style={{ fontWeight: 650 }}>{kind === "pct" ? `${pct(T).toFixed(1)}%` : money(f(T))}</td></tr>)}</tbody>
      </table></div>
      <p className="br-note">Each company's figures come from its own books in this browser{cols.some((x) => x.missing) ? " (a company that is still the sample, or was never opened, shows —)" : ""}. The group total adds the companies together; sales, loans or balances between group companies are not eliminated, so adjust for them in your consolidation if you have any.</p>
    </ReportFrame>
  </div>;
}

const GROUP_CSS = `
.br-pick{display:inline-flex;align-items:center;gap:7px;min-width:190px}
.br-pick>svg{color:var(--ink-3);flex:0 0 auto}
.br-pick .inp.sel{min-width:160px}
.br-pick.dark>svg{color:rgba(255,255,255,.8)}
.br-pick.dark .inp.sel{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.18);color:#fff}
.co-pop{position:fixed;z-index:1300;width:340px;max-width:calc(100vw - 24px);background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--sh-3);overflow:hidden;animation:ntIn .22s cubic-bezier(.22,1,.36,1) both}
.co-pop header{padding:14px 16px 10px;border-bottom:1px solid var(--line-2)}
.co-pop header b{display:block;font-size:14px;color:var(--ink)}.co-pop header small{display:block;font-size:12px;color:var(--ink-3);margin-top:2px}
.co-list{max-height:320px;overflow:auto;padding:6px}
.co-row{display:flex;align-items:center;gap:11px;width:100%;padding:9px 10px;border-radius:11px;text-align:left;transition:background .15s}
.co-row:hover{background:var(--surface-2)}.co-row.on{background:var(--brand-50)}
.co-row svg{color:var(--ink-3)}
.co-av{width:34px;height:34px;flex:0 0 34px;border-radius:10px;display:grid;place-items:center;font-size:12px;font-weight:700;
  background:color-mix(in srgb,var(--co,var(--brand)) 13%,var(--surface));color:var(--co,var(--brand));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--co,var(--brand)) 22%,transparent)}
.co-av.img{object-fit:contain;background:#fff;padding:3px}
.co-t{flex:1;min-width:0}.co-t b{display:block;font-size:13px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.co-t small{display:block;font-size:11.5px;color:var(--ink-3)}
.co-pop footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-top:1px solid var(--line-2);background:var(--surface-2)}
.co-setrow{gap:12px}
.co-setrow .st b{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.co-setrow .st b .pill{flex:0 0 auto;width:auto}
.co-add{display:flex;align-items:center;gap:14px;padding-top:14px;font-size:12.5px;color:var(--ink-3);line-height:1.5}
.br-intro{display:flex;gap:18px;align-items:flex-start;padding:8px 4px}
.br-intro-ic{width:52px;height:52px;flex:0 0 52px;border-radius:16px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand)}
.br-intro h3{font-size:17px;margin-bottom:8px}.br-intro ol{margin:0 0 10px 18px;padding:0;font-size:13px;line-height:1.7;color:var(--ink-2)}
.br-intro p{font-size:12.5px;color:var(--ink-3);line-height:1.6;margin:0 0 14px;max-width:720px}
.br-grid-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:16px}
.br-own{padding:16px 18px;display:flex;flex-direction:column;gap:12px;transition:box-shadow .2s,border-color .2s}
.br-own.def{border-color:color-mix(in srgb,var(--brand) 35%,var(--line))}
.br-own.off{opacity:.7}
.bo-top{display:flex;align-items:flex-start;gap:12px}
.bo-ic{width:38px;height:38px;flex:0 0 38px;border-radius:12px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand)}
.bo-t{flex:1;min-width:0}.bo-t b{display:flex;align-items:center;gap:8px;font-size:14.5px;color:var(--ink)}
.bo-t b em{font-style:normal;font-size:10.5px;font-weight:700;letter-spacing:.06em;padding:2px 7px;border-radius:6px;background:var(--surface-3);color:var(--ink-2)}
.bo-t small{display:block;font-size:12px;color:var(--ink-3);margin-top:3px}
.bo-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.bo-stats>div{padding:9px 10px;border-radius:10px;background:var(--surface-2)}
.bo-stats small{display:block;font-size:11px;color:var(--ink-3)}.bo-stats b{display:block;font-size:14px;margin-top:3px;font-variant-numeric:tabular-nums}
.bo-stats b.neg{color:var(--neg)}
.bo-people{display:flex;gap:4px;align-items:center;min-height:26px}
.bo-people span{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:700;background:var(--surface-3);color:var(--ink-2);border:2px solid var(--surface)}
.bo-people small{font-size:11.5px;color:var(--ink-4)}
.bo-acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.bo-icons{margin-left:auto;display:inline-flex;gap:2px}
.br-tbl th small{font-weight:400;color:var(--ink-4)}
.br-note{font-size:12px;color:var(--ink-3);line-height:1.6;margin:14px 2px 4px;max-width:900px}
.sb-co .sb-co-cv{margin-left:auto;color:var(--sb-dim);flex:0 0 auto}
/* 3.19 — switcher */
.co-search{display:flex;align-items:center;gap:8px;margin:8px 10px 0;padding:0 11px;height:36px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line);color:var(--ink-3)}
.co-search input{flex:1;border:0;background:transparent;outline:0;font:inherit;font-size:13px;color:var(--ink)}
.co-none{padding:14px;font-size:12.5px;color:var(--ink-3);text-align:center}
.co-work{padding:10px 14px 12px;border-top:1px solid var(--line-2)}
.co-work-h{display:flex;align-items:center;gap:6px;margin-bottom:8px;color:var(--brand)}.co-work-h b{font-size:12.5px;color:var(--ink)}.co-work-h small{font-size:11.5px;color:var(--ink-3);margin-left:auto}
.co-work-list{display:flex;flex-wrap:wrap;gap:6px}
.co-wb{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 11px;border-radius:999px;border:1px solid var(--line);background:var(--surface);font-size:12.5px;color:var(--ink-2);transition:background .15s,border-color .15s,color .15s}
.co-wb:hover{border-color:color-mix(in srgb,var(--brand) 40%,var(--line))}
.co-wb.on{background:var(--brand);border-color:var(--brand);color:var(--pri-txt,#fff)}
.co-wb em{font-style:normal;font-size:10px;letter-spacing:.04em;text-transform:uppercase;opacity:.7}
/* companies screen */
.cs-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:16px}
.cs-tile{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:11px;align-items:center;padding:13px 15px;border-radius:14px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--sh-1);text-align:left}
.cs-tile>span{grid-row:span 2;width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand)}
.cs-tile small{font-size:11.5px;color:var(--ink-3)}.cs-tile b{font-size:16px;font-variant-numeric:tabular-nums;color:var(--ink)}
.cs-tile.link{cursor:pointer;transition:border-color .15s,transform .15s}.cs-tile.link:hover{border-color:color-mix(in srgb,var(--brand) 40%,var(--line));transform:translateY(-1px)}
.cs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(400px,1fr));gap:16px}
.cs-card{position:relative;overflow:hidden;padding:0 18px 16px;display:flex;flex-direction:column;gap:13px;border-color:color-mix(in srgb,var(--co) 22%,var(--line))}
.cs-card.on{box-shadow:0 0 0 2px color-mix(in srgb,var(--co) 45%,transparent),var(--sh-2)}
.cs-band{height:6px;margin:0 -18px;background:linear-gradient(90deg,var(--co),color-mix(in srgb,var(--co) 45%,#fff))}
.cs-top{display:flex;align-items:flex-start;gap:12px;padding-top:6px}
.cs-av,.cs-logo{width:46px;height:46px;flex:0 0 46px;border-radius:13px;display:grid;place-items:center;font-weight:750;font-size:15px}
.cs-av{background:color-mix(in srgb,var(--co) 14%,var(--surface));color:var(--co);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--co) 25%,transparent)}
.cs-logo{object-fit:contain;background:#fff;border:1px solid var(--line);padding:4px}
.cs-t{flex:1;min-width:0}.cs-t b{display:block;font-size:15.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-t .ar{display:block;font-size:13px;color:var(--ink-2);margin-top:1px}.cs-t small{display:block;font-size:12px;color:var(--ink-3);margin-top:3px;font-variant-numeric:tabular-nums}
.cs-figs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.cs-figs>div{padding:9px 10px;border-radius:10px;background:var(--surface-2)}
.cs-figs small{display:block;font-size:10.5px;color:var(--ink-3);white-space:nowrap}.cs-figs b{display:block;font-size:13.5px;margin-top:3px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-figs b.neg{color:var(--neg)}
.cs-meta{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--ink-3)}.cs-meta span{display:inline-flex;align-items:center;gap:5px}
.cs-setup{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--ink-2)}
.cs-bar{flex:0 0 120px;height:6px;border-radius:999px;background:var(--surface-3);overflow:hidden}.cs-bar i{display:block;height:100%;border-radius:inherit;background:var(--co);transition:width .5s cubic-bezier(.22,1,.36,1)}
.cs-missing{font-size:12.5px;color:var(--ink-3);padding:10px 12px;border-radius:10px;background:var(--surface-2)}
.cs-acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:auto;padding-top:2px}
.cs-swatches{display:inline-flex;gap:5px;margin-left:auto;padding:4px 6px;border-radius:999px;background:var(--surface-2)}
.cs-sw{width:18px;height:18px;border-radius:50%;border:2px solid var(--surface);box-shadow:0 0 0 1px var(--line);transition:transform .15s,box-shadow .15s}
.cs-sw:hover{transform:scale(1.12)}.cs-sw.on{box-shadow:0 0 0 2px var(--ink-2)}
.cs-card.add{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:250px;padding:24px;border:1.5px dashed var(--line);border-radius:var(--r-lg,16px);background:transparent;color:var(--ink-2);text-align:center;cursor:pointer;transition:border-color .2s,background .2s}
.cs-card.add:hover{border-color:var(--brand);background:color-mix(in srgb,var(--brand) 4%,transparent)}
.cs-card.add b{font-size:15px;color:var(--ink)}.cs-card.add small{font-size:12.5px;color:var(--ink-3);max-width:300px;line-height:1.55}
.cs-add-ic{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand)}
/* branch set-up wizard */
.bw-lead{font-size:13px;color:var(--ink-2);line-height:1.6;margin:0 0 14px}
.bw-rows{display:flex;flex-direction:column;gap:7px}
.bw-row{display:grid;grid-template-columns:minmax(0,1.5fr) 90px minmax(0,1fr) minmax(0,1.5fr) 34px;gap:8px;align-items:center}
.bw-row.head{font-size:11px;font-weight:650;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3)}
.bw-row.ho{padding:9px 10px;border-radius:10px;background:var(--surface-2);font-size:13px;color:var(--ink-2)}
.bw-row.ho>span:first-child{display:flex;align-items:center;gap:7px;font-weight:600;color:var(--ink)}
.bw-row .inp.sel{min-width:0}
.bw-add{display:inline-flex;align-items:center;gap:6px;margin-top:10px;height:34px;padding:0 13px;border-radius:10px;border:1px dashed var(--line);font-size:13px;color:var(--brand);font-weight:600}
.bw-add:hover{border-color:var(--brand);background:var(--brand-50)}
.bw-picks{grid-template-columns:1fr 1fr}
.bw-picks .pick{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left}
.bw-picks .pick code{margin-top:6px;font-family:var(--mono);font-size:12.5px;padding:3px 8px;border-radius:7px;background:var(--surface-3);color:var(--ink)}
.bw-people{display:flex;flex-direction:column;gap:6px}
.bw-person{display:grid;grid-template-columns:32px minmax(0,1fr) minmax(0,220px) auto;gap:10px;align-items:center;padding:8px 10px;border-radius:11px;border:1px solid var(--line-2)}
.bw-av{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;background:var(--surface-3);color:var(--ink-2)}
.bw-pn b{display:block;font-size:13px}.bw-pn small{font-size:11.5px;color:var(--ink-3)}
.bw-only{white-space:nowrap;font-size:12.5px}.bw-only.dis{opacity:.55}
/* branches screen */
.br-settings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin-bottom:16px;padding:0;overflow:hidden}
.bs-col{display:flex;gap:12px;padding:15px 18px;border-right:1px solid var(--line-2)}.bs-col:last-child{border-right:0}
.bs-col>div{display:flex;flex-direction:column;gap:7px;min-width:0;flex:1}
.bs-col b{font-size:13px}.bs-col small{font-size:11.5px;color:var(--ink-3);line-height:1.5}
.bs-ic{width:34px;height:34px;flex:0 0 34px;border-radius:10px;display:grid;place-items:center;background:var(--brand-50);color:var(--brand)}
.bs-seg{align-self:flex-start}.bs-big{font-size:13px;color:var(--ink-2)}
.bs-col .linkish{align-self:flex-start;font-size:12.5px}
.br-form{grid-template-columns:repeat(4,minmax(0,1fr))}
.bo-sub{color:var(--ink-2)!important}
.bo-pills{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.bo-people span.only{box-shadow:0 0 0 2px color-mix(in srgb,var(--warn,#B45309) 55%,transparent)}
.bo-next{margin-left:auto;display:inline-flex!important;align-items:center;gap:4px;font-family:var(--mono);font-size:11px!important;color:var(--ink-3)!important;padding:2px 7px;border-radius:6px;background:var(--surface-2)}
.br-own.work{box-shadow:0 0 0 2px color-mix(in srgb,var(--brand) 40%,transparent),var(--sh-1)}
.br-pick.locked{min-width:0;height:36px;padding:0 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line);font-size:13px;color:var(--ink-2);gap:6px}
.br-pick.locked.dark{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.18);color:#fff}
.u-br{white-space:nowrap}.u-br span{display:inline-flex;align-items:center;gap:3px;margin-left:7px;font-size:11px;color:var(--ink-3)}
/* add a company: colour */
.co-colour small{display:block;font-size:11.5px;color:var(--ink-3);margin-top:6px}
.cc-row{display:flex;flex-wrap:wrap;gap:8px}
.cc-opt{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 13px 0 7px;border-radius:10px;border:1px solid var(--line);background:var(--surface);font-size:12.5px;color:var(--ink-2);transition:border-color .15s,box-shadow .15s}
.cc-opt i{width:22px;height:22px;border-radius:7px}
.cc-opt.on{border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 18%,transparent);color:var(--ink)}
@media(max-width:900px){.br-settings{grid-template-columns:1fr}.bs-col{border-right:0;border-bottom:1px solid var(--line-2)}.br-form{grid-template-columns:1fr 1fr}.cs-figs{grid-template-columns:1fr 1fr}}
@media(max-width:650px){.br-grid-cards{grid-template-columns:1fr}.br-intro{flex-direction:column}.co-add{flex-direction:column;align-items:flex-start}
  .cs-grid{grid-template-columns:1fr}.bw-row{grid-template-columns:1fr 70px 34px}.bw-row>:nth-child(3),.bw-row>:nth-child(4){display:none}.bw-row.head>:nth-child(3),.bw-row.head>:nth-child(4){display:none}
  .bw-picks{grid-template-columns:1fr}.bw-person{grid-template-columns:32px 1fr}.bw-person .inp.sel,.bw-person .bw-only{grid-column:2}.br-form{grid-template-columns:1fr}.cs-swatches{margin-left:0}}
`;
