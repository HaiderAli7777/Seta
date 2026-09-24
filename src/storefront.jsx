import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Headphones, Heart, Layers, Mail, MapPin, Menu, Minus, Package, Pause, Play, Plus, Search, ShieldCheck, ShoppingBag, Store, Truck, User, X, Zap } from "lucide-react";


export function StoreHeader({ config, products, categories, active, special, cartCount, wishCount, onHome, onShop, onSpecial, onProduct, onSearch, onCart, onWish, onAccount, onMenu, onTrade, onFinder, money }) {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selected, setSelected] = useState(-1);
  const headerRef = useRef(null);
  const searchRef = useRef(null);
  const matches = search.trim() ? products.filter(p => p.active && search.trim().toLowerCase().split(/\s+/).every(term => [p.name, p.brand, p.sku, p.tags?.join(" ")].join(" ").toLowerCase().includes(term))).slice(0, 5) : [];
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
    const close = e => { if (!headerRef.current?.contains(e.target)) { setFocused(false); setCategoryOpen(false); } };
    const key = e => {
      if (e.key === "Escape") { setCategoryOpen(false); setFocused(false); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", key); };
  }, []);
  const submit = e => { e.preventDefault(); if (!search.trim()) return; onSearch(search.trim()); setFocused(false); setSearch(""); };
  return <header className="ed-header" ref={headerRef}>
    <div className="ed-masthead ed-wrap">
      <button className="ed-brand" onClick={onHome} aria-label={`${config.storeName} home`}>
        {config.logoUrl ? <img src={config.logoUrl} alt="" width="62" height="36" /> : <Zap size={34} />}
        <span>{config.storeName}<small>{config.storeSub}</small></span>
      </button>
      <form className="ed-search" role="search" onSubmit={submit} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) { setFocused(false); setSelected(-1); } }}>
        <Search size={20} aria-hidden="true" />
        <input ref={searchRef} type="search" role="combobox" aria-label="Search products" aria-autocomplete="list" aria-expanded={!!(focused && search.trim())} aria-controls="ed-product-suggestions" aria-activedescendant={focused && selected >= 0 && matches[selected] ? `ed-suggestion-${selected}` : undefined} placeholder="Find your next upgrade…" value={search} onChange={e => { setSearch(e.target.value); setFocused(true); setSelected(-1); }} onKeyDown={searchKey} onFocus={() => setFocused(true)} autoComplete="off" />
        {search ? <button className="ed-search-go" aria-label="Search catalog" type="submit"><ArrowRight size={18} /></button> : <kbd>Ctrl K</kbd>}
        {focused && search.trim() && <div className="ed-suggestions">
          <div className="ed-search-label">{matches.length ? "PRODUCTS" : "SEARCH THE CATALOG"}</div>
          <div id="ed-product-suggestions" role="listbox" aria-label="Matching products">{matches.map((p, i) => <button type="button" role="option" aria-selected={selected === i} id={`ed-suggestion-${i}`} tabIndex={-1} key={p.id} onMouseDown={e => e.preventDefault()} onClick={() => chooseProduct(p)}>
            {p.image ? <img src={p.image} alt="" /> : <Package size={24} />}
            <span><b>{p.name}</b><small>{p.brand}</small></span><strong>{money(p)}</strong>
          </button>)}</div>
          {!matches.length && <p>No products match “{search}”. Try another name or browse a category.</p>}
          <button className="ed-all-results" type="submit">Search for “{search}” <ArrowRight size={16} /></button>
          {!!matches.length && <div className="ed-search-hint">↑ ↓ to explore · Enter to open · Esc to close</div>}
          <span className="ed-sr-only" role="status">{matches.length} product suggestions</span>
        </div>}
      </form>
      <div className="ed-header-actions">
        <button className="ed-action account" onClick={onAccount} aria-label="My account"><User size={21} /><span>My account</span></button>
        <button className="ed-action" onClick={onWish} aria-label="Wishlist"><Heart size={21} />{wishCount > 0 && <b className="ed-count">{wishCount}</b>}</button>
        <span className="ed-action-divider" />
        <button className="ed-action bag" onClick={onCart} aria-label="Shopping bag"><ShoppingBag size={21} /><span>Bag</span><b className="ed-bag-count">{cartCount}</b></button>
        <button className="ed-action ed-mobile-menu" onClick={onMenu} aria-label="Open menu"><Menu size={23} /></button>
      </div>
    </div>
    <div className="ed-navline"><nav className="ed-wrap ed-navigation" aria-label="Main navigation">
      <button className={active === "home" ? "active" : ""} onClick={onHome}>Home</button>
      <button className={active === "shop" && special === "none" ? "active" : ""} onClick={() => onShop("All")}>Shop all</button>
      <div className="ed-category-menu">
        <button aria-expanded={categoryOpen} aria-controls="ed-categories" onClick={() => setCategoryOpen(!categoryOpen)}>Categories <ChevronDown size={14} /></button>
        {categoryOpen && <div id="ed-categories" className="ed-megamenu"><div className="ed-search-label">FIND YOUR EVERYDAY ESSENTIALS</div>
          {categories.map(c => <button key={c.id} onClick={() => { setCategoryOpen(false); onShop(c.id); }}><span>{c.label}<small>{c.blurb}</small></span><ArrowUpRight size={17} /></button>)}
          <button className="ed-all-results" onClick={() => { setCategoryOpen(false); onShop("All"); }}>Explore the full collection <ArrowRight size={17} /></button>
        </div>}
      </div>
      <button className={active === "shop" && special === "new" ? "active" : ""} onClick={() => onSpecial("new")}>New arrivals</button>
      <button className={(active === "shop" && special === "deals" ? "active " : "") + "ed-deals-link"} onClick={() => onSpecial("deals")}><Zap size={14} /> Offers</button>
      <button className="ed-nav-finder" onClick={onFinder}><Search size={14} /> Find my upgrade</button>
      <button className="ed-trade-link" onClick={onTrade}>For your business <ArrowUpRight size={15} /></button>
    </nav></div>
  </header>;
}

