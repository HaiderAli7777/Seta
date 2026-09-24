import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Banknote, ChevronDown, Heart, Mail, MapPin, Menu, MessageCircle, Package, Phone, RotateCcw, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Truck, User, X, Zap } from "lucide-react";
import { CATEGORIES } from "./catalog/logic.mjs";

const META = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
const telHref = phone => `tel:${String(phone || "").replace(/[^+\d]/g, "")}`;
const waHref = phone => `https://wa.me/${String(phone || "").replace(/\D/g, "")}`;

/* Hand-drawn product silhouettes for the categories that have no studio cutout yet.
   Drawn in currentColor so each tile tints them to its own tone. */
function RamArt() {
  return <svg viewBox="0 0 320 120" className="rv-art-svg" aria-hidden="true">
    <rect x="8" y="14" width="304" height="78" rx="6" fill="currentColor" opacity=".9" />
    <rect x="8" y="14" width="304" height="12" rx="6" fill="#fff" opacity=".12" />
    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <rect key={i} x={22 + i * 36} y="36" width="28" height="36" rx="3" fill="#fff" opacity=".16" />)}
    <path d="M8 92h304v10H8z" fill="currentColor" opacity=".55" />
    {Array.from({ length: 36 }).map((_, i) => i === 17 ? null : <rect key={i} x={14 + i * 8.3} y="94" width="5" height="14" rx="1" fill="currentColor" opacity=".75" />)}
  </svg>;
}
function DriveArt() {
  return <svg viewBox="0 0 220 220" className="rv-art-svg drive" aria-hidden="true">
    <rect x="30" y="20" width="160" height="186" rx="22" fill="currentColor" opacity=".92" />
    <rect x="30" y="20" width="160" height="186" rx="22" fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="2" />
    <circle cx="110" cy="102" r="52" fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="2" />
    <circle cx="110" cy="102" r="30" fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth="2" />
    <circle cx="110" cy="102" r="7" fill="#fff" opacity=".22" />
    <rect x="96" y="176" width="28" height="6" rx="3" fill="#7fb0ff" />
  </svg>;
}
const ART = {
  keyboard: { img: "./assets/slides/slide-keyboard-700.webp", tone: "cobalt" },
  mouse: { img: "./assets/slides/slide-mouse-700.webp", tone: "ice" },
  audio: { img: "./assets/slides/slide-headphones-700.webp", tone: "ice" },
  ram: { Svg: RamArt, tone: "graphite" },
  drives: { Svg: DriveArt, tone: "steel" },
};

