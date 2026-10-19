/* 3.14: dashboard motion — sections play their entrance when scrolled into view, numbers count up on arrival, sales-by-category donut,
   business-health rings, banner lights / sheen / year pace, pointer light on cards, sparklines draw, gradient bars, other donuts intact,
   reduced motion, phone, print (needs tests/fixture.json). Run: node tests/browser-dashboard-motion.cjs */
const { chromium } = require('/opt/node-tools/node_modules/playwright');const path=require('path'),fs=require('fs');
const HTML=process.env.HTML||path.resolve(__dirname,'../invoeez.html'),fx=fs.readFileSync(process.env.FX||path.join(__dirname,'fixture.json'),'utf8');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[],ok=[];const check=(c,m)=>(c?ok:errs).push(m);
const open=async(o={})=>{const ctx=await b.newContext({viewport:o.vp||{width:1440,height:900},reducedMotion:o.reduced?'reduce':'no-preference'});
  await ctx.addInitScript((fx)=>{try{if(!localStorage.getItem('fx-loaded')){localStorage.clear();localStorage.setItem('mizan.sidebar','pinned');localStorage.setItem('mizan.navgroups','{}');localStorage.setItem('mizan.books.v2',fx);localStorage.setItem('fx-loaded','1');}}catch(e){}},fx);
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push('PAGE '+e.message));await p.goto('file://'+HTML);await p.waitForTimeout(o.wait||1600);return p;};
let p=await open();
// 1. scroll reveal
const st=await p.evaluate(()=>{const kpi=document.querySelector('.dash-kpis > *'),last=[...document.querySelectorAll('.dash-row > *')].pop();
  return {kpi:kpi.className,kpiOp:getComputedStyle(kpi).opacity,last:last.className,lastOp:getComputedStyle(last).opacity,rv:document.querySelectorAll('.dash2 .rv').length};});
