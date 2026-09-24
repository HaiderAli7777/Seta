import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Headphones, Heart, Keyboard, Laptop, Layers, MapPin, Minus, Package, Pause, Play, Plus, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Truck, X, Zap } from "lucide-react";
import sliderContent from "./slider-content.json";

const slides = sliderContent.slides;
const slideIcons = { audio: Headphones, workspace: Keyboard, power: Zap };
const duration = Math.max(5000, Number(sliderContent.durationMs) || 8000);

export function StoreHero({ onShop, config, onCompare, onFinder }) {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [playing, setPlaying] = useState(() => sliderContent.autoplay && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const root = useRef(null), elapsed = useRef(0), touch = useRef(null), dragged = useRef(false);
  const running = playing && !reduced && !hovered && visible && pageVisible;
  const current = slides[index];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => { setReduced(media.matches); if (media.matches) setPlaying(false); };
    const visibility = () => setPageVisible(!document.hidden);
    media.addEventListener("change", change);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(entries => setVisible(entries[0].intersectionRatio >= 0.25), { threshold: 0.25 });
    observer.observe(root.current);
    return () => { observer.disconnect(); media.removeEventListener("change", change); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  useEffect(() => {
    if (!running || slides.length < 2) return;
    let frame, last;
    const tick = time => {
      if (last !== undefined) elapsed.current += Math.min(time - last, 100);
      last = time;
      root.current?.style.setProperty("--slide-progress", Math.min(elapsed.current / duration, 1));
      if (elapsed.current >= duration) {
        elapsed.current = 0;
        root.current?.style.setProperty("--slide-progress", 0);
        setIndex(i => (i + 1) % slides.length);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const choose = target => {
    setPlaying(false);
    elapsed.current = 0;
    root.current?.style.setProperty("--slide-progress", 0);
    setIndex((target + slides.length) % slides.length);
  };
  const key = e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    choose(e.key === 'Home' ? 0 : e.key === 'End' ? slides.length - 1 : index + (e.key === 'ArrowRight' ? 1 : -1));
  };
  const swipeEnd = e => {
    if (!touch.current) return;
    const dx = e.clientX - touch.current.x, dy = e.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      dragged.current = true;
      choose(index + (dx < 0 ? 1 : -1));
    }
  };

  return <>
    <section className="ed-wrap ed-experience" ref={root} aria-roledescription="carousel" aria-label="Featured collections" onKeyDown={key}
      onFocusCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setPlaying(false); }}>
      <div className="ed-edit-heading"><span><i /> THE EPIC EDIT</span><span>Thoughtful tech. Everyday possibilities.</span><b>01 — {String(slides.length).padStart(2, '0')}</b></div>
      <div className={`ed-stage ed-stage-${current.theme}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <div className="ed-stage-panels" onPointerDown={e => { dragged.current = false; if (e.pointerType === 'touch') touch.current = { x: e.clientX, y: e.clientY }; }} onPointerUp={swipeEnd} onPointerCancel={() => { touch.current = null; }}
          onClickCapture={e => { if (dragged.current) { e.preventDefault(); e.stopPropagation(); dragged.current = false; } }}>
          {slides.map((s, i) => {
            const Icon = slideIcons[s.id] || Sparkles;
            return <div key={s.id} className={`ed-stage-panel ${index === i ? 'is-active' : ''}`} aria-hidden={index !== i} inert={index !== i ? '' : undefined} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}: ${s.label}`}>
              <div className="ed-stage-copy">
                <span className="ed-stage-eyebrow"><Icon size={15} />{s.eyebrow}</span>
                <h1>{s.title}<br /><em>{s.accent}</em></h1>
                <p>{s.description}</p>
                <div className="ed-stage-actions"><button className="ed-stage-cta" onClick={() => onShop(s.category)}>{s.cta}<ArrowUpRight size={20} /></button><button className="ed-stage-finder" onClick={() => onFinder()}><SlidersHorizontal size={16} />Find my upgrade</button></div>
                <div className="ed-stage-tags">{s.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
              </div>
              <div className="ed-stage-visual">
                <img src={s.image} srcSet={`${s.smallImage} 768w, ${s.image} 1536w`} sizes="(max-width: 760px) 100vw, 58vw" alt={s.alt} width="1536" height="1024" fetchPriority={i === 0 ? 'high' : 'low'} loading={i === 0 ? 'eager' : 'lazy'} draggable="false" />
                <span className="ed-stage-caption"><Icon size={17} />{s.detail}</span>
                <span className="ed-stage-art-note">Collection inspiration</span>
              </div>
            </div>;
          })}
        </div>
        <div className="ed-stage-utilities">
          <span className="ed-stage-counter" aria-hidden="true">0{index + 1}<i>/</i>0{slides.length}</span>
          <button onClick={() => setPlaying(p => !p)} disabled={reduced} aria-label={playing ? 'Pause slideshow' : 'Play slideshow'} title={reduced ? 'Autoplay is off for reduced motion' : playing ? 'Pause slideshow' : 'Play slideshow'} className="ed-stage-play">{playing ? <Pause size={14} /> : <Play size={14} />}<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" /></svg></button>
        </div>
        <div className="ed-stage-arrows"><button onClick={() => choose(index - 1)} aria-label="Previous collection"><ChevronLeft size={20} /></button><button onClick={() => choose(index + 1)} aria-label="Next collection"><ChevronRight size={20} /></button></div>
      </div>
      <div className="ed-slide-selector" role="group" aria-label="Choose a featured collection">{slides.map((s, i) => <button key={s.id} className={index === i ? 'is-current' : ''} onClick={() => choose(i)} aria-pressed={index === i} aria-label={`Show ${s.label}`}>
        <span className="ed-slide-thumb"><img src={s.smallImage} alt="" width="90" height="60" loading="lazy" /></span><span className="ed-slide-title"><b>{s.label}</b><small>{s.subtitle}</small></span><span className="ed-slide-number">0{i + 1}<ArrowUpRight size={16} /></span><i className="ed-slide-progress" />
      </button>)}</div>
      <p className="ed-sr-only" aria-live={running ? 'off' : 'polite'} aria-atomic="true">Collection {index + 1} of {slides.length}: {current.label}</p>
    </section>
    <div className="ed-wrap"><div className="ed-benefits">
      <div><ShieldCheck /><span>Thoughtfully selected<small>Devices for the everyday</small></span></div>
      <div>{config.deliveries ? <Truck /> : <MapPin />}<span>{config.deliveries ? 'Delivery options' : 'Collect in store'}<small>{config.deliveries ? 'Choose at checkout' : 'Plan your pickup with our team'}</small></span></div>
      <button onClick={onCompare}><Layers /><span>Details that matter<small>Compare your favorites</small></span></button>
      <button onClick={() => onFinder()}><SlidersHorizontal /><span>Find your fit<small>A little help choosing</small></span></button>
    </div></div>
  </>;
}