export function StoreHeader({ config, products, categories, active, special, cartCount, wishCount, onHome, onShop, onSpecial, onProduct, onSearch, onCart, onWish, onAccount, onMenu, onTrade, onFinder, money }) {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(-1);
  const headerRef = useRef(null);
  const searchRef = useRef(null);
  const matches = search.trim() ? products.filter(p => p.active && search.trim().toLowerCase().split(/\s+/).every(term => [p.name, p.brand, p.sku, p.tags?.join(" ")].join(" ").toLowerCase().includes(term))).slice(0, 6) : [];
  const chooseProduct = p => { setFocused(false); setSearch(""); setSelected(-1); onProduct(p.id); };
  const searchKey = e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); setFocused(true);
      if (matches.length) setSelected(i => e.key === "ArrowDown" ? (i + 1) % matches.length : i < 0 ? matches.length - 1 : (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" && focused && selected >= 0 && matches[selected]) {
      e.preventDefault(); chooseProduct(matches[selected]);
    } else if (e.key === "Escape") { setFocused(false); setSelected(-1); }
  };
  useEffect(() => {
    const close = e => { if (!headerRef.current?.contains(e.target)) setFocused(false); };
    const key = e => {
      if (e.key === "Escape") setFocused(false);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", key); };
  }, []);
  const submit = e => { e.preventDefault(); if (!search.trim()) return; onSearch(search.trim()); setFocused(false); setSearch(""); };
  const shopping = active === "shop" && special === "none";
  return <header className="rv-header" ref={headerRef}>
    <div className="ed-wrap rv-mast">
      <button className="rv-brand" onClick={onHome} aria-label={`${config.storeName} home`}>
        {config.logoUrl ? <img src={config.logoUrl} alt="" width="58" height="32" /> : <Zap size={30} />}
        <span>{config.storeName}<small>{config.storeSub}</small></span>
      </button>
      <form className="rv-search" role="search" onSubmit={submit} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) { setFocused(false); setSelected(-1); } }}>
        <Search size={18} aria-hidden="true" />
        <input ref={searchRef} type="search" role="combobox" aria-label="Search products" aria-autocomplete="list" aria-expanded={!!(focused && search.trim())} aria-controls="ed-product-suggestions" aria-activedescendant={focused && selected >= 0 && matches[selected] ? `ed-suggestion-${selected}` : undefined} placeholder="Search mice, keyboards, RAM, drives…" value={search} onChange={e => { setSearch(e.target.value); setFocused(true); setSelected(-1); }} onKeyDown={searchKey} onFocus={() => setFocused(true)} autoComplete="off" />
        {search ? <button className="rv-search-go" aria-label="Search catalog" type="submit"><ArrowRight size={17} /></button> : <kbd>Ctrl K</kbd>}
        {focused && search.trim() && <div className="rv-suggest">
          <div className="rv-label">{matches.length ? "Products" : "Search the catalogue"}</div>
          <div id="ed-product-suggestions" role="listbox" aria-label="Matching products">{matches.map((p, i) => <button type="button" role="option" aria-selected={selected === i} id={`ed-suggestion-${i}`} tabIndex={-1} key={p.id} onMouseDown={e => e.preventDefault()} onClick={() => chooseProduct(p)}>
            <span className="rv-suggest-media">{p.image ? <img src={p.image} alt="" /> : <Package size={20} />}</span>
            <span className="rv-suggest-name"><b>{p.name}</b><small>{p.brand} · {META[p.category]?.label || p.category}</small></span><strong>{money(p)}</strong>
          </button>)}</div>
          {!matches.length && <p>Nothing matches “{search}” yet. Try a brand, a model number or a category.</p>}
          <button className="rv-all-results" type="submit">See all results for “{search}” <ArrowRight size={16} /></button>
          <span className="ed-sr-only" role="status">{matches.length} product suggestions</span>
        </div>}
      </form>
      <div className="rv-actions">
        <button className="rv-act rv-hide-sm" onClick={onAccount} aria-label="My account"><User size={20} /><span>Account</span></button>
        <button className="rv-act" onClick={onWish} aria-label={`Wishlist${wishCount ? `, ${wishCount} saved` : ""}`}><Heart size={20} />{wishCount > 0 && <b className="rv-dot">{wishCount}</b>}<span className="rv-hide-md">Saved</span></button>
        <button className="rv-bag" onClick={onCart} aria-label={`Shopping bag, ${cartCount} items`}><ShoppingBag size={19} /><span>Bag</span><b>{cartCount}</b></button>
        <button className="rv-act rv-burger" onClick={onMenu} aria-label="Open menu"><Menu size={22} /></button>
      </div>
    </div>
    <div className="rv-navline"><nav className="ed-wrap rv-nav" aria-label="Main navigation">
      <button className={shopping ? "on" : ""} onClick={() => onShop("All")}>All products</button>
      {categories.slice(0, 7).map(c => <button key={c.id} onClick={() => onShop(c.id)}>{META[c.id]?.plural || c.label}</button>)}
      <span className="rv-nav-sep" aria-hidden="true" />
      <button className={active === "shop" && special === "new" ? "on" : ""} onClick={() => onSpecial("new")}>New in</button>
      <button className={(active === "shop" && special === "deals" ? "on " : "") + "rv-nav-deals"} onClick={() => onSpecial("deals")}><Zap size={13} /> Offers</button>
      <span className="rv-nav-right">
        <button className="rv-nav-finder" onClick={onFinder}><SlidersHorizontal size={14} /> Find my upgrade</button>
        <button onClick={onTrade}>Business & wholesale <ArrowUpRight size={14} /></button>
      </span>
    </nav></div>
  </header>;
}

export function TrustBar({ config }) {
  const items = [
    [Banknote, "Cash on delivery", "Pay when your parcel arrives"],
    [Truck, "Delivery across Pakistan", "Standard, Express or Same-day"],
    [ShieldCheck, "Genuine stock", "Every unit checked before dispatch"],
    [RotateCcw, `${config.returnWindowDays || 7}-day returns`, "In original packaging"],
  ];
  return <section className="ed-wrap" aria-label="Why shop with us"><div className="rv-trust">
    {items.map(([I, t, s]) => <div key={t}><span className="rv-trust-ic"><I size={20} strokeWidth={1.7} /></span><span><b>{t}</b><small>{s}</small></span></div>)}
  </div></section>;
}

