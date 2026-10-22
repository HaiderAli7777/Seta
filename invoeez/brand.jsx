/* ============================================================================
   INVOEEZ BRAND LAYER — loads after the base and design layers.
   The chrome logo sits on a deep, coloured sidebar; one accent colour carries
   actions, links, focus and selection. Five colour themes share one set of
   variables (Settings → Appearance). Green and red stay reserved for money
   meaning (paid / received, overdue / owed).
   ========================================================================== */
const ACCENTS = {
  ocean:    { name: "Ocean blue", note: "Midnight navy with azure — the default", sw: ["#0E1A3A", "#1E5BE6", "#5CC8FF"], c1: "#1E5BE6", c1d: "#7AAEFF", c2: "#14B8A6", c2d: "#2DD4BF", sheet: ["#08132E", "#163C99"] },
  teal:     { name: "Lagoon teal", note: "Deep lagoon teal, calm like a classic ledger", sw: ["#0E3135", "#0B7A73", "#5EEAD4"], c1: "#0B7A73", c1d: "#4FD1C5", c2: "#F59E0B", c2d: "#FBBF24", sheet: ["#062124", "#0D5E58"] },
  royal:    { name: "Royal violet", note: "Indigo night with violet", sw: ["#1C1645", "#5241D8", "#C4B5FD"], c1: "#5241D8", c1d: "#AFA3FF", c2: "#EC4899", c2d: "#F472B6", sheet: ["#120C33", "#3A2EA8"] },
  graphite: { name: "Graphite", note: "Chrome and graphite, monochrome", sw: ["#1B1F25", "#2F62C4", "#C9CED4"], c1: "#2F62C4", c1d: "#8DB3F5", c2: "#AEB6C1", c2d: "#6B737E", sheet: ["#15181D", "#353C46"] },
  desert:   { name: "Desert sand", note: "Espresso and copper, warm like the dunes", sw: ["#2A1D15", "#A9531C", "#F2C48D"], c1: "#A9531C", c1d: "#F0A86B", c2: "#0F766E", c2d: "#2DD4BF", sheet: ["#1E140D", "#6B3D1B"] },
};
const ACCENT_KEY = "mizan.accent";
const accentOf = () => { try { const a = document.querySelector(".mz")?.getAttribute("data-accent"); return ACCENTS[a] ? a : "ocean"; } catch (e) { return "ocean"; } };
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

