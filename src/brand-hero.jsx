/* Single-tone hero slider for the storefront.
   All slides share one blue studio backdrop with the logo's E as a watermark; only the
   product and the words change. It keeps playing while the cursor is over it (the pause
   button stops it), pauses while a keyboard user is inside it, and skips autoplay for
   people who ask their device for reduced motion. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

const INTERVAL = 6500;
const SLIDES = [
  { id: 'keyboard', kicker: 'Keyboards', title: ['Your setup.', 'Upgraded.'], text: 'Keyboards and mice that make long desk days easier. Compare the details and order for delivery across Pakistan.', cta: 'Shop keyboards', image: 'slide-keyboard' },
  { id: 'mouse', kicker: 'Mice', title: ['Every move', 'matters.'], text: 'Wired, wireless and gaming mice from Logitech and A4Tech, all priced in rupees.', cta: 'Shop mice', image: 'slide-mouse' },
  { id: 'audio', kicker: 'Headsets and microphones', title: ['Be heard.', 'Get immersed.'], text: 'Headsets and microphones for calls, classes, gaming and recording.', cta: 'Shop headsets', image: 'slide-headphones' },
];
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const CSS = `
.bh-wrap{margin-top:18px}
.bh{--blue:#0b5ce6;--blue-press:#0847b8;--ink:#17202a;--ink-2:#434f5e;--grad:linear-gradient(135deg,#1f6ff2 0%,#0b5ce6 42%,#0033a6 100%);--ease:cubic-bezier(.2,.7,.2,1);
  position:relative;border-radius:24px;overflow:hidden;isolation:isolate;color:var(--ink);font-family:"Epic Text","Plus Jakarta Sans",system-ui,sans-serif;
  background:radial-gradient(60% 80% at 72% 48%,#f8fbff 0%,rgba(248,251,255,0) 70%),linear-gradient(180deg,#edf3fc 0%,#e3ecfa 100%);
  box-shadow:inset 0 0 0 1px rgba(11,92,230,.07);touch-action:pan-y}
.bh *{box-sizing:border-box}
.bh-mark{position:absolute;z-index:-1;right:-6%;top:50%;width:min(760px,60%);aspect-ratio:1.66;transform:translateY(-52%);background:url("./assets/brand/epic-e-shape.svg") center/contain no-repeat;pointer-events:none}
.bh-floor{position:absolute;z-index:-1;left:50%;right:6%;bottom:14%;height:11%;border-radius:50%;background:radial-gradient(closest-side,rgba(11,51,166,.12),rgba(11,51,166,0));pointer-events:none}
.bh-stage{display:grid;grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);min-height:clamp(440px,42vw,560px)}
.bh-copy{position:relative;display:grid;align-content:center;padding:52px 0 108px clamp(28px,5vw,68px)}
.bh-slide{grid-area:1/1;opacity:0;visibility:hidden;transform:translateY(14px);transition:opacity .45s var(--ease),transform .6s var(--ease),visibility 0s linear .45s}
.bh-slide.on{opacity:1;visibility:visible;transform:none;transition:opacity .55s var(--ease) .12s,transform .7s var(--ease) .12s,visibility 0s}
.bh-kicker{display:inline-flex;align-items:center;gap:10px;margin-bottom:18px;font-weight:700;font-size:.88rem;color:var(--blue-press)}
.bh-kicker:before{content:"";width:26px;height:7px;border-radius:2px;background:var(--grad);transform:skewX(-18deg)}
.bh-slide h1,.bh-slide h2{margin:0;font-family:"Epic Display","Saira",system-ui,sans-serif;font-weight:700;font-stretch:114%;font-size:clamp(2.4rem,4.7vw,4.2rem);line-height:.98;letter-spacing:-.02em;color:var(--ink)}
.bh-slide h1 span,.bh-slide h2 span{display:block;color:var(--blue)}
.bh-slide p{max-width:40ch;margin:20px 0 0;font-size:1.05rem;line-height:1.6;color:var(--ink-2)}
.bh-actions{display:flex;flex-wrap:wrap;align-items:center;gap:16px 26px;margin-top:30px}
.bh-cta{position:relative;isolation:isolate;display:inline-flex;align-items:center;gap:10px;min-height:48px;padding:0 28px;border:0;background:none;color:#fff;font:inherit;font-weight:700;font-size:.95rem;cursor:pointer}
.bh-cta:before{content:"";position:absolute;inset:0;z-index:-1;border-radius:8px;background:var(--grad);transform:skewX(-18deg);box-shadow:0 10px 22px -10px rgba(11,92,230,.7);transition:filter .2s}
.bh-cta:hover:before{filter:brightness(1.07)}
.bh-link{display:inline-flex;align-items:center;gap:7px;border:0;background:none;padding:0;font:inherit;font-weight:700;color:var(--ink);cursor:pointer}
.bh-link:hover{color:var(--blue)}
.bh-art{position:relative;min-height:300px}
.bh-product{position:absolute;inset:7% 8% 10% 4%;display:grid;place-items:center;opacity:0;visibility:hidden;transform:translateX(34px) scale(.97);transition:opacity .45s var(--ease),transform .8s var(--ease),visibility 0s linear .45s}
.bh-product.on{opacity:1;visibility:visible;transform:none;transition:opacity .6s var(--ease),transform .9s var(--ease),visibility 0s}
.bh-product img{width:100%;height:100%;object-fit:contain}
.bh-controls{position:absolute;z-index:2;left:clamp(28px,5vw,68px);bottom:34px;display:flex;align-items:center;gap:18px}
.bh-dots{display:flex;gap:8px}
.bh-dots button{width:46px;height:24px;display:grid;align-items:center;border:0;background:none;padding:0;cursor:pointer}
.bh-dots button:before,.bh-dots i{content:"";grid-area:1/1;height:4px;border-radius:2px;background:rgba(23,32,42,.16)}
.bh-dots i{background:var(--blue);transform:scaleX(0);transform-origin:left}
.bh-dots .done i{transform:scaleX(1)}
.bh-dots .on i{animation:bh-fill ${INTERVAL}ms linear forwards}
.bh.paused .bh-dots .on i{animation-play-state:paused}
.bh.static .bh-dots .on i{animation:none;transform:scaleX(1)}
.bh-buttons{display:flex;gap:6px}
.bh-buttons button{width:38px;height:38px;border:0;border-radius:10px;display:grid;place-items:center;color:var(--ink);background:rgba(255,255,255,.78);box-shadow:inset 0 0 0 1px rgba(23,32,42,.1);cursor:pointer}
.bh-buttons button:hover{background:#fff;color:var(--blue)}
.bh :focus-visible{outline:2.5px solid var(--blue);outline-offset:3px;border-radius:6px}
@keyframes bh-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@media (max-width:860px){.bh-stage{grid-template-columns:1fr;min-height:0}.bh-art{order:-1;min-height:0;aspect-ratio:16/11}.bh-product{inset:8% 7% 0}
  .bh-copy{padding:8px 24px 96px}.bh-mark{width:104%;right:-30%;top:24%}.bh-floor{left:14%;right:14%;top:36%;bottom:auto;height:8%}.bh-controls{left:24px;bottom:28px}}
@media (max-width:720px){.bh{border-radius:20px}.bh-slide h1,.bh-slide h2{font-size:clamp(2.2rem,10.5vw,2.9rem)}.bh-slide p{font-size:1rem}}
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
        <div className="bh-mark" aria-hidden="true" />
        <div className="bh-floor" aria-hidden="true" />
        <div className="bh-stage" aria-live={running ? 'off' : 'polite'}>
          <div className="bh-copy">
            {SLIDES.map((s, i) => {
              const Heading = i === 0 ? 'h1' : 'h2';
              const on = i === index;
              return (
                <div key={s.id} className={'bh-slide' + (on ? ' on' : '')} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`} aria-hidden={!on}>
                  <span className="bh-kicker">{s.kicker}</span>
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
          </div>
        </div>
        <div className="bh-controls">
          <div className="bh-dots" role="group" aria-label="Choose a slide">
            {SLIDES.map((s, i) => (
              <button key={s.id} className={(i === index ? 'on' : '') + (i < index ? ' done' : '')} aria-label={`Show slide ${i + 1}: ${s.title.join(' ')}`} aria-current={i === index ? 'true' : undefined} onClick={() => setIndex(i)}>
                <i onAnimationEnd={i === index && playing ? () => go(1) : undefined} />
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