export function CollectionGrid({ categories, onShop, count }) {
  const order = ["keyboard", "mouse", "audio", "ram", "drives"];
  const known = order.map(id => categories.find(c => c.id === id)).filter(Boolean);
  const extra = categories.filter(c => !c.parentId && !order.includes(c.id));
  const total = known.reduce((n, c) => n + (count(c.id) || 0), 0);
  return <section className="rv-section rv-collections reveal"><div className="ed-wrap">
    <div className="rv-head">
      <div><span className="rv-eyebrow">Shop by category</span><h2>Everything for the desk, <em>nothing you don't need.</em></h2></div>
      <button className="rv-textlink" onClick={() => onShop("All")}>Browse all {total || ""} products <ArrowRight size={16} /></button>
    </div>
    <div className="rv-cat-grid">
      {known.map((c, i) => {
        const m = META[c.id] || {}, art = ART[c.id] || {};
        const Svg = art.Svg;
        return <button key={c.id} className={`rv-cat rv-cat-${c.id} tone-${art.tone || "ice"}`} onClick={() => onShop(c.id)}>
          <span className="rv-cat-top"><span className="rv-cat-idx">{String(i + 1).padStart(2, "0")}</span><span className="rv-cat-count">{count(c.id) ? `${count(c.id)} products` : "Explore"}</span></span>
          <span className="rv-cat-art" aria-hidden="true">{art.img ? <img src={art.img} alt="" loading="lazy" width="700" height="525" /> : Svg ? <Svg /> : null}</span>
          <span className="rv-cat-copy"><strong>{m.plural || c.label}</strong><span>{m.tagline || c.blurb}</span></span>
          <span className="rv-cat-go" aria-hidden="true"><ArrowUpRight size={18} /></span>
        </button>;
      })}
    </div>
    {extra.length > 0 && <div className="rv-cat-extra">{extra.map(c => <button key={c.id} onClick={() => onShop(c.id)}>{c.label}<ArrowUpRight size={15} /></button>)}</div>}
  </div></section>;
}

export function BudgetShelf({ products, priceOf, money, onBudget }) {
  const live = products.filter(p => p.active);
  if (!live.length) return null;
  const bands = [
    ["Under 2,000", 0, 2000, "Everyday mice, headsets and keypads"],
    ["2,000 – 7,500", 2000, 7500, "Gaming mice, microphones, memory"],
    ["7,500 – 20,000", 7500, 20000, "Portable drives and bigger RAM kits"],
    ["20,000 and up", 20000, 0, "High-capacity and enterprise storage"],
  ].map(([label, lo, hi, note]) => ({ label, lo, hi, note, n: live.filter(p => { const v = priceOf(p); return v >= lo && (!hi || v < hi); }).length })).filter(b => b.n > 0);
  const min = Math.min(...live.map(priceOf));
  return <section className="rv-section rv-budget reveal"><div className="ed-wrap">
    <div className="rv-head">
      <div><span className="rv-eyebrow">Shop by budget</span><h2>Set a number. <em>We'll show what fits.</em></h2></div>
      <span className="rv-head-note">Prices in PKR, from {money(min)}</span>
    </div>
    <div className="rv-budget-row">
      {bands.map((b, i) => <button key={b.label} onClick={() => onBudget(b.lo, b.hi)}>
        <span className="rv-budget-tier" aria-hidden="true">{[0, 1, 2, 3].map(k => <i key={k} className={k <= i ? "on" : ""} />)}</span>
        <strong><small>Rs</small> {b.label}</strong>
        <span className="rv-budget-note">{b.note}</span>
        <span className="rv-budget-n">{b.n} products <ArrowRight size={15} /></span>
      </button>)}
    </div>
  </div></section>;
}

