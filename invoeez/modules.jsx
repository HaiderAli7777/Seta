/* ============================================================================
   3.25 — module colours. Each module wears the colour of its icon: inside
   Sales the buttons, links, tabs, focus rings and selection are blue,
   Purchase is violet, Inventory orange, Accounting green, Bank & cash cyan,
   VAT rose, Reports indigo, Contacts pink, Companies amber, Users & access
   teal and Settings slate. In the apps dashboard the top bar and the page
   banners take the module's colour as well. Home and the dashboard keep the
   company's colour theme. Settings › Appearance turns it off.
   Every pair meets WCAG AA: the colour on white and on its own tint, white on
   the colour, and the dark-mode tint on dark surfaces.
   ========================================================================== */
const MODULE_COLORS = {
  sales:      { m: "#1D4ED8", l: "#7AAEFF", hi: "#60A5FA", deep: "#0B1F57" },
  purchase:   { m: "#6D28D9", l: "#B9A2FF", hi: "#A78BFA", deep: "#2A1166" },
  inventory:  { m: "#C2410C", l: "#FDBA74", hi: "#FDBA74", deep: "#4A1A07" },
  accounting: { m: "#047857", l: "#34D399", hi: "#34D399", deep: "#053B2C" },
  bank:       { m: "#0E7490", l: "#22D3EE", hi: "#22D3EE", deep: "#083A4A" },
  vat:        { m: "#BE123C", l: "#FB7185", hi: "#FB7185", deep: "#4C0717" },
  reports:    { m: "#4338CA", l: "#A5B4FC", hi: "#A5B4FC", deep: "#1B1764" },
  contacts:   { m: "#BE185D", l: "#F472B6", hi: "#F472B6", deep: "#4D0A27" },
  org:        { m: "#A14A07", l: "#FBBF24", hi: "#FBBF24", deep: "#452006" },
  users:      { m: "#0F766E", l: "#2DD4BF", hi: "#2DD4BF", deep: "#06302D" },
  settings:   { m: "#334155", l: "#94A3B8", hi: "#94A3B8", deep: "#141A23" },
};
const MODCOLOR_KEY = "mizan.modcolors";
const readModColors = () => { try { return window.localStorage.getItem(MODCOLOR_KEY) !== "off"; } catch (e) { return true; } };
/* The module a screen belongs to, for its colour: the app it was opened from, else the screen's home app. Home and the dashboard have none. */
function moduleOf(view, curApp) {
  const id = curApp ? curApp.id : view && view !== "home" ? primaryAppOf(view) : null;
  return id && MODULE_COLORS[id] ? id : null;
}
/* A small round chip in a module's colour, for lists that name modules. */
const modTone = (id, dark) => (MODULE_COLORS[id] ? (dark ? MODULE_COLORS[id].l : MODULE_COLORS[id].m) : "var(--brand)");

/* Screen only: a printed invoice or report keeps the company's own colours. */
const MODCOLOR_CSS = "@media screen{\n" + Object.entries(MODULE_COLORS).map(([k, c]) => `.mz[data-module="${k}"]{--m:${c.m};--m-l:${c.l};--m-hi:${c.hi};--m-deep:${c.deep}}`).join("\n") + `
/* the module's colour carries actions, links, focus and selection (doubled class: it outranks every colour theme) */
.mz.mz[data-module]{
  --brand:var(--m);--brand-600:color-mix(in srgb,var(--m) 82%,#000);--brand-50:color-mix(in srgb,var(--m) 8%,#fff);--brand-100:color-mix(in srgb,var(--m) 18%,#fff);
  --ring:0 0 0 3px color-mix(in srgb,var(--m) 22%,transparent);--sel:color-mix(in srgb,var(--m) 18%,#fff);
  --pri-a:color-mix(in srgb,var(--m) 86%,#fff);--pri-b:var(--m);--pri-ha:color-mix(in srgb,var(--m) 93%,#fff);--pri-hb:color-mix(in srgb,var(--m) 86%,#000);
  --pri-sh:color-mix(in srgb,var(--m) 32%,transparent);--pri-txt:#fff;--c1:var(--m);--s1:var(--m);
}
.mz.mz[data-theme="dark"][data-module]{
  --brand:var(--m-l);--brand-600:color-mix(in srgb,var(--m-l) 78%,#fff);--brand-50:color-mix(in srgb,var(--m-l) 13%,var(--surface));--brand-100:color-mix(in srgb,var(--m-l) 22%,var(--surface));
  --ring:0 0 0 3px color-mix(in srgb,var(--m-l) 30%,transparent);--sel:color-mix(in srgb,var(--m-l) 24%,var(--surface));--c1:var(--m-l);--s1:var(--m-l);
}
/* apps dashboard: the top bar and the page banners in the module's colour, deep to bright */
.mz.mz[data-nav="apps"][data-module]{--sb-1:color-mix(in srgb,var(--m) 42%,var(--m-deep));--sb-2:var(--m-deep);--sb-acc:var(--m-hi);
  --hdr-1:var(--m-deep);--hdr-2:color-mix(in srgb,var(--m) 42%,var(--m-deep));--hdr-3:var(--m)}
.mz.mz[data-nav="apps"][data-theme="dark"][data-module]{--hdr-1:color-mix(in srgb,var(--m-deep) 80%,#000);--hdr-3:color-mix(in srgb,var(--m) 80%,var(--m-deep))}
/* sidebar mode: the sidebar stays in the company's colour; the open screen's module marks its menu item */
.mz[data-module] .sb-row.on,.mz[data-module] .sb-fly-row.on{box-shadow:inset 3px 0 0 var(--m-hi)}
}
/* the modules' own colours, wherever a module is named */
.mz .mod-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--md,var(--brand));flex:0 0 8px}
.mod-row .st{min-width:0}.mod-dots{display:flex!important;gap:5px;margin-top:8px}.mod-dots .mod-dot{width:12px;height:12px;flex-basis:12px;box-shadow:0 0 0 2px var(--surface),0 0 0 3px var(--line)}
.mz .mod-sw{display:inline-flex;align-items:center;flex:0 0 auto;padding:4px;border-radius:12px}
`;
