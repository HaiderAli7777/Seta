/* 3.13: figures in tabular sans, notification centre, keyboard shortcuts (?, /, g+key, n+key), summary tiles on document lists, Undo on deletes,
   tidy payments table, phone (needs tests/fixture.json). Run: node tests/browser-experience.cjs */
const { chromium } = require('/opt/node-tools/node_modules/playwright');const path=require('path'),fs=require('fs');
const HTML=process.env.HTML||path.resolve(__dirname,'../invoeez.html'),fx=fs.readFileSync(process.env.FX||path.join(__dirname,'fixture.json'),'utf8');
const SHOTS=process.env.SHOTS||'';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[],ok=[];const check=(c,m)=>(c?ok:errs).push(m);
const ctx=await b.newContext({viewport:{width:1440,height:900}});
await ctx.addInitScript((fx)=>{try{if(!localStorage.getItem('fx-loaded')){localStorage.clear();localStorage.setItem('mizan.sidebar','pinned');localStorage.setItem('mizan.navgroups','{}');localStorage.setItem('mizan.books.v2',fx);localStorage.setItem('fx-loaded','1');}}catch(e){}},fx);
const p=await ctx.newPage();p.on('pageerror',e=>errs.push('PAGE '+e.message));await p.goto('file://'+HTML);await p.waitForTimeout(1500);
const shot=async(n)=>{if(SHOTS)await p.screenshot({path:path.join(SHOTS,n+'.png')});};
const books=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('mizan.books.v2')));
const nav=async(k)=>{await p.locator(`.sbar [data-k="${k}"]`).first().click();await p.waitForTimeout(900);};
const view=async()=>(await p.locator('.topbar .crumb b').innerText()).trim();

// 1. figures
await nav('invoices');
const fonts=await p.evaluate(()=>({cell:getComputedStyle(document.querySelector('.doc-list-tbl td.n')).fontFamily,no:getComputedStyle(document.querySelector('.doc-list-tbl td.mono')).fontFamily}));
check(!/Mono/.test(fonts.cell)&&/Mono/.test(fonts.no),'amounts in the interface font, document numbers stay in the code font');

// 2. summary tiles
check(await p.locator('.ds-tile').count()===4,'invoice list opens with four summary tiles');
const all=await p.locator('.doc-list-tbl tbody tr.click').count();
await p.locator('.ds-tile',{hasText:'Due in 7 days'}).click();await p.waitForTimeout(300);
const soon=await p.evaluate(()=>[...document.querySelectorAll('.doc-list-tbl tbody tr.click')].map(r=>r.querySelector('.c-status').innerText));
const tileN=+(await p.locator('.ds-tile',{hasText:'Due in 7 days'}).locator('.ds-s').innerText()).match(/\d+/)[0];
check(soon.length===tileN&&soon.length>0&&soon.every(t=>/Due in [1-7] days?|Due today|Partly paid/.test(t)),'Due in 7 days filters the list ('+soon.length+')');
check(/on/.test(await p.locator('.ds-tile',{hasText:'Due in 7 days'}).getAttribute('class')),'the active tile is highlighted');
await p.locator('.ds-tile',{hasText:'Due in 7 days'}).click();await p.waitForTimeout(300);
check(await p.locator('.doc-list-tbl tbody tr.click').count()===all,'clicking it again shows everything');
await shot('x1-tiles');
await nav('quotes');check(await p.locator('.ds-tile',{hasText:'Accepted'}).count()===1,'quotation list has its own tiles');
await nav('purchase_orders');check(await p.locator('.ds-tile',{hasText:'Awaiting approval'}).count()===1,'purchase order list has its own tiles');

// 3. notification centre
await nav('dash');
const dot=+(await p.locator('.bell .dot').innerText());
await p.locator('.bell').click();await p.waitForTimeout(400);
check(await p.locator('.notif-pop').count()===1&&await p.locator('.nt-item').count()===dot,'bell opens the notification centre ('+dot+' items)');
const titles=await p.locator('.nt-item b').allInnerTexts();
check(titles.some(t=>/overdue invoices?/.test(t))&&titles.some(t=>/vendor bills? (is|are) overdue/.test(t)),'overdue invoices and bills are listed');
await shot('x2-bell');
await p.keyboard.press('Escape');await p.waitForTimeout(200);
check(await p.locator('.notif-pop').count()===0,'Escape closes it');
await p.locator('.bell').click();await p.waitForTimeout(300);
await p.locator('.nt-item',{hasText:'overdue invoice'}).click();await p.waitForTimeout(900);
const st=await p.evaluate(()=>[...document.querySelectorAll('.doc-list-tbl tbody tr.click .c-status')].map(e=>e.innerText));
check(await view()==='Invoices'&&/on/.test(await p.locator('.seg button',{hasText:'Overdue'}).getAttribute('class'))&&st.length>0&&st.every(t=>/Overdue/.test(t)),'an item opens the right list, already filtered');