export function BrandWall({ products, onBrand }) {
  const counts = {};
  products.filter(p => p.active).forEach(p => { counts[p.brand] = (counts[p.brand] || 0) + 1; });
  const brands = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (brands.length < 3) return null;
  return <section className="rv-section rv-brands reveal" aria-labelledby="rv-brands-title"><div className="ed-wrap">
    <div className="rv-head">
      <div><span className="rv-eyebrow">Brands we stock</span><h2 id="rv-brands-title">Names you know. <em>Prices in rupees.</em></h2></div>
    </div>
    <div className="rv-brand-grid">
      {brands.map(([name, n]) => <button key={name} onClick={() => onBrand(name)}><span>{name}</span><small>{n} {n === 1 ? "product" : "products"}</small></button>)}
    </div>
    <p className="rv-fineprint">Brand names are trademarks of their owners and are shown only to identify the products we sell.</p>
  </div></section>;
}

export function FinderBand({ onFinder, onCompare }) {
  return <section className="ed-wrap rv-finder reveal"><div className="rv-finder-in">
    <div className="rv-finder-copy">
      <span className="rv-eyebrow light">Not sure what to pick?</span>
      <h2>Answer three questions.<br /><em>Get a short list.</em></h2>
      <p>Choose a category, set your budget and say whether you need it in stock today. The finder does the filtering for you.</p>
      <div className="rv-finder-cta">
        <button className="rv-btn light" onClick={onFinder}><SlidersHorizontal size={17} /> Find my upgrade</button>
        {onCompare && <button className="rv-btn ghost-light" onClick={onCompare}>Compare products <ArrowRight size={16} /></button>}
      </div>
    </div>
    <ol className="rv-finder-steps" aria-label="How the finder works">
      <li><b>01</b><span>Pick a category</span><small>Mouse, keyboard, audio, memory or storage</small></li>
      <li><b>02</b><span>Set your budget</span><small>Only products under your number</small></li>
      <li><b>03</b><span>See what fits</span><small>Sorted, compared and ready to order</small></li>
    </ol>
  </div></section>;
}

export function RestockRequest({ config, onNotify }) {
  const [email, setEmail] = useState("");
  const [opened, setOpened] = useState(false);
  const submit = e => {
    e.preventDefault();
    if (!e.currentTarget.reportValidity()) return;
    window.location.href = `mailto:${config.storeEmail}?subject=${encodeURIComponent("Restock and product updates")}&body=${encodeURIComponent(`Hello ${config.storeName},\n\nPlease let me know about new arrivals and restocks. My email address is ${email}.\n\nThank you.`)}`;
    setOpened(true);
    onNotify("Your email app is opening. Send the request to finish.");
  };
  return <section className="ed-wrap rv-contact reveal">
    <div className="rv-contact-card">
      <span className="rv-eyebrow">Stay one upgrade ahead</span>
      <h2>Hear about restocks <em>before they sell out.</em></h2>
      <form onSubmit={submit}>
        <label htmlFor="ed-restock-email" className="ed-sr-only">Your email address</label>
        <div className="rv-email"><Mail size={18} /><input id="ed-restock-email" type="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={e => { setEmail(e.target.value); setOpened(false); }} /><button type="submit">Notify me <ArrowRight size={16} /></button></div>
        <small aria-live="polite">{opened ? "Send the message in your email app to complete your request." : "Opens an email to our team. Nothing is sent until you press send."}</small>
      </form>
    </div>
    <a className="rv-contact-card rv-wa" href={waHref(config.storePhone)} target="_blank" rel="noopener noreferrer">
      <span className="rv-eyebrow light">Talk to a person</span>
      <h2>Questions? <em>Ask us on WhatsApp.</em></h2>
      <span className="rv-wa-line"><MessageCircle size={20} /> {config.storePhone}<ArrowUpRight size={18} /></span>
    </a>
  </section>;
}