export function CollectionGrid({ categories, onShop, count }) {
  const wanted = ["grp_laptops", "Headphones", "Keyboards", "Mice", "Chargers & Adapters", "Cables & Hubs"];
  const cards = wanted.map(id => categories.find(c => c.id === id)).filter(Boolean);
  const names = { grp_laptops: "Laptops", "Chargers & Adapters": "Power & charging", "Cables & Hubs": "Cables & hubs" };
  return <section className="ed-section ed-collections"><div className="ed-wrap">
    <div className="ed-section-heading"><div><span className="ed-kicker">FIND YOUR NEXT FAVORITE</span><h2>A little upgrade.<br className="ed-mobile-break" /> A lot of possibility.</h2></div><button className="ed-text-link" onClick={() => onShop("All")}>Shop all categories <ArrowUpRight size={17} /></button></div>
    <div className="ed-category-grid">{cards.map((c, i) => <button className="ed-category" key={c.id} onClick={() => onShop(c.id)}>
      <div className="ed-category-visual"><span className="ed-category-index">0{i + 1}</span>{c.image && !c.image.startsWith("data:image/svg+xml,") ? <img src={c.image} alt="" loading="lazy" width="800" height="500" /> : <span className="ed-category-photo" style={{ backgroundPosition: `${(wanted.indexOf(c.id) % 3) * 50}% ${wanted.indexOf(c.id) > 2 ? 100 : 0}%` }} />}<span className="ed-category-arrow"><ArrowUpRight size={16} /></span></div>
      <strong>{names[c.id] || c.label}</strong><span>{count(c.id) ? `${count(c.id)} products to explore` : "Explore the collection"}</span>
    </button>)}</div>
  </div></section>;
}

