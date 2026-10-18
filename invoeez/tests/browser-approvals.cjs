/* 3.11: one-piece document header (identity, progress, grouped actions, More menu, fields in one card) and one-level purchase-order approval
   (approver flag on users, submit / approve / reject with reason / withdraw / resubmit, no self-approval while another approver exists,
   dashboard + bell + list reminders, confirm directly with no approvers, convert to bill, PO printout) (needs tests/fixture.json). Run: node tests/browser-approvals.cjs */
const { chromium } = require('/opt/node-tools/node_modules/playwright');const path=require('path'),fs=require('fs');
const HTML=process.env.HTML||path.resolve(__dirname,'../invoeez.html'),fx=fs.readFileSync(process.env.FX||path.join(__dirname,'fixture.json'),'utf8');
const SHOTS=process.env.SHOTS||'';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[],ok=[];const check=(c,m)=>(c?ok:errs).push(m);
const ctx=await b.newContext({viewport:{width:1440,height:950},acceptDownloads:true});
await ctx.addInitScript((fx)=>{try{if(!localStorage.getItem('fx-loaded')){localStorage.clear();localStorage.setItem('mizan.sidebar','pinned');localStorage.setItem('mizan.navgroups','{}');localStorage.setItem('mizan.books.v2',fx);localStorage.setItem('fx-loaded','1');}}catch(e){}},fx);
const p=await ctx.newPage();p.on('pageerror',e=>errs.push('PAGE '+e.message));await p.goto('file://'+HTML);await p.waitForTimeout(1400);
const shot=async(n)=>{if(SHOTS)await p.screenshot({path:path.join(SHOTS,n+'.png')});};
const books=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('mizan.books.v2')));
const nav=async(k)=>{await p.locator(`.sbar [data-k="${k}"]`).first().click();await p.waitForTimeout(900);};
const as=async(name)=>{const s=await books();const u=s.users.find(x=>x.name===name);await p.evaluate(id=>{sessionStorage.setItem('mizan.me',id);localStorage.setItem('mizan.me',id);},u.id);await p.reload();await p.waitForTimeout(1300);};
const who=async()=>(await p.locator('.sb-foot .who b').innerText()).trim();
const state=async(no)=>(await books()).docs.find(d=>d.number===no);
const btn=(t)=>p.locator('.du-acts .btn',{hasText:t});
const openPO=async(no)=>{await nav('purchase_orders');await p.locator('input[placeholder*="Search"]').first().fill(no);await p.waitForTimeout(300);await p.locator('.doc-list-tbl tbody tr.click',{hasText:no}).first().click();await p.waitForTimeout(700);};
const newPO=async(vendor,code,qty)=>{await nav('purchase_orders');await p.locator('.btn.pri',{hasText:'New purchase order'}).click();await p.waitForTimeout(600);
  await p.keyboard.type(vendor);await p.locator('.picker-pop [role=option]').first().waitFor();await p.keyboard.press('Enter');await p.waitForTimeout(300);
  await p.locator('[data-line-id] input[role="combobox"]').first().click();await p.keyboard.type(code);await p.locator('.picker-pop [role=option]').first().waitFor();await p.keyboard.press('Enter');await p.waitForTimeout(300);
  await p.locator('[data-line-id] .q-qty').first().fill(String(qty));await p.waitForTimeout(150);
  return (await p.locator('.du-no').innerText()).trim();};

// ---------- 1. the document header is one unit ----------
await nav('invoices');await p.locator('.doc-list-tbl tbody tr.click').nth(2).click();await p.waitForTimeout(700);
const unit=await p.evaluate(()=>{const u=document.querySelector('.doc-unit');if(!u)return null;const r=(s)=>{const e=u.querySelector(s);return e&&e.getBoundingClientRect();};
  const acts=[...u.querySelectorAll('.du-acts > .btn, .du-acts > .du-more > .btn')].map(e=>Math.round(e.getBoundingClientRect().top));
  return {h1:!!u.querySelector('h1 .pill'),fields:!!u.querySelector('.document-fields input, .document-fields [role=combobox]'),steps:u.querySelectorAll('.du-steps li').length,
    oneRow:new Set(acts).size===1,n:acts.length,primary:[...u.querySelectorAll('.du-acts .btn.pri')].map(e=>e.textContent.trim()),total:u.querySelector('.du-amt b').textContent,
    detailsCard:[...document.querySelectorAll('.card-h h3')].some(h=>h.textContent==='Document details')};});