export function StoreFooter({ config, categories, onHome, onShop, onSpecial, onAccount, onTrack, onTrade, onConsole, onInfo }) {
  return <footer className="rv-footer"><div className="ed-wrap">
    <div className="rv-foot-top">
      <div className="rv-foot-brand">
        <button className="rv-brand light" onClick={onHome} aria-label={`${config.storeName} home`}><img src="./assets/brand/epic-mark-light.svg" alt="" width="58" height="32" /><span>{config.storeName}<small>{config.storeSub}</small></span></button>
        <p>Mice, keyboards, audio, memory and storage from the brands you trust, priced in rupees and delivered across Pakistan.</p>
        <div className="rv-foot-contact">
          <a href={telHref(config.storePhone)}><Phone size={15} /> {config.storePhone}</a>
          <a href={`mailto:${config.storeEmail}`}><Mail size={15} /> {config.storeEmail}</a>
          {config.storeAddress && <span><MapPin size={15} /> {config.storeAddress}</span>}
        </div>
      </div>
      <div className="rv-foot-col"><h3>Shop</h3><button onClick={() => onShop("All")}>All products</button>{categories.filter(c => !c.parentId).slice(0, 6).map(c => <button key={c.id} onClick={() => onShop(c.id)}>{META[c.id]?.plural || c.label}</button>)}</div>
      <div className="rv-foot-col"><h3>Discover</h3><button onClick={() => onSpecial("new")}>New arrivals</button><button onClick={() => onSpecial("deals")}>Offers</button><button onClick={onTrade}>Business & wholesale</button><button onClick={() => onInfo("about")}>About EPIC</button></div>
      <div className="rv-foot-col"><h3>Help</h3><button onClick={onTrack}>Track an order</button><button onClick={onAccount}>My orders</button><button onClick={() => onInfo("returns")}>Returns & warranty</button><button onClick={() => onInfo("contact")}>Contact us</button><button onClick={() => onInfo("privacy")}>Privacy</button></div>
    </div>
    <div className="rv-foot-word" aria-hidden="true">EPIC DEVICES</div>
    <div className="rv-foot-bottom"><span>© {new Date().getFullYear()} {config.storeName}. All rights reserved.</span><div><span>Prices in PKR · Cash on delivery available</span><button onClick={onConsole}>Store console <ArrowUpRight size={12} /></button></div></div>
  </div></footer>;
}

export function StoreInfo({ topic, onClose, config }) {
  const dialog = useRef(null);
  useEffect(() => {
    if (!topic) return;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const key = e => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = dialog.current?.querySelectorAll('button, a[href], input, [tabindex="0"]');
        if (!nodes?.length) return;
        if (e.shiftKey && (document.activeElement === nodes[0] || document.activeElement === dialog.current)) { e.preventDefault(); nodes[nodes.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === nodes[nodes.length - 1]) { e.preventDefault(); nodes[0].focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", key); previous?.focus(); };
  }, [topic]);
  if (!topic) return null;
  const title = { returns: "Returns & warranty", contact: "Come say hello.", about: "Your everyday, upgraded.", privacy: "Your information" }[topic];
  return <div className="ed-dialog-overlay" onClick={onClose}><section className="ed-dialog" role="dialog" aria-modal="true" aria-labelledby="ed-dialog-title" tabIndex={-1} ref={dialog} onClick={e => e.stopPropagation()}><button className="ed-dialog-close" onClick={onClose} aria-label="Close information"><X size={20} /></button><span className="ed-kicker">{config.storeName}</span><h2 id="ed-dialog-title">{title}</h2>
    {topic === "returns" && <><p>The current return window is {config.returnWindowDays} days. Contact our team with your order reference and the reason for your request.</p><p>Warranty coverage varies by product. Check the product details and confirm coverage with our team before you buy.</p></>}
    {topic === "contact" && <><p><MapPin size={19} /> {config.storeAddress}</p><p>{config.deliveries ? "Ask our team about collection and delivery options." : "Orders are available for store collection. Please contact us to confirm availability and collection time."}</p><a href={`tel:${config.storePhone.replace(/[^+\d]/g, "")}`}>{config.storePhone}</a></>}
    {topic === "about" && <><p>{config.storeName} is a Lahore computer-accessories store: mice, keyboards, headsets and microphones, memory and storage from Logitech, A4Tech, Rapoo, Corsair, Kingston, Seagate, WD and more.</p><p>Every product is priced in rupees, delivered across Pakistan and can be paid for on delivery. Buying for an office or a shop? Ask about business and wholesale pricing.</p></>}
    {topic === "privacy" && <><p>When you place an order, the details you enter are saved on our server so we can deliver it and you can track it. Order tracking shows the status only, never your name, phone or address.</p><p>Contact and product-update links open your email, phone or WhatsApp app. A message reaches the team only after you send it.</p></>}
    <a className="ed-button" href={`mailto:${config.storeEmail}`}>Contact the team <ArrowUpRight size={18} /></a>
  </section></div>;
}
