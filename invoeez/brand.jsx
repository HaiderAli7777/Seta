/* ============================================================================
   INVOEEZ BRAND LAYER — loads after the base and design layers.
   The chrome logo sits on a deep, coloured sidebar; one accent colour carries
   actions, links, focus and selection. Four colour themes share one set of
   variables (Settings → Appearance). Green and red stay reserved for money
   meaning (paid / received, overdue / owed).
   ========================================================================== */
const ACCENTS = {
  ocean:    { name: "Ocean blue", note: "Midnight navy with azure — the default", sw: ["#15233F", "#1D63ED", "#5CC8FF"], c1: "#1D63ED", c1d: "#6EA6FF", c2: "#14B8A6", c2d: "#2DD4BF", sheet: ["#0E1B38", "#1A3F8C"] },
  teal:     { name: "Teal", note: "Deep teal slate, like a classic ledger", sw: ["#123236", "#0A7C78", "#4FE3D6"], c1: "#0A7C78", c1d: "#4FD1C5", c2: "#F59E0B", c2d: "#FBBF24", sheet: ["#0B2326", "#125E5A"] },
  royal:    { name: "Royal violet", note: "Indigo night with violet", sw: ["#1E1848", "#5145CD", "#B4A6FF"], c1: "#5145CD", c1d: "#A99CFF", c2: "#EC4899", c2d: "#F472B6", sheet: ["#160F3A", "#3A2E9E"] },
  graphite: { name: "Graphite", note: "Chrome and graphite, monochrome", sw: ["#1B1F25", "#2F62C4", "#C9CED4"], c1: "#2F62C4", c1d: "#8DB3F5", c2: "#AEB6C1", c2d: "#6B737E", sheet: ["#15181D", "#353C46"] },
};
const ACCENT_KEY = "mizan.accent";
const accentOf = () => { try { const a = document.querySelector(".mz")?.getAttribute("data-accent"); return ACCENTS[a] ? a : "ocean"; } catch (e) { return "ocean"; } };
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

