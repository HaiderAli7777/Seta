/* ============================================================================
   INVOEEZ BRAND LAYER — loads last. Colours come from the logo:
   wordmark indigo #312682, ribbon royal blue #274395 / #404F9D,
   violet highlights #7C75B2 / #B9B2D8. Green and red stay reserved for
   money meaning (paid / received, overdue / owed).
   ========================================================================== */
const BRAND_CSS = `
.mz{
  --brand:#352A9C;--brand-600:#2A2180;--brand-50:#EFEEFB;--brand-100:#DCD9F6;
  --royal:#2D47A6;--violet:#7C6FD0;--violet-50:#F1EFFC;
  --ink:#1B1A3D;--ink-2:#45466F;--ink-3:#666891;--ink-4:#9A9CBE;
  --bg:#F4F4FB;--app-bg:#F4F4FB;--surface:#FFFFFF;--surface-2:#F8F8FD;--surface-3:#EEEEF8;
  --line:#E3E3F1;--line-2:#EEEEF7;
  --c1:#3B32A8;--c2:#B4B1D9;--c3:#2F55B8;
  --ring:0 0 0 3px #352A9C2E;
  --sh-1:0 1px 2px #1B1A3D0A,0 2px 6px #1B1A3D06;
  --nav-bg:linear-gradient(180deg,#241D74 0%,#1C1760 55%,#181453 100%);
  --nav-edge:#FFFFFF14;--nav-txt:#C3C0EE;--nav-hi:#FFFFFF;--nav-hover:#FFFFFF12;--nav-active:#FFFFFF;
  --nav-group:#9893DA;--nav-brand:#FFFFFF;--nav-sub:#AAA6E4;--nav-mark:#FFFFFF;--nav-chip:#FFFFFF14;--nav-chipt:#D3D0F6;
  --nav-card:#FFFFFF0D;--nav-cardline:#FFFFFF1C;--nav-scroll:#4A43A0;
  --post-bg:#1C1760;
}
.mz[data-theme="dark"]{
  --brand:#A9A3FF;--brand-600:#C4C0FF;--brand-50:#26245C;--brand-100:#353276;
  --royal:#7F9BFF;--violet:#B3A9FF;--violet-50:#24214F;
  --ink:#ECEBFF;--ink-2:#C6C4EA;--ink-3:#9C9AC9;--ink-4:#6F6DA0;
  --bg:#0E0D26;--app-bg:#0E0D26;--surface:#17163A;--surface-2:#1C1B45;--surface-3:#272656;
  --line:#B4B0FF21;--line-2:#B4B0FF12;
  --c1:#A39DFF;--c2:#6E6BA6;--c3:#7FA2FF;
  --ring:0 0 0 3px #A9A3FF40;
  --nav-bg:linear-gradient(180deg,#14123A 0%,#0F0D2D 100%);
  --nav-active:#2B2870;--nav-hi:#FFFFFF;--nav-txt:#B6B3E6;--nav-group:#8682C8;
  --post-bg:#0F0D2D;
}

/* Sidebar: the full logo on a white tile, the mark alone when the rail is collapsed */
.mz .side-top{padding:18px 16px 16px}
.brand-tile{display:flex;align-items:center;justify-content:center;width:100%;background:#FFFFFF;border-radius:14px;
  padding:10px 12px;box-shadow:0 6px 18px #0B08300F,inset 0 0 0 1px #FFFFFF;}
.brand-lockup{display:block;width:100%;max-width:196px;height:auto}
.brand-mark{display:none;width:34px;height:auto}
.side.mini .brand-tile{width:46px;height:46px;padding:6px;border-radius:12px}
.side.mini .brand-lockup{display:none}.side.mini .brand-mark{display:block}
@media (max-width:1024px) and (min-width:901px){
  .side .brand-tile{width:46px;height:46px;padding:6px;border-radius:12px}
  .side .brand-lockup{display:none}.side .brand-mark{display:block}}
.mz .side .nav-item{color:var(--nav-txt)}
.mz .side .nav-item:hover{background:var(--nav-hover);color:#fff}
.mz .side .nav-item.on{background:var(--nav-active);color:#231B6E!important;box-shadow:0 4px 14px #0B083033;font-weight:600}
.mz .side .nav-item.on svg{color:#352A9C!important}
.mz .side .nav-item.on .ct{background:#352A9C;color:#fff}
.mz .side .nav-item .ct{background:#FFFFFF1A;color:#E2E0FB}
.mz[data-theme="dark"] .side .nav-item.on{color:#FFFFFF!important;box-shadow:none}
.mz[data-theme="dark"] .side .nav-item.on svg{color:#C4C0FF!important}
.mz .side .nav-group{color:var(--nav-group)}
.mz .co-card{background:#FFFFFF0F;border:1px solid #FFFFFF1F}
.mz .co-card b{color:#fff}.mz .co-card .t span{color:var(--nav-sub)}
.mz .co-card .av,.mz .side-foot .av{background:linear-gradient(140deg,#7C75B2,#404F9D);color:#fff}
.mz .nav-search{border-color:#FFFFFF24;color:var(--nav-sub);background:#FFFFFF0A}
.mz .nav-search input{color:#fff}.mz .nav-search input::placeholder{color:var(--nav-sub)}
.mz .sysline{color:var(--nav-sub)}
.mz .side-foot .who b{color:#fff}.mz .side-foot .who span{color:var(--nav-sub)}

/* Buttons and focus */
.mz .btn.pri{background:linear-gradient(180deg,#3D31AD,#2F2590);border-color:#2F2590;color:#fff}
.mz .btn.pri:hover{background:linear-gradient(180deg,#352A9C,#261E7C)}
.mz[data-theme="dark"] .btn.pri{background:#A9A3FF;border-color:#A9A3FF;color:#15123F}
.mz[data-theme="dark"] .btn.pri:hover{background:#C4C0FF}
.mz .inp:focus,.mz .smart-picker input:focus{border-color:var(--brand);box-shadow:var(--ring)}
.mz .userchip .me,.mz .me{background:linear-gradient(140deg,#3B2FA6,#2D47A6);color:#fff}

/* Cash card follows the logo ribbon */
.mz .cash-hero{background:linear-gradient(125deg,#241D74 0%,#2B2A8F 45%,#2D47A6 100%);border-color:#3A3399;color:#DCDAFB}
.mz .cash-hero p,.mz .cash-foot>span{color:#B9B6EC}.mz .cash-value{color:#fff}.mz .cash-foot button{color:#fff}
.mz .cash-bars>i{background:#B9B2D8}
.mz[data-theme="dark"] .cash-hero{background:linear-gradient(125deg,#1B1760 0%,#24206E 50%,#223A86 100%);border-color:#2E2A78}

/* Category tints keep their meaning: brand, blue, violet, warm */
.mz .mint{--accent:#352A9C;--tint:#EFEEFB}.mz .blue{--accent:#2D47A6;--tint:#EAF0FD}.mz .lilac{--accent:#6A55C8;--tint:#F1EEFC}
.mz[data-theme="dark"] .mint{--accent:#B7B2FF;--tint:#2A2766}.mz[data-theme="dark"] .blue{--accent:#9DB4FF;--tint:#1E2A5E}
.mz[data-theme="dark"] .lilac{--accent:#C9BEFF;--tint:#2C2465}

/* Money meaning: green in, red out */
.mz .flow-in{background:var(--pos)}.mz .flow-out{background:#E58A9C}
.mz .collection-bar{background:var(--pos-50)}.mz .collection-bar i{background:var(--neg)}

/* Page headings with a quiet brand accent */
.mz .page-head .micro,.mz .eyebrow{color:var(--royal)}
.mz .dashboard-head h1>span{color:var(--violet)}
.mz .tbl th{color:var(--ink-3)}
.mz .pill.ok{background:var(--pos-50);color:var(--pos)}
.mz ::selection{background:#DCD9F6}
.mz .side ::-webkit-scrollbar-thumb{background:#4A43A0}
`;
