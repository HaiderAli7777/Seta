/* ============================================================================
   INVOEEZ BRAND LAYER — loads after the base and design layers.
   The logo is polished chrome, so the product is graphite and silver:
   graphite surfaces and primary actions, brushed-silver highlights, and one
   steel-blue accent for links, focus and selection. Green and red stay
   reserved for money meaning (paid / received, overdue / owed).
   ========================================================================== */
const BRAND_CSS = `
.mz{
  --brand:#2F62C4;--brand-600:#244FA3;--brand-50:#EDF2FB;--brand-100:#D7E3F7;
  --royal:#2F62C4;--violet:#4C6A92;--violet-50:#EEF2F7;
  --graphite:#1B1F25;--graphite-2:#2A3038;--silver:#C9CED4;--silver-2:#E6E9ED;
  --metal:linear-gradient(135deg,#FFFFFF 0%,#E4E7EB 38%,#C2C8CF 52%,#EEF0F2 70%,#D3D8DE 100%);
  --ink:#16191D;--ink-2:#3E444C;--ink-3:#626973;--ink-4:#9AA0A8;
  --bg:#F2F3F5;--surface:#FFFFFF;--surface-2:#F8F9FA;--surface-3:#EEF0F2;
  --line:#E2E5E9;--line-2:#ECEEF1;
  --app-bg:radial-gradient(1100px 560px at 82% -12%,rgba(47,98,196,.055),transparent 62%),
           radial-gradient(900px 480px at 0% 0%,rgba(120,130,145,.08),transparent 60%),#F2F3F5;
  --c1:#2F62C4;--c2:#AEB6C1;--c3:#4A5562;
  --ring:0 0 0 3px rgba(47,98,196,.20);
  --sh-1:0 1px 2px rgba(16,18,22,.05),0 1px 3px rgba(16,18,22,.04);
  --sh-2:0 2px 6px rgba(16,18,22,.06),0 10px 26px rgba(16,18,22,.08);
  --sh-3:0 24px 64px rgba(16,18,22,.20),0 6px 18px rgba(16,18,22,.10);
  --post-bg:#16191E;
}
.mz[data-theme="dark"]{
  --brand:#8DB3F5;--brand-600:#A9C6F8;--brand-50:#242B37;--brand-100:#303B4D;
  --royal:#8DB3F5;--violet:#A9B8CC;--violet-50:rgba(169,184,204,.12);
  --metal:linear-gradient(135deg,#3A4049 0%,#262B32 45%,#1C2026 100%);
  --ink:#ECEEF1;--ink-2:#C3C8CF;--ink-3:#959CA6;--ink-4:#6B727C;
  --bg:#0E1013;--surface:#16191D;--surface-2:#1B1F24;--surface-3:#242930;
  --line:rgba(255,255,255,.09);--line-2:rgba(255,255,255,.05);
  --app-bg:radial-gradient(1100px 560px at 82% -12%,rgba(141,179,245,.07),transparent 62%),#0E1013;
  --c1:#8DB3F5;--c2:#6B737E;--c3:#C9CED4;
  --ring:0 0 0 3px rgba(141,179,245,.28);
  --post-bg:#0B0D10;
}
.mz[data-theme="dark"] ::-webkit-scrollbar-thumb{background:#2E343C;background-clip:content-box}
.mz[data-theme="dark"] ::-webkit-scrollbar-thumb:hover{background:#3C434D;background-clip:content-box}

/* Buttons: graphite metal for the primary action, silver in dark mode */
.mz .btn.pri{background:linear-gradient(180deg,#323840 0%,#1C2026 100%);border-color:#15181C;color:#fff;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 1px 2px rgba(16,18,22,.25),0 4px 12px rgba(16,18,22,.12)}
.mz .btn.pri:hover{background:linear-gradient(180deg,#3B424B 0%,#22272E 100%);border-color:#15181C}
.mz .btn.pri:active{background:#1A1D22}
.mz .btn.pri svg{color:#E6E9ED}
.mz[data-theme="dark"] .btn.pri{background:linear-gradient(180deg,#F5F6F8 0%,#CBD0D6 100%);border-color:#B9BFC6;color:#14171B;
  box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.4)}
.mz[data-theme="dark"] .btn.pri:hover{background:linear-gradient(180deg,#FFFFFF 0%,#D9DDE2 100%)}
.mz[data-theme="dark"] .btn.pri svg{color:#2A3038}
.mz .inp:focus,.mz .smart-picker input:focus{border-color:var(--brand);box-shadow:var(--ring)}
.mz .userchip .me,.mz .me{background:linear-gradient(140deg,#4A5562,#1B1F25);color:#fff}
.mz a{color:var(--brand)}

/* Cash card: brushed graphite with silver type */
.mz .cash-hero{background:linear-gradient(125deg,#16191E 0%,#262B33 50%,#38404A 100%);border-color:#2A3038;color:#D9DDE2;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 14px 34px rgba(16,18,22,.18)}
.mz .cash-hero p,.mz .cash-foot>span{color:#AEB4BC}.mz .cash-value{color:#fff}.mz .cash-foot button{color:#fff}
.mz .cash-bars>i{background:linear-gradient(180deg,#F1F3F5,#9AA2AC)}
.mz[data-theme="dark"] .cash-hero{background:linear-gradient(125deg,#1C2026 0%,#262B33 55%,#323943 100%);border-color:#2E343C}

/* Category tints: steel, slate, silver, warm */
.mz .mint{--accent:#2F62C4;--tint:#EDF2FB}.mz .blue{--accent:#4A5562;--tint:#EEF0F3}.mz .lilac{--accent:#6A7480;--tint:#F1F3F5}
.mz[data-theme="dark"] .mint{--accent:#8DB3F5;--tint:#1C2738}.mz[data-theme="dark"] .blue{--accent:#C3C8CF;--tint:#22272E}
.mz[data-theme="dark"] .lilac{--accent:#AEB4BC;--tint:#21252B}

/* Money meaning: green in, red out */
.mz .flow-in{background:var(--pos)}.mz .flow-out{background:#E58A9C}
.mz .collection-bar{background:var(--pos-50)}.mz .collection-bar i{background:var(--neg)}

/* Initials avatars in lists */
.mz .av{display:inline-grid;place-items:center;flex:0 0 auto;border-radius:8px;font-size:10.5px;font-weight:700;letter-spacing:.02em;line-height:1}

/* Headings, tables and cards with a quiet metallic edge */
.mz .page-head{background:transparent}
.mz .page-head .micro,.mz .eyebrow{color:var(--brand)}
.mz .dashboard-head h1>span{color:var(--ink-3)}
.mz .tbl th{color:var(--ink-3)}
.mz .pill.ok{background:var(--pos-50);color:var(--pos)}
.mz ::selection{background:#D7E3F7}
.mz .card{box-shadow:var(--sh-1)}
.mz[data-theme="light"] .card,.mz:not([data-theme]) .card{border-color:var(--line)}

/* Top bar: frosted white over the canvas */
.mz .topbar{background:rgba(255,255,255,.86);backdrop-filter:blur(14px) saturate(1.2);border-bottom-color:var(--line)}
.mz[data-theme="dark"] .topbar{background:rgba(22,25,29,.86)}
.mz .omni{background:var(--surface-2);border-color:var(--line)}
.mz .omni .oi{background:var(--graphite);color:#fff}
.mz[data-theme="dark"] .omni .oi{background:#E6E9ED;color:#15181C}
`;