check(unit&&unit.h1&&unit.fields,'identity, status and fields sit in one card');
check(unit&&!unit.detailsCard,'no separate “Document details” card');
check(unit&&unit.oneRow&&unit.n<=5,'actions sit on one row ('+(unit&&unit.n)+' buttons)');
check(unit&&unit.primary.length===1&&unit.primary[0]==='Post to ledger','one primary action on a draft invoice');
check(unit&&unit.steps===3,'draft invoice shows Draft · Posted · Paid progress');
await p.locator('.du-more-btn').click();await p.waitForTimeout(200);
const menu=await p.locator('.du-menu [role=menuitem]').allInnerTexts();
check(menu.some(t=>/Duplicate/.test(t))&&menu.some(t=>/Delete/.test(t)),'More holds Duplicate and Delete ('+menu.map(t=>t.split('\n')[0]).join(', ')+')');
await p.keyboard.press('Escape');await p.waitForTimeout(150);
check(await p.locator('.du-menu').count()===0,'Escape closes the More menu');
// posted invoice: Record payment is the primary, rare actions in More
await nav('invoices');await p.locator('.seg button',{hasText:'Unpaid'}).click();await p.waitForTimeout(300);await p.locator('.doc-list-tbl tbody tr.click').first().click();await p.waitForTimeout(700);
check((await p.locator('.du-acts .btn.pri').innerText()).trim()==='Record payment','posted unpaid invoice: Record payment is the main action');
await p.locator('.du-more-btn').click();await p.waitForTimeout(200);
const menu2=(await p.locator('.du-menu [role=menuitem]').allInnerTexts()).map(t=>t.split('\n')[0]);
check(['Post-dated cheque','Credit note','Duplicate','Reset to draft'].every(x=>menu2.includes(x)),'posted invoice More: '+menu2.join(', '));
await p.mouse.click(5,500);await p.waitForTimeout(150);
check(await p.locator('.du-menu').count()===0,'clicking away closes the More menu');
// quotation: status is a segmented control
await nav('quotes');await p.locator('.seg button',{hasText:'Draft'}).click();await p.waitForTimeout(300);await p.locator('.doc-list-tbl tbody tr.click').first().click();await p.waitForTimeout(700);
const qno=(await p.locator('.du-no').innerText()).trim();
await p.locator('.du-seg button',{hasText:'Sent'}).click();await p.waitForTimeout(300);
check((await state(qno)).state==='sent'&&/Sent/.test(await p.locator('.doc-unit h1 .pill').innerText()),'quotation status set from the status control');
await p.locator('.du-seg button',{hasText:'Accepted'}).click();await p.waitForTimeout(300);
check((await state(qno)).state==='accepted','quotation accepted');
await shot('a1-quote-header');
await btn('Convert to invoice').click();await p.waitForTimeout(900);
const inv=(await p.locator('.du-no').innerText()).trim();
check(/^INV\//.test(inv)&&(await p.locator('.du-sub',{hasText:qno}).count())===1,'invoice raised from the quotation links back to it ('+inv+')');
const q2=await state(qno);check(q2.state==='invoiced'&&(await books()).docs.find(d=>d.id===q2.invoiceId).number===inv,'quotation remembers its invoice');

// ---------- 2. approvers on the user form ----------
await nav('users');
const addUser=async(name,role,approver)=>{await p.locator('.btn.pri',{hasText:'New user'}).click();await p.waitForTimeout(200);
  await p.locator('.fld',{hasText:'Full name'}).locator('input').fill(name);await p.locator('.pick',{hasText:role}).first().click();
  if(approver)await p.locator('.appr-toggle').click();await p.locator('.btn.pri',{hasText:'Create user'}).click();await p.waitForTimeout(400);};
await addUser('Aisha Khan','Accountant',true);
await addUser('Omar Saeed','Viewer',true);
await addUser('Sam Clerk','Purchase clerk',false);
let s=await books();
check(s.users.find(u=>u.name==='Aisha Khan').approver===true&&s.users.find(u=>u.name==='Omar Saeed').approver===true&&!s.users.find(u=>u.name==='Sam Clerk').approver,'approver flag saved on the user');
check(await p.locator('tr',{hasText:'Aisha Khan'}).locator('.su-appr').count()===1&&await p.locator('tr',{hasText:'Sam Clerk'}).locator('.su-appr').count()===0,'approvers are marked in the user list');
check(/2 purchase approvers/.test(await p.locator('.card',{hasText:'People'}).first().locator('.card-h p').innerText()),'people card counts approvers');
await shot('a2-users');

// ---------- 3. raise and submit as the clerk ----------
await as('Sam Clerk');check(await who()==='Sam Clerk','signed in as the clerk');
const po1=await newPO('Shenzhen','LT-EB14',5);
check(/Aisha Khan or Omar Saeed/.test(await p.locator('.du-note').innerText()),'draft PO says who can approve');
check((await btn('Submit for approval').count())===1,'clerk sees Submit for approval');
await btn('Submit for approval').click();await p.waitForTimeout(500);
let d1=await state(po1);
check(d1.state==='pending'&&d1.requestedBy===s.users.find(u=>u.name==='Sam Clerk').id&&d1.history.some(h=>h.act==='submitted'),'PO is awaiting approval, raised by the clerk');
check(/Awaiting approval/.test(await p.locator('.doc-unit h1 .pill').innerText()),'status shows Awaiting approval');
check(await btn('Approve').count()===0&&await btn('Withdraw').count()===1,'the requester cannot approve but can withdraw');
check(await p.locator('.doc-unit input[role=combobox]').first().isDisabled(),'a PO awaiting approval is locked');
await btn('Withdraw').click();await p.waitForTimeout(400);
check((await state(po1)).state==='draft','withdrawn back to draft');
await btn('Submit for approval').click();await p.waitForTimeout(400);
await shot('a3-po-pending-requester');
// nothing reaches the ledger
const flatHas=await p.evaluate((no)=>{const s=JSON.parse(localStorage.getItem('mizan.books.v2'));return !!s.docs.find(d=>d.number===no);},po1);
check(flatHas,'PO saved');

// ---------- 4. approver rejects with a reason ----------
await as('Aisha Khan');
check(await p.locator('.appr-inbox').count()===1&&/1 purchase order is waiting for your approval/.test(await p.locator('.appr-inbox').innerText())&&(await p.locator('.appr-inbox').innerText()).includes(po1),'dashboard reminds the approver');
check(+(await p.locator('.bell .dot').innerText())>=1,'bell counts the approval');
await shot('a4-dashboard-inbox');
await p.locator('.appr-inbox .btn',{hasText:'Review all'}).click();await p.waitForTimeout(800);
check(/on/.test(await p.locator('.seg button',{hasText:'Awaiting approval'}).getAttribute('class'))&&await p.locator('.doc-list-tbl tbody tr.click').count()===1,'Review all opens the Awaiting approval filter');
check(await p.locator('.po-mine',{hasText:'Needs your approval'}).count()===1,'list marks orders that need my approval');
await shot('a5-po-list');
await p.locator('.doc-list-tbl tbody tr.click').first().click();await p.waitForTimeout(700);
check(await btn('Approve').count()===1&&await btn('Reject').count()===1,'approver sees Approve and Reject');
await btn('Reject').click();await p.waitForTimeout(300);
check(await p.locator('.studio-modal .btn',{hasText:'Reject order'}).isDisabled(),'a reason is required to reject');
await p.locator('.studio-modal textarea').fill('Price above the agreed rate');await p.locator('.studio-modal .btn',{hasText:'Reject order'}).click();await p.waitForTimeout(500);
d1=await state(po1);
check(d1.state==='rejected'&&d1.history.some(h=>h.act==='rejected'&&h.note==='Price above the agreed rate'&&h.name==='Aisha Khan'),'rejection stored with reason and approver');

// ---------- 5. requester fixes and resubmits; another approver approves ----------
await as('Sam Clerk');await openPO(po1);
check(/Price above the agreed rate/.test(await p.locator('.du-note').innerText())&&/Rejected/.test(await p.locator('.doc-unit h1 .pill').innerText()),'requester sees the rejection reason');
await shot('a6-po-rejected');
await p.locator('[data-line-id] .q-price').first().fill('3000');await p.waitForTimeout(150);
await btn('Resubmit for approval').click();await p.waitForTimeout(500);
check((await state(po1)).state==='pending','resubmitted');
await as('Omar Saeed');
check(await p.locator('.sbar [data-k="purchase_orders"]').count()>=1,'a viewer who is an approver can reach purchase orders');
await nav('purchase_orders');check(await p.locator('.btn.pri',{hasText:'New purchase order'}).count()===0&&await p.locator('.sbar .sb-add[aria-label="Create new: Purchase orders"]').count()===0,'a Viewer approver cannot raise orders');
await openPO(po1);
check(await btn('Approve').count()===1,'any approver can approve (Omar)');
check(await p.locator('.du-more-btn').count()===0&&await btn('Save draft').count()===0&&await p.locator('.doc-unit input[role=combobox]').first().isDisabled(),'a Viewer approver can only approve or reject');
await shot('a7-po-pending-approver');
await btn('Approve').click();await p.waitForTimeout(500);
d1=await state(po1);
check(d1.state==='approved'&&d1.history.filter(h=>h.act==='approved').pop().name==='Omar Saeed','approved by Omar');
check(/Approved by Omar Saeed/.test(await p.locator('.du-note').innerText()),'approval shown on the order');
await p.locator('.doc-tabs button',{hasText:'Approval & activity'}).click();await p.waitForTimeout(300);
const tl=await p.locator('.tl').innerText();
check(/Submitted for approval/.test(tl)&&/Rejected/.test(tl)&&/Price above the agreed rate/.test(tl)&&/Approved/.test(tl),'activity tab shows the approval trail');
await shot('a8-po-activity');
await p.locator('.doc-tabs button',{hasText:'Line items'}).click();

// ---------- 6. print, send, convert to bill ----------
await as('Sam Clerk');await openPO(po1);
await btn('Print / send').click();await p.waitForTimeout(700);
const sheet=await p.locator('.sheet').innerText();
check(/Purchase Order/i.test(sheet)&&/Approved by Omar Saeed/.test(sheet)&&/ORDER TOTAL/i.test(sheet)&&/Vendor/i.test(sheet)&&!/Tax Invoice/i.test(sheet),'printed purchase order');
await shot('a9-po-print');
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:8000}).catch(()=>null),p.locator('.btn',{hasText:'Download PDF'}).first().click()]);
const pdf=dl?fs.readFileSync(await dl.path()).toString('latin1'):'';
check(/PURCHASE ORDER/.test(pdf)&&/ORDER TOTAL/.test(pdf)&&/Approved by Omar Saeed/.test(pdf),'PO PDF');
await p.locator('.btn',{hasText:'Close'}).first().click();await p.waitForTimeout(300);
await p.locator('.du-more-btn').click();await p.locator('[role=menuitem]',{hasText:'Mark as sent to vendor'}).click();await p.waitForTimeout(400);
check((await state(po1)).state==='sent','marked as sent to the vendor');
const before=(await books()).docs.filter(d=>d.type==='bill').length;
await btn('Convert to bill').click();await p.waitForTimeout(900);
s=await books();const bill=s.docs.filter(d=>d.type==='bill').length===before+1&&s.docs.find(d=>d.type==='bill'&&d.origin&&d.origin.number===po1);
d1=s.docs.find(d=>d.number===po1);
check(bill&&bill.state==='draft'&&d1.state==='billed'&&d1.billId===bill.id,'converted to a draft bill and the PO is billed');
check((await p.locator('.du-no').innerText()).trim()===bill.number&&(await p.locator('.du-sub',{hasText:po1}).count())===1,'the bill opens and links back to '+po1);
check(bill.lines.length===1&&+bill.lines[0].price===3000&&+bill.lines[0].qty===5,'bill carries the approved lines');
await nav('purchase_orders');await p.locator('.doc-list-tbl tbody tr.click',{hasText:po1}).click();await p.waitForTimeout(600);
check((await btn('Open '+bill.number).count())===1,'billed PO offers Open '+bill.number);