const BRAND_CSS = `
/* ---- shared neutrals: cool slate ---- */
.mz{
  --ink:#131A2B;--ink-2:#39435C;--ink-3:#5B6681;--ink-4:#95A0B8;
  --bg:#F2F5FA;--surface:#FFFFFF;--surface-2:#F7F9FC;--surface-3:#ECF0F7;
  --line:#E0E6F0;--line-2:#ECF0F6;
  --royal:var(--brand);--violet:#6B5BD6;--violet-50:#F1EFFF;
  --graphite:#1B1F25;--silver:#C9CED4;
  --sh-1:0 1px 2px rgba(16,24,40,.05),0 1px 3px rgba(16,24,40,.04);
  --sh-2:0 1px 2px rgba(16,24,40,.04),0 4px 10px -2px rgba(16,24,40,.05),0 16px 36px -14px rgba(16,24,40,.14);
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
  --brand:#1E5BE6;--brand-600:#1748C0;--brand-50:#EBF1FF;--brand-100:#D3E1FF;--ring:0 0 0 3px rgba(30,91,230,.20);--sel:#D3E1FF;
  --pri-a:#2A67F0;--pri-b:#1A4FD0;--pri-ha:#2560E8;--pri-hb:#1544B8;--pri-sh:rgba(30,91,230,.30);
  --sb-1:#0E1A3A;--sb-2:#0A1430;--sb-3:#070E22;--sb-acc:#5CC8FF;--sb-on:rgba(92,200,255,.15);
  --hero:linear-gradient(120deg,#08132E 0%,#0F2A6B 46%,#1E5BE6 100%);
  --sheet-1:#08132E;--sheet-2:#163C99;--app-tint:rgba(30,91,230,.075);--app-tint2:rgba(92,200,255,.07);
  --c1:#1E5BE6;--c2:#14B8A6;--c3:#6B5BD6;
}
.mz[data-theme="dark"],.mz[data-theme="dark"][data-accent="ocean"]{
  --brand:#7AAEFF;--brand-600:#A0C5FF;--brand-50:#16223D;--brand-100:#1E3259;--ring:0 0 0 3px rgba(122,174,255,.30);--sel:#1E3259;
  --sb-1:#0C1730;--sb-2:#081124;--sb-3:#050B18;--app-tint:rgba(122,174,255,.08);--app-tint2:rgba(92,200,255,.04);
  --c1:#7AAEFF;--c2:#2DD4BF;--c3:#A99CFF;
}
/* ---- Teal ---- */
.mz[data-accent="teal"]{
  --brand:#0B7A73;--brand-600:#08605A;--brand-50:#E3F4F2;--brand-100:#C3E8E4;--ring:0 0 0 3px rgba(11,122,115,.20);--sel:#C3E8E4;
  --pri-a:#0D8880;--pri-b:#096A64;--pri-ha:#0B7D76;--pri-hb:#075A55;--pri-sh:rgba(11,122,115,.30);
  --sb-1:#0E3135;--sb-2:#0A272A;--sb-3:#071D20;--sb-acc:#5EEAD4;--sb-on:rgba(94,234,212,.14);--sb-txt:#C3DDDA;--sb-dim:#7FA5A1;
  --hero:linear-gradient(120deg,#062124 0%,#0B4B47 48%,#10A196 100%);
  --sheet-1:#062124;--sheet-2:#0D5E58;--app-tint:rgba(11,122,115,.07);--app-tint2:rgba(94,234,212,.07);
  --c1:#0B7A73;--c2:#F59E0B;--c3:#1E5BE6;
}
.mz[data-theme="dark"][data-accent="teal"]{
  --brand:#4FD1C5;--brand-600:#7FE0D7;--brand-50:#0F2A2B;--brand-100:#163C3D;--ring:0 0 0 3px rgba(79,209,197,.28);--sel:#163C3D;
  --sb-1:#0B2427;--sb-2:#071B1D;--sb-3:#041214;--app-tint:rgba(79,209,197,.07);--app-tint2:rgba(94,234,212,.03);
  --c1:#4FD1C5;--c2:#FBBF24;--c3:#7AAEFF;
}
/* ---- Royal violet ---- */
.mz[data-accent="royal"]{
  --brand:#5241D8;--brand-600:#4233B5;--brand-50:#EFECFF;--brand-100:#DCD6FF;--ring:0 0 0 3px rgba(82,65,216,.20);--sel:#DCD6FF;
  --pri-a:#6A5AF2;--pri-b:#4A3BC8;--pri-ha:#5E4EE6;--pri-hb:#3F31B0;--pri-sh:rgba(82,65,216,.32);
  --sb-1:#1C1645;--sb-2:#151037;--sb-3:#0E0A27;--sb-acc:#C4B5FD;--sb-on:rgba(196,181,253,.16);--sb-txt:#D2CCF0;--sb-dim:#9A92C4;
  --hero:linear-gradient(120deg,#120C33 0%,#2E2390 50%,#6A5AF2 100%);
  --sheet-1:#120C33;--sheet-2:#3A2EA8;--app-tint:rgba(82,65,216,.07);--app-tint2:rgba(236,72,153,.04);
  --c1:#5241D8;--c2:#EC4899;--c3:#14B8A6;
}
.mz[data-theme="dark"][data-accent="royal"]{
  --brand:#AFA3FF;--brand-600:#C8BFFF;--brand-50:#1E1A44;--brand-100:#2A245C;--ring:0 0 0 3px rgba(175,163,255,.28);--sel:#2A245C;
  --sb-1:#151135;--sb-2:#0F0B28;--sb-3:#09071B;--app-tint:rgba(175,163,255,.08);--app-tint2:rgba(236,72,153,.03);
  --c1:#AFA3FF;--c2:#F472B6;--c3:#2DD4BF;
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
/* ---- Desert sand (espresso and copper) ---- */
.mz[data-accent="desert"]{
  --bg:#F6F3EF;--surface-2:#FAF8F5;--surface-3:#F1ECE6;--line:#E8E0D7;--line-2:#F0EBE5;
  --brand:#A9531C;--brand-600:#8A4313;--brand-50:#FBF0E7;--brand-100:#F5DCC8;--ring:0 0 0 3px rgba(169,83,28,.20);--sel:#F5DCC8;
  --pri-a:#B85E22;--pri-b:#93461A;--pri-ha:#AD571E;--pri-hb:#843E15;--pri-sh:rgba(169,83,28,.30);
  --sb-1:#2A1D15;--sb-2:#22170F;--sb-3:#1A110B;--sb-acc:#F2C48D;--sb-on:rgba(242,196,141,.16);--sb-txt:#E3D3C3;--sb-dim:#A8927E;
  --hero:linear-gradient(120deg,#1E140D 0%,#5A3418 50%,#C2672B 100%);
  --sheet-1:#1E140D;--sheet-2:#6B3D1B;--app-tint:rgba(194,103,43,.07);--app-tint2:rgba(242,196,141,.10);
  --c1:#A9531C;--c2:#0F766E;--c3:#B7791F;
}
.mz[data-theme="dark"][data-accent="desert"]{
  --ink:#F2ECE6;--ink-2:#D4C8BD;--ink-3:#A5978A;--ink-4:#76695D;
  --bg:#100D0B;--surface:#1A1512;--surface-2:#211B17;--surface-3:#2B231E;--line:rgba(255,236,220,.10);--line-2:rgba(255,236,220,.05);
  --brand:#F0A86B;--brand-600:#F5C08F;--brand-50:#2C2018;--brand-100:#3B2A1E;--ring:0 0 0 3px rgba(240,168,107,.28);--sel:#3B2A1E;
  --sb-1:#1C140F;--sb-2:#150F0B;--sb-3:#0F0A07;--app-tint:rgba(240,168,107,.06);--app-tint2:transparent;
  --c1:#F0A86B;--c2:#2DD4BF;--c3:#FBBF24;
}
.mz[data-theme="dark"][data-accent="desert"] .topbar{background:rgba(26,21,18,.86)}
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
.accent-pick .ap-sw{display:flex;height:38px;border-radius:9px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)}
.accent-pick .ap-sw i{flex:1}.accent-pick .ap-sw i:first-child{flex:2.2}
.accent-pick b{font-size:13px}.accent-pick span{font-size:11.5px;color:var(--ink-3);line-height:1.35}
`;
