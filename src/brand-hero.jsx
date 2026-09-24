/* Cobalt hero stage for the storefront.
   One saturated brand-blue stage for every slide: the product cutouts carry only their
   shading, so on cobalt they turn a deep single-tone navy and the stage never changes
   colour. The words, the product and a pair of spec notes change per slide.
   It keeps playing while the cursor is over it (the pause button stops it), pauses while
   a keyboard user is inside it or the tab is hidden, and skips autoplay for people who
   ask their device for reduced motion. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

const INTERVAL = 6500;
const SLIDES = [
  { id: 'keyboard', label: 'Keyboards', kicker: 'Keyboards', title: ['Your setup.', 'Upgraded.'], text: 'Keyboards and mice that make long desk days easier. Compare the details and order for delivery across Pakistan.', cta: 'Shop keyboards', image: 'slide-keyboard', notes: [['Brands', 'Logitech · Rapoo'], ['Connect', 'USB & Bluetooth']] },
  { id: 'mouse', label: 'Mice', kicker: 'Mice', title: ['Every move', 'matters.'], text: 'Wired, wireless and gaming mice from Logitech and A4Tech, all priced in rupees.', cta: 'Shop mice', image: 'slide-mouse', notes: [['Clicks', 'Silent options'], ['Gaming', 'Logitech G series']] },
  { id: 'audio', label: 'Audio', kicker: 'Headsets and microphones', title: ['Be heard.', 'Get immersed.'], text: 'Headsets and microphones for calls, classes, gaming and recording.', cta: 'Shop headsets', image: 'slide-headphones', notes: [['For', 'Calls · Gaming · Studio'], ['Brands', 'MAONO · UGREEN · A4Tech']] },
];
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const CSS = `
.bh-wrap{margin-top:16px}
.bh{--ease:cubic-bezier(.2,.7,.2,1);position:relative;border-radius:22px;overflow:hidden;isolation:isolate;color:#fff;
  font-family:"Epic Text","Plus Jakarta Sans",system-ui,sans-serif;touch-action:pan-y;
  background:radial-gradient(52% 70% at 72% 44%,#3d86ff 0%,rgba(61,134,255,0) 70%),linear-gradient(135deg,#1f6ff2 0%,#0b5ce6 45%,#0741b8 100%)}
.bh *{box-sizing:border-box}
.bh-grid{position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.5;
  background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);
  background-size:56px 56px;mask-image:radial-gradient(80% 90% at 70% 40%,#000 20%,transparent 75%);-webkit-mask-image:radial-gradient(80% 90% at 70% 40%,#000 20%,transparent 75%)}
.bh-mark{position:absolute;z-index:-1;right:-4%;top:50%;width:min(820px,62%);aspect-ratio:1.66;transform:translateY(-54%);
  background:url("./assets/brand/epic-e-shape.svg") center/contain no-repeat;opacity:.13;filter:brightness(0) invert(1);pointer-events:none}
.bh-floor{position:absolute;z-index:-1;left:48%;right:8%;bottom:17%;height:12%;border-radius:50%;background:radial-gradient(closest-side,rgba(3,22,70,.45),rgba(3,22,70,0));pointer-events:none}
.bh-stage{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);min-height:clamp(470px,43vw,590px)}
.bh-copy{position:relative;display:grid;align-content:center;padding:56px 0 120px clamp(28px,5vw,72px)}
.bh-slide{grid-area:1/1;opacity:0;visibility:hidden;transform:translateY(16px);transition:opacity .45s var(--ease),transform .6s var(--ease),visibility 0s linear .45s}
.bh-slide.on{opacity:1;visibility:visible;transform:none;transition:opacity .55s var(--ease) .1s,transform .7s var(--ease) .1s,visibility 0s}
.bh-kicker{display:inline-flex;align-items:center;gap:12px;margin-bottom:22px;font:600 12px/1 ui-monospace,"SF Mono","Cascadia Mono",Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;color:#dbe7ff}
.bh-kicker b{display:inline-grid;place-items:center;min-width:34px;height:22px;padding:0 8px;font-weight:700;color:#0b5ce6;background:#fff;transform:skewX(-14deg);border-radius:3px}
.bh-kicker b>span{transform:skewX(14deg)}
.bh-slide h1,.bh-slide h2{margin:0;font-family:"Epic Display","Saira",system-ui,sans-serif;font-weight:750;font-stretch:120%;text-transform:uppercase;
  font-size:clamp(2.35rem,4.9vw,4.6rem);line-height:.95;letter-spacing:-.01em;color:#fff;text-wrap:balance}
.bh-slide h1 span,.bh-slide h2 span{display:block;color:#0a1a3a;-webkit-text-stroke:0}
.bh-slide p{max-width:40ch;margin:24px 0 0;font-size:1.05rem;line-height:1.65;color:#e3ecff}
.bh-actions{display:flex;flex-wrap:wrap;align-items:center;gap:14px 26px;margin-top:32px}
.bh .bh-cta{display:inline-flex;align-items:center;gap:12px;min-height:52px;padding:0 26px;border:0;border-radius:10px;background:#fff;color:#0a1a3a;
  font:inherit;font-weight:700;font-size:.97rem;cursor:pointer;box-shadow:0 14px 30px -14px rgba(3,20,70,.8);transition:transform .2s var(--ease),box-shadow .2s}
.bh-cta svg{transition:transform .2s var(--ease)}
.bh-cta:hover{transform:translateY(-2px);box-shadow:0 18px 34px -14px rgba(3,20,70,.9)}
.bh-cta:hover svg{transform:translateX(3px)}
.bh .bh-link{display:inline-flex;align-items:center;gap:8px;min-height:44px;border:0;background:none;padding:0;font:inherit;font-weight:700;color:#fff;cursor:pointer;
  text-decoration:underline;text-decoration-color:rgba(255,255,255,.35);text-underline-offset:6px;text-decoration-thickness:2px}
.bh-link:hover{text-decoration-color:#fff}
.bh-art{position:relative;min-height:300px}
.bh-product{position:absolute;inset:6% 7% 12% 2%;display:grid;place-items:center;opacity:0;visibility:hidden;transform:translateX(40px) scale(.96) rotate(-2deg);
  transition:opacity .45s var(--ease),transform .8s var(--ease),visibility 0s linear .45s}
.bh-product.on{opacity:1;visibility:visible;transform:none;transition:opacity .6s var(--ease),transform .95s var(--ease),visibility 0s}
.bh-product img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 30px 40px rgba(3,20,70,.35))}
.bh-notes{position:absolute;right:clamp(20px,3vw,40px);top:clamp(20px,3vw,36px);display:grid;gap:8px;justify-items:end}
.bh-note{display:grid;gap:3px;padding:10px 14px;min-width:170px;border-radius:10px;background:rgba(6,30,92,.28);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);opacity:0;transform:translateY(-6px);transition:opacity .4s var(--ease),transform .5s var(--ease)}
.bh-note.on{opacity:1;transform:none;transition-delay:.35s}
.bh-note small{font:600 10px/1 ui-monospace,"SF Mono",Consolas,monospace;letter-spacing:.14em;text-transform:uppercase;color:#b7cdfb}
.bh-note span{font-weight:600;font-size:.86rem}
.bh-notes-set{grid-area:1/1;display:grid;gap:8px;justify-items:end}
.bh-controls{position:absolute;z-index:2;left:clamp(28px,5vw,72px);right:clamp(20px,3vw,40px);bottom:28px;display:flex;align-items:center;gap:22px}
.bh-dots{display:flex;gap:18px}
.bh .bh-dots button{display:grid;gap:9px;min-width:92px;padding:6px 0;border:0;background:none;color:#cfe0ff;font:600 11px/1 ui-monospace,"SF Mono",Consolas,monospace;letter-spacing:.1em;text-transform:uppercase;text-align:left;cursor:pointer}
.bh .bh-dots button.on{color:#fff}
.bh-dots .bar{display:grid;height:3px;border-radius:2px;background:rgba(255,255,255,.25);overflow:hidden}
.bh-dots i{grid-area:1/1;background:#fff;transform:scaleX(0);transform-origin:left}
.bh-dots .done i{transform:scaleX(1);opacity:.55}
.bh-dots .on i{animation:bh-fill ${INTERVAL}ms linear forwards}
.bh.paused .bh-dots .on i{animation-play-state:paused}
.bh.static .bh-dots .on i{animation:none;transform:scaleX(1)}
.bh-buttons{display:flex;gap:6px;margin-left:auto}
.bh .bh-buttons button{width:42px;height:42px;border:0;border-radius:10px;display:grid;place-items:center;color:#fff;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.22);cursor:pointer;transition:background .2s}
.bh .bh-buttons button:hover{background:#fff;color:#0b5ce6}
.bh :focus-visible{outline:2.5px solid #fff;outline-offset:3px;border-radius:8px}
@keyframes bh-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@media (max-width:980px){.bh-notes{display:none}}
@media (max-width:860px){.bh-stage{grid-template-columns:1fr;min-height:0}.bh-art{order:-1;min-height:0;aspect-ratio:16/10}.bh-product{inset:10% 8% 0}
  .bh-copy{padding:0 22px 104px}.bh-mark{width:110%;right:-34%;top:22%}.bh-floor{left:16%;right:16%;top:40%;bottom:auto;height:9%}
  .bh-controls{left:22px;right:16px;bottom:22px;gap:12px}.bh-dots{gap:8px;flex:1}.bh .bh-dots button{min-width:0;flex:1}.bh-dots button span.t{display:none}.bh-buttons button[aria-label$="slide"]{display:none}}
@media (max-width:720px){.bh{border-radius:18px}.bh-slide h1,.bh-slide h2{font-size:clamp(2rem,9.4vw,2.7rem)}.bh-slide p{font-size:.98rem;margin-top:16px}.bh-actions{margin-top:24px}.bh-kicker{margin-bottom:14px}
  .bh-buttons button{width:38px;height:38px}}
@media (prefers-reduced-motion:reduce){.bh *{transition-duration:.01ms!important}}
`;

export default function BrandHero({ onShop, onFinder }) {
  const count = SLIDES.length;
  const [index, setIndex] = useState(0);
  const [reduced] = useState(reducedMotion);
  const [playing, setPlaying] = useState(() => !reducedMotion());
  const [keyboardInside, setKeyboardInside] = useState(false);
  const [hidden, setHidden] = useState(false);
  const swipe = useRef(null);
  const go = useCallback((step) => setIndex((i) => (i + step + count) % count), [count]);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  const running = playing && !keyboardInside && !hidden;
  return (
    <section className="ed-wrap bh-wrap" aria-roledescription="carousel" aria-label="Featured collections">
      <style>{CSS}</style>
      <div
        className={'bh' + (running ? '' : ' paused') + (playing ? '' : ' static')}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } }}
        onFocus={(e) => { if (e.target.matches?.(':focus-visible')) setKeyboardInside(true); }}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setKeyboardInside(false); }}
        onPointerDown={(e) => { if (e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={(e) => {
          const s = swipe.current; swipe.current = null;
          if (!s) return;
          const dx = e.clientX - s.x, dy = e.clientY - s.y;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) go(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => { swipe.current = null; }}
      >
        <div className="bh-grid" aria-hidden="true" />
        <div className="bh-mark" aria-hidden="true" />
        <div className="bh-floor" aria-hidden="true" />
        <div className="bh-stage" aria-live={running ? 'off' : 'polite'}>
          <div className="bh-copy">
            {SLIDES.map((s, i) => {
              const Heading = i === 0 ? 'h1' : 'h2';
              const on = i === index;
              return (
                <div key={s.id} className={'bh-slide' + (on ? ' on' : '')} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`} aria-hidden={!on}>
                  <span className="bh-kicker"><b><span>{String(i + 1).padStart(2, '0')}</span></b>{s.kicker}</span>
                  <Heading>{s.title[0]} <span>{s.title[1]}</span></Heading>
                  <p>{s.text}</p>
                  <div className="bh-actions">
                    <button className="bh-cta" tabIndex={on ? undefined : -1} onClick={() => onShop && onShop(s.id)}>{s.cta}<ArrowRight size={18} /></button>
                    <button className="bh-link" tabIndex={on ? undefined : -1} onClick={() => onFinder && onFinder()}>Find my upgrade<ArrowUpRight size={17} /></button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bh-art" aria-hidden="true">
            {SLIDES.map((s, i) => (
              <div key={s.id} className={'bh-product' + (i === index ? ' on' : '')}>
                <img src={`./assets/slides/${s.image}-1200.webp`} srcSet={`./assets/slides/${s.image}-700.webp 700w, ./assets/slides/${s.image}-1200.webp 1200w`}
                  sizes="(max-width: 860px) 92vw, 52vw" width="1200" height="900" alt="" decoding="async" loading={i === 0 ? 'eager' : 'lazy'} draggable="false" />
              </div>
            ))}
            <div className="bh-notes">
              {SLIDES.map((s, i) => (
                <div key={s.id} className="bh-notes-set">
                  {s.notes.map(([k, v]) => <div key={k} className={'bh-note' + (i === index ? ' on' : '')}><small>{k}</small><span>{v}</span></div>)}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bh-controls">
          <div className="bh-dots" role="group" aria-label="Choose a slide">
            {SLIDES.map((s, i) => (
              <button key={s.id} className={(i === index ? 'on' : '') + (i < index ? ' done' : '')} aria-label={`Show slide ${i + 1}: ${s.title.join(' ')}`} aria-current={i === index ? 'true' : undefined} onClick={() => setIndex(i)}>
                <span className="t">{String(i + 1).padStart(2, '0')} {s.label}</span>
                <span className="bar"><i onAnimationEnd={i === index && playing ? () => go(1) : undefined} /></span>
              </button>
            ))}
          </div>
          <div className="bh-buttons">
            <button aria-label="Previous slide" onClick={() => go(-1)}><ChevronLeft size={18} /></button>
            <button aria-label="Next slide" onClick={() => go(1)}><ChevronRight size={18} /></button>
            {!reduced && <button aria-label={playing ? 'Pause slideshow' : 'Play slideshow'} onClick={() => setPlaying((p) => !p)}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>}
          </div>
        </div>
      </div>
    </section>
  );
}