// ---------- 7. no self-approval while another approver exists ----------
await as('Aisha Khan');
const po2=await newPO('Emirates Computer','LT-TP15',2);
check(/Omar Saeed/.test(await p.locator('.du-note').innerText())&&!/Aisha Khan or/.test(await p.locator('.du-note').innerText()),'Aisha’s own order goes to Omar');
await btn('Submit for approval').click();await p.waitForTimeout(400);
check(await btn('Approve').count()===0,'Aisha cannot approve her own order');
check(await p.locator('.appr-inbox').count()===0,'…and it is not in her approval inbox');
// Omar deactivated: Aisha becomes the only approver
await as('Administrator');await nav('users');await p.locator('tr',{hasText:'Omar Saeed'}).locator('button[title="Suspend"]').click();await p.waitForTimeout(300);
await as('Aisha Khan');await openPO(po2);
check(await btn('Approve').count()===1,'with no other approver, Aisha can approve her own order');
await btn('Approve').click();await p.waitForTimeout(400);
check((await state(po2)).state==='approved','approved by the only approver');
const po3=await newPO('Falcon','LT-LAT54',1);
check((await btn('Approve order').count())===1,'the only approver approves new orders directly');
await btn('Approve order').click();await p.waitForTimeout(400);
check((await state(po3)).state==='approved','approved in one step');