export function CollectionSpotlights({ categories, onShop }) {
  const desk = categories.find(c => c.id === "grp_desk");
  return <section className="ed-section ed-spotlights"><div className="ed-wrap"><div className="ed-section-heading"><div><span className="ed-kicker">MADE FOR YOUR EVERYDAY</span><h2>Find your kind of epic.</h2></div></div>
    <div className="ed-spotlight-grid">
      <button className="ed-spotlight desk" onClick={() => onShop("grp_desk")}><div><span className="ed-kicker">THE WORKSPACE EDIT</span><h3>Make work<br />feel less like work.</h3><span className="ed-spotlight-link">Upgrade your desk <ArrowUpRight size={18} /></span></div><span className="ed-desk-photo" /></button>
      <button className="ed-spotlight audio" onClick={() => onShop("Headphones")}><img src="./assets/epic-hero.webp" alt="" width="1536" height="1024" loading="lazy" /><div><span className="ed-kicker">YOUR WORLD. YOUR SOUND.</span><h3>More music.<br />Less everything else.</h3><span className="ed-spotlight-link">Find your sound <ArrowUpRight size={18} /></span></div></button>
    </div>
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
  return <section className="ed-wrap ed-restock-wrap"><div className="ed-restock">
    <div><span className="ed-kicker">STAY ONE UPGRADE AHEAD</span><h2>Good things are<br />worth hearing about.</h2><p>Ask our team about new arrivals, restocks and your next great find.</p></div>
    <form onSubmit={submit}><label htmlFor="ed-restock-email">Where can we reach you?</label><div className="ed-email-field"><Mail size={20} /><input id="ed-restock-email" type="email" autoComplete="email" placeholder="Your email address" required value={email} onChange={e => { setEmail(e.target.value); setOpened(false); }} /><button type="submit" aria-label="Request product updates"><ArrowRight size={21} /></button></div><small aria-live="polite">{opened ? "Send the message in your email app to complete your request." : "Opens an email request to our team. Send it when you're ready."}</small></form>
  </div></section>;
}

export function StoreFooter({ config, categories, onHome, onShop, onSpecial, onAccount, onTrack, onTrade, onConsole, onInfo }) {
  return <footer className="ed-footer"><div className="ed-wrap">
    <div className="ed-footer-top"><div className="ed-footer-brand"><button className="ed-brand" onClick={onHome}>{config.logoUrl && <img src={config.logoUrl} alt="" width="62" height="36" />}<span>{config.storeName}<small>{config.storeSub}</small></span></button><p>Good tech for the way you live.<br />Find your next upgrade with us.</p><a href={`mailto:${config.storeEmail}`} className="ed-contact">{config.storeEmail}<ArrowUpRight size={16} /></a></div>
      <div><h3>Explore</h3><button onClick={() => onShop("All")}>Shop all products</button><button onClick={() => onSpecial("new")}>New arrivals</button><button onClick={() => onSpecial("deals")}>Latest offers</button><button onClick={onTrade}>For your business</button></div>
      <div><h3>Make it yours</h3>{categories.filter(c => !c.parentId).slice(0, 5).map(c => <button key={c.id} onClick={() => onShop(c.id)}>{c.label}</button>)}</div>
      <div><h3>We're here to help</h3><button onClick={onAccount}>My orders</button><button onClick={onTrack}>Track an order</button><button onClick={() => onInfo("returns")}>Returns & warranty</button><button onClick={() => onInfo("contact")}>Visit & contact us</button><button onClick={onConsole}>Store console <ArrowUpRight size={12} /></button></div>
    </div>
    <div className="ed-footer-location"><MapPin size={17} /><span>{config.storeAddress}</span><a href={`tel:${config.storePhone.replace(/[^+\d]/g, "")}`}>{config.storePhone}</a></div>
    <div className="ed-footer-bottom"><span>© {new Date().getFullYear()} {config.storeName}. All rights reserved.</span><div><button onClick={() => onInfo("about")}>About EPIC</button><button onClick={() => onInfo("privacy")}>Privacy</button><span>Made for your everyday.</span></div></div>
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
    {topic === "about" && <><p>{config.storeName} brings together devices and accessories for work, play and life in between.</p><p>Explore laptops, audio, power essentials and workspace accessories, or speak with our team about the right setup for your business.</p></>}
    {topic === "privacy" && <><p>This version runs in your browser. Shopping and console records last for the current session and are cleared when the page reloads. They are not sent to a store database.</p><p>Contact and product-update links open your email or phone app. A message reaches the team only after you send it. No online payment is processed by this version.</p></>}
    <a className="ed-button" href={`mailto:${config.storeEmail}`}>Contact the team <ArrowUpRight size={18} /></a>
  </section></div>;
}