check(/\brv\b/.test(st.kpi)&&/\bin\b/.test(st.kpi)&&+st.kpiOp>0.99,'cards on screen have played their entrance');
check(/\brv\b/.test(st.last)&&!/\bin\b/.test(st.last)&&+st.lastOp===0&&st.rv>=10,'cards further down wait ('+st.rv+' sections)');
const donutBefore=await p.evaluate(()=>({cls:document.querySelector('.donut-box').className,mid:document.querySelector('.donut-mid b').innerText}));
check(!/\bin\b/.test(donutBefore.cls)&&/^0/.test(donutBefore.mid),'the donut has not drawn yet ('+donutBefore.mid+')');
await p.locator('.donut-box').scrollIntoViewIfNeeded();await p.waitForTimeout(2300);
const donut=await p.evaluate(()=>({cls:document.querySelector('.donut-box').className,mid:document.querySelector('.donut-mid b').innerText,segs:document.querySelectorAll('.donut-seg').length,leg:document.querySelectorAll('.dl-row').length,card:document.querySelector('.donut-box').closest('.rv').className}));
check(/\bin\b/.test(donut.cls)&&/^\d+(\.\d)?[MK]$/.test(donut.mid)&&donut.segs===donut.leg&&donut.segs>=3,'sales by category donut draws and counts up ('+donut.mid+', '+donut.segs+' slices)');
check(/\bin\b/.test(donut.card),'its card has risen into place');
await p.locator('.dl-row').nth(1).hover();await p.waitForTimeout(250);
check(/%$/.test(await p.locator('.donut-mid b').innerText())&&await p.locator('.donut-seg.dim').count()===donut.segs-1,'hovering a category highlights its slice and share');
await p.mouse.move(5,5);
// 2. rings
await p.locator('.rings').scrollIntoViewIfNeeded();await p.waitForTimeout(1600);
const rings=await p.evaluate(()=>[...document.querySelectorAll('.ring')].map(r=>({in:r.classList.contains('in'),t:r.querySelector('.ring-fig b').innerText,l:r.querySelector('.ring-l').innerText})));
check(rings.length===3&&rings.every(r=>r.in&&/%$/.test(r.t))&&rings[0].l==='Gross margin','business health rings fill ('+rings.map(r=>r.l+' '+r.t).join(', ')+')');
// 3. hero
await p.locator('.page').evaluate(e=>e.scrollTo(0,0));await p.waitForTimeout(300);
check(await p.locator('.dh-sparks i').count()===14&&await p.locator('.dh-sheen').count()===1,'banner has drifting lights and a sheen');
check(/On pace for AED [\d.]+[MK] sales in \d{4}/.test(await p.locator('.dh-pill.pace').innerText()),'year-to-date shows where sales are heading');
check(await p.locator('.dc-dot').count()===1&&await p.evaluate(()=>getComputedStyle(document.querySelector('.dc-line')).animationName)==='lineDraw','cash line draws to a glowing point');
check(await p.evaluate(()=>getComputedStyle(document.querySelector('.kt-spark .ks-line')).animationName)==='lineDraw','KPI sparklines draw in');
check(await p.evaluate(()=>/url\("?#cg/.test(document.querySelector('.viz-svg .viz-bar').style.fill)),'chart bars have a gradient');
// 4. pointer light
const tile=p.locator('.kpi-tile').first();const bb=await tile.boundingBox();
await p.mouse.move(bb.x+40,bb.y+30);await p.waitForTimeout(200);
check(await tile.evaluate(e=>e.style.getPropertyValue('--mx'))==='40px','cards light up under the pointer');
// 5. period switch keeps working
await p.locator('.dh-seg button',{hasText:'Quarter'}).click();await p.waitForTimeout(900);
check(await p.locator('.dh-pill.pace').count()===0&&await p.locator('.kpi-tile').count()===5,'other periods drop the year pace');
// 6. other donuts unaffected
await p.locator('.sbar [data-k="expenses"]').first().click();await p.waitForTimeout(900);
check(await p.locator('.view svg path').count()>3,'expenses donut still renders');
await p.locator('.sbar [data-k="dash"]').first().click();await p.waitForTimeout(600);
await p.locator('.dh-seg button',{hasText:'Financial detail'}).click();await p.waitForTimeout(900);
check(!errs.some(e=>/PAGE/.test(e)),'financial detail view opens without errors');
// 7. print shows everything
await p.locator('.dh-seg button',{hasText:'Overview'}).click();await p.waitForTimeout(600);
await p.emulateMedia({media:'print'});
check(await p.evaluate(()=>[...document.querySelectorAll('.dash2 .rv')].every(e=>+getComputedStyle(e).opacity===1)),'print shows every section');
await p.emulateMedia({media:'screen'});
await p.context().close();
// 8. reduced motion
p=await open({reduced:true});
const rm=await p.evaluate(()=>({rv:document.querySelectorAll('.dash2 .rv').length,donut:document.querySelector('.donut-box').classList.contains('in'),mid:document.querySelector('.donut-mid b').innerText,sparks:getComputedStyle(document.querySelector('.dh-sparks')).display}));
check(rm.rv===0&&rm.donut&&/[MK]$/.test(rm.mid)&&rm.sparks==='none','reduced motion: everything shown at once, no drifting lights');
await p.context().close();
// 9. phone
p=await open({vp:{width:390,height:844}});
await p.locator('.donut-box').scrollIntoViewIfNeeded();await p.waitForTimeout(1500);
const ph=await p.evaluate(()=>({over:document.documentElement.scrollWidth-innerWidth,donut:document.querySelector('.donut-box').getBoundingClientRect().right<=390,rings:[...document.querySelectorAll('.ring')].every(r=>r.getBoundingClientRect().right<=390)}));
check(ph.over<=0&&ph.donut&&ph.rings,'phone: donut and rings fit ('+JSON.stringify(ph)+')');
await p.context().close();
console.log(JSON.stringify({ok:ok.length,errors:errs},null,1));
await b.close();process.exit(errs.length?1:0);})();