const BRAND_CSS = `
/* ---- shared neutrals: cool slate ---- */
.mz{
  --ink:#131A2B;--ink-2:#39435C;--ink-3:#5B6681;--ink-4:#95A0B8;
  --bg:#F2F5FA;--surface:#FFFFFF;--surface-2:#F7F9FC;--surface-3:#ECF0F7;
  --line:#DFE5EF;--line-2:#EBEFF6;
  --royal:var(--brand);--violet:#6B5BD6;--violet-50:#F1EFFF;
  --graphite:#1B1F25;--silver:#C9CED4;
  --sh-1:0 1px 2px rgba(19,26,43,.05),0 1px 3px rgba(19,26,43,.04);
  --sh-2:0 2px 6px rgba(19,26,43,.06),0 10px 26px rgba(19,26,43,.08);
  --sh-3:0 24px 64px rgba(19,26,43,.20),0 6px 18px rgba(19,26,43,.10);
  --app-bg:radial-gradient(1100px 560px at 82% -12%,var(--app-tint),transparent 62%),
           radial-gradient(900px 480px at 0% 0%,var(--app-tint2),transparent 60%),var(--bg);
  --sb-txt:#C9D3E6;--sb-dim:#8A97B2;--sb-hover:rgba(255,255,255,.07);--sb-tree:rgba(255,255,255,.13);--sb-line:rgba(255,255,255,.09);
  --pri-txt:#FFFFFF;
}
.mz[data-theme="dark"]{
  --ink:#E8EDF7;--ink-2:#BEC8DB;--ink-3:#8F9AB3;--ink-4:#66718B;
  --bg:#0A101D;--surface:#111A2B;--surface-2:#152036;--surface-3:#1C2A44;
  --line:rgba(160,180,225,.13);--line-2:rgba(160,180,225,.07);
  --sh-1:0 1px 2px rgba(0,0,0,.5);
}

/* ---- Ocean blue (default) ---- */
.mz,.mz[data-accent="ocean"]{
  --brand:#1D63ED;--brand-600:#1650C4;--brand-50:#EBF2FF;--brand-100:#D4E3FF;--ring:0 0 0 3px rgba(29,99,237,.20);--sel:#D4E3FF;
  --pri-a:#2370F0;--pri-b:#1A56DB;--pri-ha:#1E6AEB;--pri-hb:#1448B5;--pri-sh:rgba(29,99,237,.30);
  --sb-1:#15233F;--sb-2:#0F1A31;--sb-3:#0A1224;--sb-acc:#5CC8FF;--sb-on:rgba(92,200,255,.15);
  --hero:linear-gradient(125deg,#0E1B38 0%,#163A80 55%,#1D63ED 100%);
  --sheet-1:#0E1B38;--sheet-2:#1A3F8C;--app-tint:rgba(29,99,237,.075);--app-tint2:rgba(92,200,255,.07);
  --c1:#1D63ED;--c2:#14B8A6;--c3:#6B5BD6;
}
.mz[data-theme="dark"],.mz[data-theme="dark"][data-accent="ocean"]{
  --brand:#6EA6FF;--brand-600:#97BFFF;--brand-50:#14223D;--brand-100:#1C3156;--ring:0 0 0 3px rgba(110,166,255,.30);--sel:#1C3156;
  --sb-1:#0D1830;--sb-2:#091226;--sb-3:#060C1A;--app-tint:rgba(110,166,255,.08);--app-tint2:rgba(92,200,255,.04);
  --c1:#6EA6FF;--c2:#2DD4BF;--c3:#A99CFF;
}
/* ---- Teal ---- */
.mz[data-accent="teal"]{
  --brand:#0A7C78;--brand-600:#08625F;--brand-50:#E5F5F4;--brand-100:#C6EAE7;--ring:0 0 0 3px rgba(10,124,120,.20);--sel:#C6EAE7;
  --pri-a:#0B847E;--pri-b:#08625F;--pri-ha:#0A7C78;--pri-hb:#075955;--pri-sh:rgba(10,124,120,.30);
  --sb-1:#123236;--sb-2:#0D262A;--sb-3:#091C1F;--sb-acc:#4FE3D6;--sb-on:rgba(79,227,214,.14);
  --hero:linear-gradient(125deg,#0B2326 0%,#0F4F4C 55%,#13A59E 100%);
  --sheet-1:#0B2326;--sheet-2:#125E5A;--app-tint:rgba(10,124,120,.07);--app-tint2:rgba(79,227,214,.07);
  --c1:#0A7C78;--c2:#F59E0B;--c3:#1D63ED;
}
.mz[data-theme="dark"][data-accent="teal"]{
  --brand:#4FD1C5;--brand-600:#7FE0D7;--brand-50:#0F2A2B;--brand-100:#163C3D;--ring:0 0 0 3px rgba(79,209,197,.28);--sel:#163C3D;
  --sb-1:#0C2427;--sb-2:#081B1E;--sb-3:#051214;--app-tint:rgba(79,209,197,.07);--app-tint2:rgba(79,227,214,.03);
  --c1:#4FD1C5;--c2:#FBBF24;--c3:#6EA6FF;
}
/* ---- Royal violet ---- */
.mz[data-accent="royal"]{
  --brand:#5145CD;--brand-600:#4136AE;--brand-50:#EFEDFF;--brand-100:#DDD8FF;--ring:0 0 0 3px rgba(81,69,205,.20);--sel:#DDD8FF;
  --pri-a:#6E5FF5;--pri-b:#4B3FC4;--pri-ha:#5F51E6;--pri-hb:#4134B0;--pri-sh:rgba(81,69,205,.32);
  --sb-1:#1E1848;--sb-2:#17113A;--sb-3:#0F0B29;--sb-acc:#B4A6FF;--sb-on:rgba(180,166,255,.16);
  --hero:linear-gradient(125deg,#160F3A 0%,#33289A 55%,#6E5FF5 100%);
  --sheet-1:#160F3A;--sheet-2:#3A2E9E;--app-tint:rgba(81,69,205,.07);--app-tint2:rgba(236,72,153,.04);
  --c1:#5145CD;--c2:#EC4899;--c3:#14B8A6;
}
.mz[data-theme="dark"][data-accent="royal"]{
  --brand:#A99CFF;--brand-600:#C3B9FF;--brand-50:#1C1840;--brand-100:#282257;--ring:0 0 0 3px rgba(169,156,255,.28);--sel:#282257;
  --sb-1:#161236;--sb-2:#100C29;--sb-3:#0A071C;--app-tint:rgba(169,156,255,.08);--app-tint2:rgba(236,72,153,.03);
  --c1:#A99CFF;--c2:#F472B6;--c3:#2DD4BF;
}
/* ---- Graphite (chrome monochrome) ---- */
.mz[data-accent="graphite"]{
  --ink:#16191D;--ink-2:#3E444C;--ink-3:#626973;--ink-4:#9AA0A8;
  --bg:#F2F3F5;--surface-2:#F8F9FA;--surface-3:#EEF0F2;--line:#E2E5E9;--line-2:#ECEEF1;
  --brand:#2F62C4;--brand-600:#244FA3;--brand-50:#EDF2FB;--brand-100:#D7E3F7;--ring:0 0 0 3px rgba(47,98,196,.20);--sel:#D7E3F7;
  --pri-a:#323840;--pri-b:#1C2026;--pri-ha:#3B424B;--pri-hb:#22272E;--pri-sh:rgba(16,18,22,.22);
  --sb-1:#1D2127;--sb-2:#16191E;--sb-3:#121418;--sb-acc:#8DB3F5;--sb-on:rgba(141,179,245,.14);
  --sb-txt:#C3C9D1;--sb-dim:#8C949E;
  --hero:linear-gradient(125deg,#16191E 0%,#262B33 50%,#38404A 100%);
  --sheet-1:#15181D;--sheet-2:#353C46;--app-tint:rgba(47,98,196,.05);--app-tint2:rgba(120,130,145,.08);
  --c1:#2F62C4;--c2:#AEB6C1;--c3:#4A5562;
}
.mz[data-theme="dark"][data-accent="graphite"]{
  --ink:#ECEEF1;--ink-2:#C3C8CF;--ink-3:#959CA6;--ink-4:#6B727C;
  --bg:#0E1013;--surface:#16191D;--surface-2:#1B1F24;--surface-3:#242930;--line:rgba(255,255,255,.09);--line-2:rgba(255,255,255,.05);
  --brand:#8DB3F5;--brand-600:#A9C6F8;--brand-50:#242B37;--brand-100:#303B4D;--ring:0 0 0 3px rgba(141,179,245,.28);--sel:#303B4D;
  --pri-a:#F5F6F8;--pri-b:#CBD0D6;--pri-ha:#FFFFFF;--pri-hb:#D9DDE2;--pri-sh:rgba(0,0,0,.4);--pri-txt:#14171B;
  --sb-1:#15181C;--sb-2:#101215;--sb-3:#0C0E10;--app-tint:rgba(141,179,245,.07);--app-tint2:transparent;
  --c1:#8DB3F5;--c2:#6B737E;--c3:#C9CED4;
}
.mz[data-theme="dark"] ::-webkit-scrollbar-thumb{background:var(--surface-3);background-clip:content-box}

/* Primary action in the theme colour */
.mz .btn.pri{background:linear-gradient(180deg,var(--pri-a) 0%,var(--pri-b) 100%);border-color:var(--pri-b);color:var(--pri-txt);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 1px 2px rgba(0,0,0,.12),0 6px 16px var(--pri-sh)}
.mz .btn.pri:hover{background:linear-gradient(180deg,var(--pri-ha) 0%,var(--pri-hb) 100%);border-color:var(--pri-b)}
.mz .btn.pri:active{background:var(--pri-b)}
.mz .btn.pri svg{color:inherit;opacity:.92}
.mz .inp:focus,.mz .smart-picker input:focus{border-color:var(--brand);box-shadow:var(--ring)}
.mz .userchip .me,.mz .me{background:linear-gradient(140deg,var(--pri-a),var(--sb-1));color:#fff}
.mz a{color:var(--brand)}

/* Cash card in the theme's night-to-accent gradient */
.mz .cash-hero{background:var(--hero);border-color:transparent;color:#DCE6F7;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 16px 36px var(--pri-sh)}
.mz .cash-hero p,.mz .cash-foot>span{color:rgba(225,234,250,.78)}.mz .cash-value{color:#fff}.mz .cash-foot button{color:#fff}
.mz .cash-bars>i{background:linear-gradient(180deg,#FFFFFF,rgba(255,255,255,.45))}

/* Category tints: accent, teal, violet, warm */
.mz .mint{--accent:var(--brand);--tint:var(--brand-50)}.mz .blue{--accent:#0E9F94;--tint:#E3F6F4}.mz .lilac{--accent:#6B5BD6;--tint:#F1EFFF}
.mz[data-theme="dark"] .mint{--accent:var(--brand);--tint:var(--brand-50)}.mz[data-theme="dark"] .blue{--accent:#4FD1C5;--tint:#0F2A2B}
.mz[data-theme="dark"] .lilac{--accent:#B4A6FF;--tint:#1F1A44}

/* Money meaning: green in, red out */
.mz .flow-in{background:var(--pos)}.mz .flow-out{background:#E58A9C}
.mz .collection-bar{background:var(--pos-50)}.mz .collection-bar i{background:var(--neg)}

/* Initials avatars in lists */
.mz .av{display:inline-grid;place-items:center;flex:0 0 auto;border-radius:8px;font-size:10.5px;font-weight:700;letter-spacing:.02em;line-height:1}

/* Headings, tables, tabs and cards carry the accent */
.mz .page-head{background:transparent}
.mz .page-head .micro,.mz .eyebrow{color:var(--brand)}
.mz .dashboard-head h1>span{color:var(--brand)}
.mz .tbl th{color:var(--ink-3)}
.mz .tbl thead th{background:var(--surface-2)}
.mz .pill.ok{background:var(--pos-50);color:var(--pos)}
.mz ::selection{background:var(--sel)}
.mz .card{box-shadow:var(--sh-1);border-color:var(--line)}
.mz .seg button.on{color:var(--brand);box-shadow:0 1px 2px rgba(0,0,0,.08),inset 0 0 0 1px var(--brand-100)}
.mz .doc-tabs [aria-selected="true"],.mz .doc-tabs .on{color:var(--brand)}
.mz .line-grid thead th{background:linear-gradient(180deg,var(--brand-50),var(--surface-2));color:var(--ink-2)}

/* Top bar: frosted over the canvas, search chip in the accent */
.mz .topbar{background:rgba(255,255,255,.86);backdrop-filter:blur(14px) saturate(1.2);border-bottom-color:var(--line)}
.mz[data-theme="dark"] .topbar{background:rgba(17,26,43,.86)}
.mz[data-theme="dark"][data-accent="graphite"] .topbar{background:rgba(22,25,29,.86)}
.mz .omni{background:var(--surface-2);border-color:var(--line)}
.mz .omni .oi{background:linear-gradient(140deg,var(--pri-a),var(--pri-b));color:var(--pri-txt)}

/* Colour-theme picker (Settings → Appearance) */
.accent-picks{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;padding:4px 0 2px}
.accent-pick{display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:12px;border:1px solid var(--line);background:var(--surface);text-align:left;transition:border-color .15s,box-shadow .15s}
.accent-pick:hover{border-color:var(--ink-4)}
.accent-pick.on{border-color:var(--brand);box-shadow:var(--ring)}
.accent-pick .sw{display:flex;height:34px;border-radius:8px;overflow:hidden}
.accent-pick .sw i{flex:1}.accent-pick .sw i:first-child{flex:2}
.accent-pick b{font-size:13px}.accent-pick span{font-size:11.5px;color:var(--ink-3);line-height:1.35}
`;