// 4. keyboard shortcuts
await p.locator('body').click({position:{x:700,y:60}});
await p.keyboard.press('Shift+?');await p.waitForTimeout(300);
check(await p.locator('.studio-modal',{hasText:'Keyboard shortcuts'}).count()===1&&await p.locator('.ks-row').count()>=15,'? shows the shortcuts');
await shot('x3-shortcuts');
await p.keyboard.press('Escape');await p.waitForTimeout(300);
await p.keyboard.press('g');await p.waitForTimeout(150);
check(await p.locator('.chord-hint').count()===1,'g shows where you can go');
await p.keyboard.press('b');await p.waitForTimeout(900);
check(await view()==='Vendor bills'&&await p.locator('.chord-hint').count()===0,'g b opens vendor bills');
await p.keyboard.press('g');await p.keyboard.press('d');await p.waitForTimeout(900);
check(await view()==='Dashboard','g d opens the dashboard');
await p.keyboard.press('n');await p.keyboard.press('q');await p.waitForTimeout(900);
check(/^QUO\//.test((await p.locator('.du-no').innerText()).trim()),'n q starts a new quotation');
await p.keyboard.type('gi');await p.waitForTimeout(500);
check(await p.locator('.doc-form').count()===1,'typing in a field never triggers shortcuts');
await p.locator('.du-back').click();await p.waitForTimeout(400);
if(await p.locator('.studio-modal',{hasText:'Save changes'}).count())await p.locator('.studio-modal .btn',{hasText:'Discard'}).click();
await p.waitForTimeout(400);
await p.keyboard.press('Control+k');await p.waitForTimeout(300);
check(await p.locator('.cmdk').count()===1,'Ctrl K opens search');
await p.keyboard.press('Escape');await p.waitForTimeout(200);
await p.keyboard.press('/');await p.waitForTimeout(200);
check(await p.evaluate(()=>document.activeElement&&document.activeElement.getAttribute('aria-label')==='Search navigation'),'/ jumps to the menu search');
await p.keyboard.press('Escape');await p.locator('.page').click({position:{x:5,y:5}});await p.waitForTimeout(200);

// 5. Undo
await nav('payments');
const first=(await p.locator('.tbl tbody tr').first().locator('td').first().innerText()).trim();
const n0=(await books()).payments.length;
await p.locator('.tbl tbody tr').first().locator('button[aria-label^="Delete"]').click();await p.waitForTimeout(300);
check((await books()).payments.length===n0-1&&await p.locator('.toast .toast-act').count()===1,'deleting a receipt offers Undo');
await shot('x4-undo');
await p.locator('.toast .toast-act').click();await p.waitForTimeout(400);
const s1=await books();
check(s1.payments.length===n0&&(await p.locator('.tbl tbody tr').first().locator('td').first().innerText()).trim()===first&&/restored/.test(await p.locator('.toasts').innerText()),'Undo puts it back in place');
// draft document from its More menu
await nav('invoices');await p.locator('.seg button',{hasText:'Draft'}).click();await p.waitForTimeout(300);
await p.locator('.doc-list-tbl tbody tr.click').first().click();await p.waitForTimeout(700);
const dno=(await p.locator('.du-no').innerText()).trim();
await p.locator('.du-more-btn').click();await p.getByRole('menuitem',{name:/^Delete/}).click();await p.waitForTimeout(400);
check(!(await books()).docs.some(d=>d.number===dno),'draft deleted');
await p.locator('.toast .toast-act').last().click();await p.waitForTimeout(500);
check((await books()).docs.some(d=>d.number===dno)&&await p.locator('.doc-list-tbl tbody tr.click',{hasText:dno}).count()===1,'Undo brings the draft back');
await p.waitForTimeout(7600);
check(await p.locator('.toast .toast-act').count()===0,'the Undo offer times out');

// 6. tidy payments table
await nav('payments');
const fit=await p.evaluate(()=>{const w=document.querySelector('.tbl-wrap');const rows=[...document.querySelectorAll('.tbl tbody tr')].slice(0,12).map(r=>r.getBoundingClientRect().height);return {over:w.scrollWidth-w.clientWidth,max:Math.max(...rows)};});
check(fit.over<=1&&fit.max<=64,'payments fit the page with one-line rows ('+JSON.stringify(fit)+')');

// 7. phone
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(400);
check(await p.locator('.bell').isVisible(),'the bell is there on a phone');
await p.locator('.bell').click();await p.waitForTimeout(300);
check(await p.evaluate(()=>{const r=document.querySelector('.notif-pop').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}),'the notification centre fits a phone');
await shot('x5-phone-bell');

console.log(JSON.stringify({ok:ok.length,errors:errs},null,1));
await b.close();process.exit(errs.length?1:0);})();