// ---------- 8. no approvers at all: confirm directly ----------
await as('Administrator');await nav('users');
for(const n of ['Aisha Khan']){await p.locator('tr',{hasText:n}).locator('button[title="Edit"]').click();await p.waitForTimeout(200);await p.locator('.appr-toggle').click();await p.locator('.btn.pri',{hasText:'Save changes'}).click();await p.waitForTimeout(300);}
check(/no purchase approver yet/.test(await p.locator('.card',{hasText:'People'}).first().locator('.card-h p').innerText()),'no approvers left');
const po4=await newPO('Shenzhen','LT-EB14',1);
check(/No purchase approvers are set up/.test(await p.locator('.du-note').innerText())&&(await btn('Confirm order').count())===1,'without approvers an order is confirmed directly');
await btn('Confirm order').click();await p.waitForTimeout(400);
const d4=await state(po4);check(d4.state==='approved'&&d4.history.some(h=>h.act==='confirmed'),'confirmed and logged');

// ---------- 9. ledger untouched by purchase orders ----------
s=await books();
check(s.docs.filter(d=>d.type==='purchase_order').every(d=>d.state!=='posted'),'purchase orders never post');

// ---------- 10. phone width ----------
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);
await p.evaluate(()=>window.scrollTo(0,0));
const over=await p.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
check(over<=1,'no sideways scroll on a phone ('+over+')');
const ph=await p.evaluate(()=>{const a=[...document.querySelectorAll('.du-acts .btn, .doc-unit')].map(e=>e.getBoundingClientRect());return a.every(r=>r.right<=391&&r.left>=0);});
check(ph,'header actions fit a phone');
await shot('a10-phone');

console.log(JSON.stringify({ok:ok.length,errors:errs},null,1));
await b.close();process.exit(errs.length?1:0);})();