const finderKinds = [
  { id: 'Headphones', title: 'My sound', detail: 'Headphones for your daily soundtrack', icon: Headphones, image: 'audio' },
  { id: 'grp_laptops', title: 'My next laptop', detail: 'Work, study and everything between', icon: Laptop, image: 'workspace' },
  { id: 'grp_desk', title: 'My workspace', detail: 'Keyboards, mice and desk essentials', icon: Keyboard, image: 'workspace' },
  { id: 'grp_power', title: 'My everyday power', detail: 'Chargers, cables and power banks', icon: Zap, image: 'power' },
];

export function DiscoveryStrip({ onFinder }) {
  return <section className="ed-wrap ed-discovery-wrap"><div className="ed-discovery">
    <div className="ed-discovery-symbol"><SlidersHorizontal size={25} /><span><Sparkles size={12} /></span></div>
    <div className="ed-discovery-copy"><span className="ed-kicker">A LITTLE DIRECTION. A BETTER DECISION.</span><h2>Your next upgrade starts with you.</h2><p>Choose a collection, set your budget, and explore what fits.</p></div>
    <button className="ed-stage-cta" onClick={() => onFinder()}>Find my upgrade <ArrowRight size={18} /></button>
  </div></section>;
}

function Modal({ children, onClose, label, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    ref.current.showModal();
    document.body.style.overflow = 'hidden';
    ref.current.querySelector('[data-initial-focus]')?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className={`ed-native-dialog ${className}`} aria-label={label} onCancel={e => { e.preventDefault(); onClose(); }} onKeyDown={e => {
    if (e.key !== 'Tab') return;
    const nodes = [...e.currentTarget.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]')].filter(n => n.getClientRects().length && !n.closest('[inert]'));
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (!first) { e.preventDefault(); return; }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }} onClick={e => {
    if (e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose();
  }}><div className="ed-native-toolbar"><button className="ed-native-close" onClick={onClose} aria-label={`Close ${label.toLowerCase()}`}><X size={20} /></button></div>{children}</dialog>;
}

export function ProductFinder({ initialKind, products, categories, priceOf, money, config, onClose, onProduct, onBrowse }) {
  const [step, setStep] = useState(initialKind ? 1 : 0), [kind, setKind] = useState(initialKind || ''), [budget, setBudget] = useState(0), [priority, setPriority] = useState('Price low');
  const [available, setAvailable] = useState(true);
  const title = useRef(null);
  const selected = finderKinds.find(k => k.id === kind);
  const budgets = kind === 'grp_laptops' ? [150000, 250000, 400000, 0] : [5000, 15000, 30000, 0];
  const categoryIds = useMemo(() => {
    const ids = new Set([kind]);
    let changed = true;
    while (changed) { changed = false; categories.forEach(c => { if (ids.has(c.parentId) && !ids.has(c.id)) { ids.add(c.id); changed = true; } }); }
    return ids;
  }, [kind, categories]);
  const matches = useMemo(() => products.filter(p => p.active && categoryIds.has(p.category) && (!available || (!p.soldOut && p.stock > 0)) && (!budget || priceOf(p) <= budget)).sort((a, b) => priority === 'Newest' ? Number(b.isNew) - Number(a.isNew) || priceOf(a) - priceOf(b) : priority === 'Rating' ? (b.reviews ? b.rating : 0) - (a.reviews ? a.rating : 0) || priceOf(a) - priceOf(b) : priceOf(a) - priceOf(b)), [products, categoryIds, budget, priority, available, priceOf]);
  useEffect(() => { title.current?.focus({ preventScroll: true }); title.current?.closest('dialog')?.scrollTo({ top: 0, behavior: 'instant' }); }, [step]);
  const email = `mailto:${config.storeEmail}?subject=${encodeURIComponent('Help me find my next upgrade')}&body=${encodeURIComponent(`Hello ${config.storeName},\n\nI am looking for ${selected?.title.toLowerCase() || 'a device'} (${selected?.detail || ''}). My budget is ${budget ? `up to ${money(budget)}` : 'flexible'}. Please let me know what is available and help me choose.\n\nThank you.`)}`;
  return <Modal label="Product finder" onClose={onClose} className="ed-finder-dialog"><div className="ed-finder-head"><span className="ed-kicker"><SlidersHorizontal size={14} /> THE UPGRADE FINDER</span><div className="ed-finder-steps" aria-label={`Step ${step + 1} of 3`}>{['Your collection', 'Your preferences', 'Your shortlist'].map((label, i) => <span key={label} className={i <= step ? 'is-done' : ''}><i>{i < step ? <Check size={12} /> : i + 1}</i>{label}</span>)}</div></div>
    <div className="ed-finder-body"><h2 ref={title} tabIndex={-1} data-initial-focus>{['What would you like to upgrade?', 'Make it a little more you.', matches.length ? 'Meet your shortlist.' : 'Let’s find it together.'][step]}</h2><p className="ed-dialog-intro">{['Start with the part of your day you want to make better.', 'A few preferences help narrow down the catalog.', `${selected?.title || ''} · ${budget ? `Up to ${money(budget)}` : 'Any budget'}${available ? ' · In stock only' : ''}`][step]}</p>
      {step === 0 && <div className="ed-finder-kinds">{finderKinds.map(k => { const Icon = k.icon; return <button key={k.id} aria-pressed={kind === k.id} className={kind === k.id ? 'chosen' : ''} onClick={() => { setKind(k.id); setBudget(0); }}><span className="ed-finder-kind-icon"><Icon size={24} /></span><b>{k.title}</b><small>{k.detail}</small><span className="ed-choice-mark">{kind === k.id && <Check size={13} />}</span></button>; })}</div>}
      {step === 1 && <><fieldset className="ed-finder-field"><legend>Your maximum budget</legend><div className="ed-budget-options">{budgets.map(b => <label key={b} className={budget === b ? 'chosen' : ''}><input type="radio" name="ed-budget" checked={budget === b} onChange={() => setBudget(b)} /><span>{b ? <>Up to <b>{money(b)}</b></> : <><b>Keep it open</b>Any budget</>}</span><Check size={16} /></label>)}</div></fieldset><div className="ed-finder-preferences"><label>What matters most?<select value={priority} onChange={e => setPriority(e.target.value)}><option value="Price low">Lowest price first</option><option value="Newest">New arrivals first</option><option value="Rating">Highest rated first</option></select></label><label className="ed-finder-stock"><input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} /><span>Show in-stock products only</span></label></div></>}
      {step === 2 && (matches.length ? <><div className="ed-finder-results">{matches.slice(0, 3).map(p => <button key={p.id} onClick={() => onProduct(p.id)}>{p.image ? <img src={p.image} alt="" /> : <span className="ed-result-placeholder"><Package size={28} /></span>}<span><small>{p.brand || 'EPIC collection'}</small><b>{p.name}</b><em>{p.soldOut || p.stock <= 0 ? 'Currently unavailable' : 'In stock'}{p.isNew ? ' · New arrival' : ''}</em></span><strong>{money(priceOf(p))}</strong><ArrowUpRight size={18} /></button>)}</div><p className="ed-finder-explanation">{matches.length} {matches.length === 1 ? 'product matches' : 'products match'} your choices. Sorted by {priority === 'Newest' ? 'new arrivals' : priority === 'Rating' ? 'listed customer ratings' : 'price, low to high'}.</p></> : <div className="ed-finder-empty"><span><Search size={27} /></span><h3>No listed products match these choices yet.</h3><p>Try another budget or ask our team to help source your next upgrade.</p><a className="ed-stage-cta" href={email}>Email my requirements <ArrowUpRight size={17} /></a><small>Opens your email app with your preferences ready to send.</small></div>)}
    </div><div className="ed-finder-foot"><button className="ed-back-button" onClick={() => step ? setStep(step - 1) : onClose()}><ArrowLeft size={16} />{step ? 'Back' : 'Maybe later'}</button>{step < 2 ? <button className="ed-stage-cta" disabled={!kind} onClick={() => setStep(step + 1)}>{step === 0 ? 'Set my preferences' : 'Show my matches'}<ArrowRight size={17} /></button> : <button className="ed-stage-cta" onClick={() => onBrowse(kind, matches.length ? budget : 0, matches.length ? available : false, priority)}>{matches.length ? matches.length === 1 ? 'View 1 match' : `View all ${matches.length} matches` : 'Browse this collection'}<ArrowRight size={17} /></button>}</div>
  </Modal>;
}

export function QuickView({ product: p, info, money, images, wished, compared, cartQuantity, config, onClose, onAdd, onWish, onCompare, onDetails, onBag }) {
  const [quantity, setQuantity] = useState(1), [frame, setFrame] = useState(0), [added, setAdded] = useState(false);
  const remaining = p.active && !p.soldOut ? Math.max(0, p.stock - cartQuantity) : 0;
  const safeQty = Math.min(quantity, Math.max(1, remaining));
  const email = `mailto:${config.storeEmail}?subject=${encodeURIComponent(`Product enquiry: ${p.name}`)}&body=${encodeURIComponent(`Hello ${config.storeName},\n\nPlease confirm availability for ${p.name} (SKU: ${p.sku}).\n\nThank you.`)}`;
  return <Modal label="Product quick view" onClose={onClose} className="ed-quick-dialog"><div className="ed-quick-grid">
    <div className="ed-quick-gallery"><div className="ed-quick-main">{images.length ? <img src={images[frame]} alt={`${p.name}${frame ? `, view ${frame + 1}` : ''}`} /> : <Package size={100} strokeWidth={1} />}<span className="ed-quick-edition">A CLOSER LOOK</span></div>{images.length > 1 && <div className="ed-quick-thumbs">{images.map((url, i) => <button key={i} onClick={() => setFrame(i)} aria-label={`View product image ${i + 1}`} aria-pressed={i === frame}><img src={url} alt="" /></button>)}</div>}</div>
    <div className="ed-quick-content"><span className="ed-kicker">{p.brand || config.storeName}</span><h2 tabIndex={-1} data-initial-focus>{p.name}</h2><div className="ed-quick-meta"><span className={p.stock > 0 && !p.soldOut ? 'available' : ''}>{p.stock > 0 && !p.soldOut ? 'In stock' : 'Currently unavailable'}</span><span>SKU {p.sku}</span></div><div className="ed-quick-price"><b>{money(info.final)}</b>{info.was > info.final && <s>{money(info.was)}</s>}{info.offPct > 0 && <span>Save {info.offPct}%</span>}</div>{p.blurb && <p className="ed-quick-description">{p.blurb}</p>}
      {!!p.specs?.length && <dl className="ed-quick-specs">{p.specs.slice(0, 4).map(([name, value], i) => <div key={i}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>}
      <div className="ed-quick-purchase"><div className="ed-quick-qty"><button aria-label="Decrease quick-view quantity" disabled={safeQty <= 1 || !remaining} onClick={() => setQuantity(safeQty - 1)}><Minus size={15} /></button><output aria-label="Quick-view quantity">{safeQty}</output><button aria-label="Increase quick-view quantity" disabled={safeQty >= remaining} onClick={() => setQuantity(safeQty + 1)}><Plus size={15} /></button></div><button className="ed-stage-cta" disabled={!remaining} onClick={() => { onAdd(p.id, safeQty); setAdded(true); setQuantity(1); }}><ShoppingBag size={17} />{remaining ? 'Add to bag' : cartQuantity > 0 ? 'All units in your bag' : 'Unavailable'}</button></div>
      {added && <div className="ed-quick-added" role="status"><Check size={16} />Added to your bag.<button onClick={onBag}>View bag <ArrowRight size={14} /></button></div>}
      {!remaining && !cartQuantity && <a className="ed-quick-inquiry" href={email}>Ask about availability <ArrowUpRight size={14} /></a>}
      <div className="ed-quick-tools"><button onClick={onWish} aria-pressed={wished}><Heart size={17} fill={wished ? 'currentColor' : 'none'} />{wished ? 'Saved' : 'Save for later'}</button><button onClick={onCompare} aria-pressed={compared}><Layers size={17} />{compared ? 'Added to compare' : 'Compare'}</button></div><button className="ed-quick-details" onClick={onDetails}>Explore full product details <ArrowUpRight size={17} /></button><small className="ed-quick-note">{config.deliveries ? 'Delivery options shown at checkout.' : 'Store collection · Confirm availability with our team.'}</small>
    </div></div></Modal>;
}

export function ProductCompare({ products, priceOf, money, categoryOf, cart, onClose, onRemove, onClear, onShop, onProduct, onAdd }) {
  const [differences, setDifferences] = useState(false), [notice, setNotice] = useState('');
  const specNames = [...new Set(products.flatMap(p => (p.specs || []).map(s => s[0]).filter(Boolean)))];
  const rows = [
    ['Price', p => money(priceOf(p))], ['Brand', p => p.brand || 'Not listed'], ['Collection', p => categoryOf(p.category)],
    ['Availability', p => p.soldOut || p.stock <= 0 ? 'Currently unavailable' : 'In stock'],
    ['Warranty', p => p.warranty > 0 ? `${p.warranty} months` : 'Confirm with our team'],
    ['Customer rating', p => p.reviews > 0 ? `${p.rating.toFixed(1)} / 5 (${p.reviews} reviews)` : 'No reviews yet'],
    ...specNames.map(name => [name, p => (p.specs || []).find(s => s[0] === name)?.[1] || 'Not listed']),
  ].map(([name, value]) => ({ name, values: products.map(value) }));
  const visibleRows = differences ? rows.filter(row => new Set(row.values).size > 1) : rows;
  const lowest = Math.min(...products.map(priceOf));
  return <Modal label="Compare products" onClose={onClose} className="ed-compare-dialog"><header className="ed-compare-heading"><span className="ed-kicker"><Layers size={14} /> THE DETAILS MAKE THE DIFFERENCE</span><h2 data-initial-focus tabIndex={-1}>Good choices, side by side.</h2><p>Compare up to four products before you decide.</p></header>
    {products.length < 2 ? <div className="ed-compare-empty"><Layers size={38} strokeWidth={1.2} /><h3>Choose at least two products.</h3><p>Use the compare icon on a product card or in quick view to build your selection.</p><button className="ed-stage-cta" onClick={onShop}>Explore the collection <ArrowRight size={17} /></button></div> : <><div className="ed-compare-options"><span>{products.length} products selected</span><label><input type="checkbox" checked={differences} onChange={e => setDifferences(e.target.checked)} /> Only show differences</label></div><div className="ed-compare-scroll" role="region" aria-label="Product comparison table" tabIndex={0}><table className="ed-compare-table"><thead><tr><th scope="col">Find your fit<small>Scroll to compare →</small></th>{products.map(p => <th scope="col" key={p.id}><button className="ed-compare-remove" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name} from comparison`}><X size={13} /></button><button className="ed-compare-product" onClick={() => onProduct(p.id)}>{p.image ? <img src={p.image} alt="" /> : <Package size={36} strokeWidth={1.2} />}<b>{p.name}</b></button></th>)}</tr></thead><tbody>{visibleRows.map(row => <tr key={row.name}><th scope="row">{row.name}</th>{row.values.map((value, i) => <td key={products[i].id} className={row.name === 'Price' && priceOf(products[i]) === lowest ? 'ed-best-price' : ''}>{value}{row.name === 'Price' && priceOf(products[i]) === lowest && <small>Lowest price</small>}</td>)}</tr>)}{!visibleRows.length && <tr><td colSpan={products.length + 1} className="ed-compare-identical">These products have the same listed details. Turn off the filter to see every row.</td></tr>}<tr><th scope="row">Make it yours</th>{products.map(p => { const remaining = !p.soldOut && p.active ? p.stock - (cart.find(l => l.id === p.id)?.qty || 0) : 0; return <td key={p.id}><button className="ed-stage-cta" disabled={remaining <= 0} onClick={() => { onAdd(p.id); setNotice(`${p.name} added to your bag.`); }}><ShoppingBag size={14} />{remaining > 0 ? 'Add to bag' : p.stock > 0 && !p.soldOut ? 'In your bag' : 'Unavailable'}</button></td>; })}</tr></tbody></table></div></>}
    <div className="ed-compare-footer"><button className="ed-back-button" onClick={onClear}>Clear selection</button><span role="status">{notice}</span><button className="ed-stage-cta" onClick={onClose}>Keep exploring <ArrowRight size={16} /></button></div>
  </Modal>;
}
