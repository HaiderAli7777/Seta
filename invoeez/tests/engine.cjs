const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{transformSync}=require('esbuild'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=['invoeez-source.jsx','enhancements-data.jsx','company-template.jsx','enhancements-ui.jsx','dashboard.jsx','design.jsx','onboarding.jsx','brand-assets.jsx','brand.jsx','clarity.jsx','sidebar.jsx','select.jsx','features.jsx','pdc.jsx','reports.jsx','dash.jsx','compare.jsx','users.jsx','ifrs.jsx','pro.jsx'].concat(['tests/sample-fixture.jsx']).map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const icons=[...fs.readFileSync(path.join(root,'runtime-prefix.js'),'utf8').matchAll(/var ([A-Z]\w+) = __mk/g)].map(m=>m[1]);
const ctx={console,Intl,Date,Math,Number,crypto:require('node:crypto').webcrypto,React:{createContext:v=>v},window:{},setTimeout};icons.forEach(n=>ctx[n]=()=>null);vm.createContext(ctx);
vm.runInContext(transformSync(source,{loader:'jsx',target:'es2020'}).code+`\n globalThis.api={aging,buildSampleBooks,freshBooks,LEGACY_PARTNERS,LEGACY_PRODUCTS,TEMPLATE_ACCOUNTS,TEMPLATE_CATEGORIES,TEMPLATE_EXPENSE_ITEMS,DEMO,migrateBooks,deriveBooks,syncProducts,syncPartners,syncAccounts,syncMethods,pricingFor,productHistory,freezeAccounts,amounts,searchScore,cashMovement,validateStockOperation,PRODUCTS_SEED,DEFAULT_CATEGORIES,TODAY,learnPurchasePrices,nextProductCode,autoCodes,currentCost,PRODUCTS,syncProducts,pdcStatus,pdcEntries,partySpecial,stockMovement,inRange,cmpRange,cmpAsOf,cmpCoverage,mergeRows,chg,pnl,balanceSheet,plStatement,bsStatement,sectionOf,seedGroups,groupsOf,statementCols,generalLedger,settlementsOf,ACC:()=>ACC};`,ctx);
const a=ctx.api;const clean=a.migrateBooks(a.DEMO());assert.equal(clean.docs.length+clean.payments.length+clean.manual.length+clean.stockOps.length,0);assert(!clean.sample&&clean.partners.length===0&&clean.accounts.length>=30&&clean.categories.length>=20);assert.equal(clean.users.length,1);
let s=a.migrateBooks(a.buildSampleBooks(a.TODAY));a.syncAccounts(s.accounts);a.syncProducts(s.products,s.categories);a.syncPartners(s.partners);a.syncMethods(s.methods);
const base=a.deriveBooks(s);assert(base.balanced);for(const e of base.entries)assert(Math.abs(e.lines.reduce((n,l)=>n+l.debit-l.credit,0))<.011,e.number);
const stockBefore=JSON.stringify(base.stock);const arBefore=base.flat.filter(l=>l.acc==='1200').reduce((n,l)=>n+l.debit-l.credit,0);
// Changing category accounts must not rewrite posted transactions.
const g1cat=s.products.find(p=>p.id==='g1').category;s.categories=s.categories.map(c=>c.id===g1cat?{...c,income:'4900',expense:'6900'}:c);a.syncProducts(s.products,s.categories);
const remap=a.deriveBooks(s);assert.equal(JSON.stringify(remap.stock),stockBefore);assert.equal(JSON.stringify(remap.flat.map(l=>[l.acc,l.debit,l.credit])),JSON.stringify(base.flat.map(l=>[l.acc,l.debit,l.credit])));
const invoice=a.freezeAccounts({id:'newinv',number:'INV/TEST',type:'invoice',partner:'p1',date:a.TODAY,due:a.TODAY,state:'posted',seq:9000,lines:[{id:'newl',product:'g1',qty:1,price:3500,disc:10,tax:'s5',desc:'Test'}]});assert.equal(invoice.lines[0].accounts.income,'4900');
const next=a.deriveBooks({...s,docs:[...s.docs,invoice]});assert(next.balanced);assert.equal(next.stock.g1.qty,base.stock.g1.qty-1);assert.equal(a.amounts(invoice).total,3307.5);
assert(a.searchScore('ssd 2tb','NVMe Portable SSD 2TB')>0);assert.equal(a.searchScore('12345','Anything',['12345']),1000);
const pricing={priceLists:[{id:'tier',name:'Trade',side:'sale',active:true,from:'2026-01-01',to:'2026-12-31',rules:[{minQty:1,mode:'percent',value:10},{product:'g1',minQty:5,mode:'fixed',value:3000}]}]};
const p={id:'g1',category:g1cat,price:3450,cost:2480};assert.equal(a.pricingFor(pricing,p,5,'2026-09-28','tier').price,3000);assert.equal(a.pricingFor(pricing,p,2,'2026-09-28','tier').price,3105);assert.equal(a.pricingFor(pricing,p,5,'2027-01-01','tier').price,3450);
assert.equal(a.pricingFor(pricing,p,5,'2026-09-28','tier','purchase').price,2480);
// A pricing refresh must not overwrite manual or historical line discounts.
assert.equal(({disc:12,...a.pricingFor(pricing,p,5,'2026-09-28','tier')}).disc,12);
const v3={...s,schemaVersion:3,discounts:[{id:'legacy',percent:12}],partners:[{id:'partner',discount:'legacy'}],docs:[{...invoice,discount:'legacy'}, {...invoice,id:'draft',state:'draft',discount:'legacy'}],priceLists:pricing.priceLists};
const upgraded=a.migrateBooks(v3);assert.equal(upgraded.schemaVersion,5);assert.equal(upgraded.discounts,undefined);assert.equal(upgraded.partners.find(x=>x.id==='partner').discount,undefined);assert.equal(upgraded.docs[0].discount,undefined);assert.equal(JSON.stringify(upgraded.priceLists),JSON.stringify(pricing.priceLists));assert.equal(upgraded.retiredDiscountRules[0].percent,12);
upgraded.docs.forEach((d,i)=>{assert.equal(JSON.stringify(d.lines),JSON.stringify(v3.docs[i].lines));assert.equal(a.amounts(d).total,a.amounts(v3.docs[i]).total);});assert.equal(a.migrateBooks(upgraded).retiredDiscountRules.length,1);
// Transfers do not count as inflow/outflow; unrelated dates are excluded.
const flow=a.cashMovement([{date:'2026-09-01',lines:[{acc:'bank',debit:100,credit:0},{acc:'cash',debit:0,credit:100}]},{date:'2026-09-02',lines:[{acc:'bank',debit:250,credit:0}]},{date:'2026-09-03',lines:[{acc:'cash',debit:0,credit:80}]},{date:'2026-08-01',lines:[{acc:'bank',debit:10000,credit:0}]}],['bank','cash'],'2026-09-01','2026-09-28');assert.equal(flow.incoming,250);assert.equal(flow.outgoing,80);assert.equal(flow.net,170);
// Count gains and scrap at carrying value; journal must remain balanced.
const qty=next.stock.g1.qty,unit=next.stock.g1.value/qty;
const count={id:'op1',number:'COUNT/TEST',kind:'count',state:'posted',date:a.TODAY,seq:9001,reason:'Physical count',lines:[{id:'ol1',product:'g1',expected:qty,counted:qty+2,delta:2,unit,accounts:{inventory:'1300',adjustment:'6900'}}]};
const counted=a.deriveBooks({...s,docs:[...s.docs,invoice],stockOps:[...s.stockOps,count]});assert(counted.balanced);assert.equal(counted.stock.g1.qty,qty+2);
const scrap={...count,id:'op2',number:'SCRAP/TEST',kind:'scrap',seq:9002,lines:[{...count.lines[0],delta:-1}]};const scrapped=a.deriveBooks({...s,docs:[...s.docs,invoice],stockOps:[...s.stockOps,count,scrap]});assert(scrapped.balanced);assert.equal(scrapped.stock.g1.qty,qty+1);assert(scrapped.entries.find(e=>e.stockOpId==='op2').lines.some(l=>l.acc==='6900'&&l.debit>0));
assert(a.validateStockOperation({kind:'scrap',date:a.TODAY,reason:'Damage',lines:[{product:'g1',counted:100000}]},s,next));assert(a.validateStockOperation({kind:'count',date:a.TODAY,reason:'Count',lines:[{product:'g1',counted:''}]},s,next));
const hist=a.productHistory({...s,docs:[...s.docs,invoice]},'g1','sale','p1','',a.TODAY);assert(hist.some(l=>l.docId==='newinv'&&l.unitNet===3150));assert(!a.productHistory(s,'g1','purchase','p1').length);
// Repeat under FIFO and standard costing, including adjustment events.
for(const costing of ['avco','fifo','standard']){const b=a.deriveBooks({...s,costing,docs:[...s.docs,invoice],stockOps:[...s.stockOps,count,scrap]});assert(b.balanced,costing);assert.equal(b.stock.g1.qty,qty+1);}
assert.equal(a.migrateBooks(s).docs.length,s.docs.length);
// Books saved by 3.2 keep the customers, vendors and products that used to live in code.
const legacy=a.migrateBooks({schemaVersion:4,docs:[],payments:[],manual:[],partners:[{id:'p1',name:'Renamed customer',role:'customer'}],products:[]});
assert.equal(legacy.partners.length,a.LEGACY_PARTNERS.length);assert.equal(legacy.partners.find(p=>p.id==='p1').name,'Renamed customer');assert.equal(legacy.products.length,a.LEGACY_PRODUCTS.length);
assert.equal(a.migrateBooks(legacy).partners.length,legacy.partners.length);
// The sample company is complete, consistent and reproducible for any date.
for(const day of ['2026-01-02','2026-10-01','2027-03-31']){const x=a.buildSampleBooks(day);a.syncAccounts(x.accounts);a.syncProducts(x.products,x.categories);a.syncPartners(x.partners);a.syncMethods(x.methods);
  const bx=a.deriveBooks(x);assert(bx.balanced,day);assert(!bx.moves.some(m=>m.balQty<-0.001),'stock below zero '+day);
  const ids=new Set(x.partners.map(p=>p.id)),pids=new Set(x.products.map(p=>p.id));
  assert(x.docs.every(d=>ids.has(d.partner)&&d.lines.every(l=>pids.has(l.product))),'dangling reference '+day);assert(x.payments.every(p=>ids.has(p.partner)));
  assert(x.docs.every(d=>d.date<=day)&&x.payments.every(p=>p.date<=day)&&x.manual.every(e=>e.date<=day),'future-dated record '+day);
  assert.equal(new Set(x.docs.map(d=>d.number)).size,x.docs.length,'duplicate numbers '+day);
  assert(x.docs.filter(d=>d.type==='invoice').length>150&&x.partners.filter(p=>p.role==='vendor').length>=12&&x.categories.length>=20);}

// A payment recorded against a document settles that document, not the oldest one.
{const cust=s.partners.find(x=>x.role==='customer').id;const mk=(id,no,date,price)=>({id,type:'invoice',number:no,partner:cust,date,due:date,state:'posted',seq:99000+no.length,lines:[{id:id+'l',product:'s1',qty:1,price,disc:0,tax:'nt',desc:'x'}]});
 const base={...s,docs:[mk('ta','INV/T/0001','2020-01-01',100),mk('tb','INV/T/0002','2020-01-02',50)],payments:[],stockOps:[]};
 const open=(st)=>{const r=a.aging(st,'receivable','2030-01-01').rows.find(x=>x.partner.id===cust);return Object.fromEntries((r?r.items:[]).map(i=>[i.id,i.open]));};
 let o=open({...base,payments:[{id:'pa',kind:'in',partner:cust,date:'2020-02-01',amount:50,doc:'tb',account:'1120',method:'m1'}]});assert.equal(o.ta,100);assert.equal(o.tb,undefined);
 o=open({...base,payments:[{id:'pa',kind:'in',partner:cust,date:'2020-02-01',amount:50,account:'1120',method:'m1'}]});assert.equal(o.ta,50);assert.equal(o.tb,50);
 o=open({...base,payments:[{id:'pa',kind:'in',partner:cust,date:'2020-02-01',amount:80,doc:'tb',account:'1120',method:'m1'}]});assert.equal(o.ta,70);assert.equal(o.tb,undefined);
 o=open({...base,docs:[...base.docs,{...mk('tc','CN/T/0001','2020-01-05',50),type:'credit_note',ref:'INV/T/0002'}]});assert.equal(o.ta,100);assert.equal(o.tb,undefined);}
// Quantities typed as text must never corrupt stock (a returned "3" adds 3, it is not appended).
{const q0=a.deriveBooks(s).stock.g1.qty;const cn={id:'cnq',type:'credit_note',number:'CN/Q',partner:s.partners.find(x=>x.role==='customer').id,date:a.TODAY,due:a.TODAY,state:'posted',seq:999999,lines:[{id:'lq',product:'g1',qty:'3',price:'3450',disc:'0',tax:'s5',desc:'x'}]};
 const b=a.deriveBooks({...s,docs:[...s.docs,cn]});assert.equal(b.stock.g1.qty,q0+3);assert(b.balanced);assert.equal(a.amounts(cn).net,10350);}
// Starting fresh keeps the setup and removes every transaction.
const fresh=a.freshBooks(s,{});assert.equal(fresh.docs.length+fresh.payments.length+fresh.manual.length+fresh.stockOps.length,0);
assert.equal(fresh.partners.length,0);assert.equal(fresh.products.length,a.TEMPLATE_EXPENSE_ITEMS.length);assert.equal(fresh.accounts.length,s.accounts.length);assert.equal(fresh.categories.length,s.categories.length);assert.equal(fresh.sample,undefined);
const kept=a.freshBooks(s,{products:true,partners:true});assert.equal(kept.products.length,s.products.length);assert.equal(kept.partners.length,s.partners.length);assert(kept.partners.every(p=>!p.pricelist&&!p.salesman));
a.syncAccounts(fresh.accounts);a.syncProducts(fresh.products,fresh.categories);a.syncPartners(fresh.partners);assert(a.deriveBooks(a.migrateBooks(fresh)).balanced);
{const st=a.migrateBooks(a.DEMO());assert.equal(st.settings.productCodes,'auto');assert(a.autoCodes(st));
const np={id:'np1',name:'New pen',code:'',category:st.categories[0].id,price:10,cost:0,uom:'Units',tax:'s5',type:'goods'};st.products=[np,{...np,id:'np2',name:'Other',code:'P-00007'}];a.syncProducts(st.products,st.categories);
assert.equal(a.nextProductCode(st),'P-00008');assert.equal(a.nextProductCode({settings:{codePrefix:'SKU',codeDigits:3}}),'SKU001');
const bill={id:'b1',type:'bill',state:'posted',lines:[{product:'np1',qty:4,price:6.5,disc:0}]};const learned=a.learnPurchasePrices(st,bill);
assert.equal(learned[0].id,'np1');assert.equal(learned[0].cost,6.5);assert.equal(learned[0].lastPurchase,6.5);
const st2={...st,products:learned,docs:[bill]};a.syncProducts(st2.products,st2.categories);const again=a.learnPurchasePrices(st2,{...bill,id:'b2',lines:[{product:'np1',qty:1,price:8,disc:0}]});
assert.equal(again[0].cost,6.5);assert.equal(again[0].lastPurchase,8);
a.syncProducts(again,st.categories);assert.equal(a.pricingFor(st2,again[0],1,a.TODAY,'','purchase').price,8);}
{/* Post-dated cheques: received, cleared, bounced with charges, returned; issued and cleared */
a.syncAccounts(s.accounts);a.syncProducts(s.products,s.categories);a.syncPartners(s.partners);a.syncMethods(s.methods);
const bal=(b,acc)=>b.flat.filter(l=>l.acc===acc).reduce((n,l)=>n+l.debit-l.credit,0);
const ar=a.aging(s,'receivable',a.TODAY);const row=ar.rows.find(r=>r.items.length);assert(row,'an open invoice exists');const it=row.items[0];
const base=a.deriveBooks(s);const b1210=bal(base,'1210'),bBank=bal(base,'1120'),b6450=bal(base,'6450');
const pdc={id:'pdc1',kind:'in',number:'PDCR/2026/9001',partner:row.partner.id,doc:it.id,chequeNo:'000245',bank:'ENBD',chequeDate:a.TODAY,date:a.TODAY,amount:it.open,events:[]};
const withPdc={...s,pdcs:[pdc]};let b=a.deriveBooks(withPdc);assert(b.balanced);
assert.equal(Math.round((bal(b,'1210')-b1210)*100)/100,it.open);
let row2=a.aging(withPdc,'receivable',a.TODAY).rows.find(r=>r.partner.id===row.partner.id);assert(!row2||!row2.items.some(x=>x.id===it.id),'pdc settles the invoice');
assert.equal(a.pdcStatus(pdc),'hand');
const cleared={...withPdc,pdcs:[{...pdc,events:[{type:'deposited',date:a.TODAY,account:'1120'},{type:'cleared',date:a.TODAY,account:'1120'}]}]};b=a.deriveBooks(cleared);assert(b.balanced);
assert.equal(Math.round((bal(b,'1210')-b1210)*100)/100,0);assert.equal(Math.round((bal(b,'1120')-bBank)*100)/100,it.open);assert.equal(a.pdcStatus(cleared.pdcs[0]),'cleared');
const bounced={...withPdc,pdcs:[{...pdc,events:[{type:'bounced',date:a.TODAY,account:'1120',reason:'Insufficient funds',charges:50}]}]};b=a.deriveBooks(bounced);assert(b.balanced);
assert.equal(Math.round((bal(b,'1210')-b1210)*100)/100,0);assert.equal(Math.round((bal(b,'6450')-b6450)*100)/100,50);assert.equal(Math.round((bal(b,'1120')-bBank)*100)/100,-50);
row2=a.aging(bounced,'receivable',a.TODAY).rows.find(r=>r.partner.id===row.partner.id);assert(row2.items.some(x=>x.id===it.id&&Math.abs(x.open-it.open)<0.01),'bounce reopens the invoice');
const ap=a.aging(s,'payable',a.TODAY).rows.find(r=>r.items.length);if(ap){const bi=ap.items[0];const iss={id:'pdc2',kind:'out',number:'PDCI/2026/9001',partner:ap.partner.id,doc:bi.id,chequeNo:'778',account:'1120',chequeDate:a.TODAY,date:a.TODAY,amount:bi.open,events:[]};
 const s2={...s,pdcs:[iss]};b=a.deriveBooks(s2);assert(b.balanced);assert(!(a.aging(s2,'payable',a.TODAY).rows.find(r=>r.partner.id===ap.partner.id)||{items:[]}).items.some(x=>x.id===bi.id));
 const s3={...s,pdcs:[{...iss,events:[{type:'cleared',date:a.TODAY,account:'1120'}]}]};b=a.deriveBooks(s3);assert(b.balanced);assert.equal(Math.round((bal(b,'1120')-bBank)*100)/100,-bi.open);}
/* Party special beats price list and history; Don't-store lines are skipped by last-price lookup */
const pr=s.products.find(x=>x.kind==='goods'&&x.price>0);const cust=row.partner.id;
const ps={...s,partySpecials:[{id:'ps1',partner:cust,product:pr.id,side:'sale',price:12.34}]};assert.equal(a.pricingFor(ps,pr,1,a.TODAY,'','sale',cust).price,12.34);
assert.equal(a.pricingFor(ps,pr,1,a.TODAY,'','sale',cust).priceSource,'Party special');
const inv1={id:'lp1',number:'INV/LP/1',type:'invoice',partner:cust,date:a.TODAY,due:a.TODAY,state:'posted',seq:99001,lines:[{id:'x1',product:pr.id,qty:1,price:77,disc:0,tax:'s5'}]};
const inv2={...inv1,id:'lp2',number:'INV/LP/2',seq:99002,lines:[{id:'x2',product:pr.id,qty:1,price:55,disc:0,tax:'s5',oneOff:true}]};
const lp={...s,docs:[...s.docs.filter(d=>!(d.type==='invoice'&&d.partner===cust&&d.lines.some(l=>l.product===pr.id))),inv1,inv2]};
assert.equal(a.pricingFor(lp,pr,1,a.TODAY,'','sale',cust).price,77,"don't-store price is skipped");
assert.equal(a.pricingFor({...s,docs:[]},{...pr,price:0},1,a.TODAY,'','sale',cust).price,'','no price stays empty');}
// Fast / slow movers on the dashboard: units, cover and class follow the published rules.
{const sm=a.migrateBooks(a.buildSampleBooks(a.TODAY));a.syncAccounts(sm.accounts);a.syncProducts(sm.products,sm.categories);a.syncPartners(sm.partners);a.syncMethods(sm.methods);
 const bk=a.deriveBooks(sm),from=a.TODAY.slice(0,4)+'-01-01',to=a.TODAY,rows=a.stockMovement(sm,bk,bk.stock,from,to);
 const goods=sm.products.filter(p=>p.kind==='goods');assert.equal(rows.length,goods.length);
 const sold={};sm.docs.filter(d=>d.state==='posted'&&(d.type==='invoice'||d.type==='credit_note')&&a.inRange(d.date,from,to)).forEach(d=>a.amounts(d).lines.forEach(l=>{if(goods.some(g=>g.id===l.product))sold[l.product]=(sold[l.product]||0)+(d.type==='invoice'?1:-1)*+l.qty;}));
 const days=Math.round((Date.parse(to)-Date.parse(from))/864e5)+1;
 for(const r of rows){assert(Math.abs(r.qty-(sold[r.p.id]||0))<.001,'units sold '+r.p.id);
  const want=r.stockQty<=0?(r.qty>0?'fast':'none'):r.qty<=0?'dead':r.cover<=30?'fast':r.cover<=90?'normal':'slow';assert.equal(r.cls,want,r.p.id);
  if(r.qty>0)assert(Math.abs(r.cover-r.stockQty/(r.qty/days))<.01,'cover '+r.p.id);}
 assert(rows.some(r=>r.qty>0)&&rows.some(r=>r.cls==='slow'||r.cls==='dead'),'sample has fast and slow stock');
 const idle=a.stockMovement(sm,bk,bk.stock,'2000-01-01','2000-01-31');assert(idle.every(r=>r.qty===0&&r.cls===(r.stockQty>0?'dead':'none')),'no sales in period → not moving');}
// Compare with: previous period follows the calendar, last year handles leap days, as-at dates, coverage.
{const R=(preset,from,to,mode)=>{const c=a.cmpRange({preset,from,to},mode);return c.from+'..'+c.to;};
 assert.equal(R('mtd','2026-10-01','2026-10-11','prev'),'2026-09-01..2026-09-11');
 assert.equal(R('mtd','2026-03-01','2026-03-31','prev'),'2026-02-01..2026-02-28');
 assert.equal(R('lastm','2026-09-01','2026-09-30','prev'),'2026-08-01..2026-08-31');
 assert.equal(R('qtd','2026-10-01','2026-10-11','prev'),'2026-07-01..2026-07-11');
 assert.equal(R('lastq','2026-07-01','2026-09-30','prev'),'2026-04-01..2026-06-30');
 assert.equal(R('ytd','2026-01-01','2026-10-11','prev'),'2025-01-01..2025-10-11');
 assert.equal(R('fy','2026-01-01','2026-12-31','prev'),'2025-01-01..2025-12-31');
 assert.equal(R('d365','2025-11-01','2026-10-11','prev'),'2024-11-01..2025-10-11');
 assert.equal(R('d30','2026-09-12','2026-10-11','prev'),'2026-08-13..2026-09-11');
 assert.equal(R('d7','2026-10-05','2026-10-11','prev'),'2026-09-28..2026-10-04');
 assert.equal(R('custom','2026-03-01','2026-04-30','prev'),'2026-01-01..2026-02-28');
 assert.equal(R('custom','2026-03-10','2026-03-19','prev'),'2026-02-28..2026-03-09');
 assert.equal(R('custom','2024-02-01','2024-02-29','yoy'),'2023-02-01..2023-02-28');
 assert.equal(R('qtd','2026-10-01','2026-10-11','yoy'),'2025-10-01..2025-10-11');
 assert.equal(a.cmpRange({preset:'ytd',from:'2026-01-01',to:'2026-10-11'},'off'),null);
 const cu=a.cmpRange({preset:'ytd',from:'2026-01-01',to:'2026-10-11',cmpFrom:'2025-12-31',cmpTo:'2025-11-01'},'custom');assert.equal(cu.from+'..'+cu.to,'2025-11-01..2025-12-31');
 const A=(asOf,mode)=>a.cmpAsOf({asOf},mode).asOf;
 assert.equal(A('2026-10-11','pm'),'2026-09-30');assert.equal(A('2026-10-31','pm'),'2026-09-30');assert.equal(A('2026-10-11','ye'),'2025-12-31');assert.equal(A('2024-02-29','yoy'),'2023-02-28');
 const bk={flat:[{date:'2025-11-01'},{date:'2026-05-01'}]};
 assert.equal(a.cmpCoverage(bk,a.cmpRange({preset:'ytd',from:'2026-01-01',to:'2026-10-11'},'prev')).status,'none');
 assert.equal(a.cmpCoverage(bk,a.cmpRange({preset:'qtd',from:'2026-10-01',to:'2026-10-11'},'prev')).status,'full');
 assert.equal(a.cmpCoverage(bk,{from:'2025-10-01',to:'2025-12-31'}).status,'partial');
 assert.equal(a.cmpCoverage(bk,a.cmpAsOf({asOf:'2026-10-11'},'ye')).status,'full');
 assert.equal(a.cmpCoverage({flat:[]},a.cmpAsOf({asOf:'2026-10-11'},'ye')).status,'none');
 const c1=a.chg(150,100),c2=a.chg(80,100,false),c3=a.chg(50,0);assert(c1.pct===50&&c1.good===true);assert(c2.pct===-20&&c2.good===true);assert(c3.pct===null&&c3.dir===1);
 // comparative statement: union of accounts, the earlier column equals the statement for those dates, both sides still balance.
 const sm=a.migrateBooks(a.buildSampleBooks(a.TODAY));a.syncAccounts(sm.accounts);a.syncProducts(sm.products,sm.categories);a.syncPartners(sm.partners);a.syncMethods(sm.methods);const bb=a.deriveBooks(sm);
 const cur=a.pnl(bb.flat,'2026-07-01','2026-09-30'),prev=a.pnl(bb.flat,'2026-04-01','2026-06-30');
 const merged=a.mergeRows([...cur.rev,...cur.cos,...cur.exp],[...prev.rev,...prev.cos,...prev.exp]);
 assert.equal(merged.length,new Set([...cur.rev,...cur.cos,...cur.exp,...prev.rev,...prev.cos,...prev.exp].map(x=>x.acc.code)).size);
 assert(Math.abs(merged.reduce((s,x)=>s+(x.acc.type==='income'?x.prev:-x.prev),0)-prev.net)<.01,'comparison column adds up to the earlier profit');
 const b1=a.balanceSheet(bb.flat,'2026-09-30','2026-01-01'),b0=a.balanceSheet(bb.flat,'2025-12-31','2025-01-01');assert(Math.abs(b1.diff)<.01&&Math.abs(b0.diff)<.01,'both balance sheets balance');}
// IFRS 18 statements: categories, required subtotals, account groups and drill-down figures add up.
{const sm=a.migrateBooks(a.buildSampleBooks(a.TODAY));a.syncAccounts(sm.accounts);a.syncProducts(sm.products,sm.categories);a.syncPartners(sm.partners);a.syncMethods(sm.methods);const bb=a.deriveBooks(sm);
 const ACC=a.ACC(),Y=a.TODAY.slice(0,4);
 assert.equal(a.sectionOf(ACC['6460'],sm),'financing');assert.equal(a.sectionOf(ACC['6950'],sm),'income_tax');assert.equal(a.sectionOf(ACC['4900'],sm),'other_income');
 assert.equal(a.sectionOf(ACC['4100'],sm),'revenue');assert.equal(a.sectionOf(ACC['1110'],sm),'assets');assert.equal(a.sectionOf(ACC['2500'],sm),'liabilities');
 const cols=[{key:'c0',from:Y+'-01-01',to:a.TODAY},{key:'c1',from:(Y-1)+'-01-01',to:(Y-1)+'-12-31'}];
 const st=a.plStatement(bb,sm,cols);
 cols.forEach((c,i)=>{const r=a.pnl(bb.flat,c.from,c.to);assert(Math.abs(st.net[i]-r.net)<.011,'profit for the period = ledger result '+i);
   const S=st.sections;assert(Math.abs(st.op[i]-(S.rev.values[i]+S.cos.values[i]+S.oth.values[i]+S.opx.values[i]))<.011,'operating profit');
   assert(Math.abs(st.net[i]-(st.op[i]+S.inv.values[i]+S.fin.values[i]+S.tax.values[i]))<.011,'categories add up');});
 const finRow=st.rows.find(r=>r.id==='s_financing');assert(finRow&&finRow.children.some(x=>x.code==='6460'),'loan interest sits in financing');
 const seen=new Set();const walk=(xs)=>xs.forEach(x=>{if(x.kind==='account'&&x.code){assert(!seen.has(x.code),'account once: '+x.code);seen.add(x.code);}if(x.children)walk(x.children);});walk(st.rows);
 const g=a.seedGroups(sm);assert(g.some(x=>x.id==='g_cash'&&x.accounts.includes('1110')&&x.parent==='g_ca'),'cash group under current assets');
 const codes=g.flatMap(x=>x.accounts);assert.equal(codes.length,new Set(codes).size);
 const bcols=[{key:'c0',asOf:a.TODAY},{key:'c1',asOf:(Y-1)+'-12-31'}],bs=a.bsStatement(bb,sm,bcols);
 bs.diff.forEach((d,i)=>assert(Math.abs(d)<.011,'financial position balances '+i));
 const b0=a.balanceSheet(bb.flat,a.TODAY,Y+'-01-01');assert(Math.abs(bs.ta[0]-b0.totA)<.011&&Math.abs(bs.te[0]-b0.totE)<.011,'same totals as the ledger balance sheet');
 // own groups: Petty cash inside Cash and cash equivalents; moving an account moves its balance
 const own={...sm,accountGroups:[...g.map(x=>({...x,accounts:x.accounts.filter(c=>c!=='1110')})),{id:'gp',name:'Petty cash',section:'assets',parent:'g_cash',accounts:['1110']}]};
 const bs2=a.bsStatement(bb,own,bcols);const find=(xs,id)=>{for(const x of xs){if(x.id===id)return x;if(x.children){const f=find(x.children,id);if(f)return f;}}};
 const pc=find(bs2.rows,'gp'),cash=find(bs2.rows,'g_cash');assert(pc&&cash&&cash.children.includes(pc),'petty cash nested in cash');
 assert(Math.abs(pc.values[0]-(bs.rows.length&&find(bs.rows,'a1110').values[0]))<.011,'petty cash carries the account balance');
 assert(Math.abs(bs2.ta[0]-bs.ta[0])<.011,'regrouping never changes totals');
 // IFRS category override moves an account between categories without changing profit
 const moved={...sm,ifrs:{'6600':'investing'}},st3=a.plStatement(bb,moved,cols);
 assert(Math.abs(st3.net[0]-st.net[0])<.011&&st3.op[0]>st.op[0],'category change moves the line, not the profit');
 // P&L accounts start each year at zero in the ledger drill-down
 const gl=a.generalLedger(bb.flat,'6100',Y+'-01-01',a.TODAY);assert.equal(gl.open,0);
 const plLine=st.rows.find(r=>r.id==='s_operating_expenses');assert(plLine);
 // statement columns: N previous months, oldest first when asked
 const sc=a.statementCols(bb,{preset:'mtd',from:a.TODAY.slice(0,8)+'01',to:a.TODAY,cmp:'prev',cmpN:3,cmpOrder:'asc'},false);
 assert.equal(sc.cols.length,4);assert.equal(sc.cols[3].key,'c0');assert(sc.cols[0].from<sc.cols[1].from&&sc.cols[1].from<sc.cols[2].from,'oldest first');}
// Payments on a document agree with the aged receivable / payable, and add up.
{const sm=a.migrateBooks(a.buildSampleBooks(a.TODAY));a.syncAccounts(sm.accounts);a.syncProducts(sm.products,sm.categories);a.syncPartners(sm.partners);a.syncMethods(sm.methods);
 for(const kind of ['receivable','payable']){const ag=a.aging(sm,kind,a.TODAY),open={};ag.rows.forEach(r=>r.items.forEach(x=>open[x.id]=x.open));
  sm.docs.filter(d=>d.state==='posted'&&d.type===(kind==='receivable'?'invoice':'bill')).forEach(d=>{const s=a.settlementsOf(sm,d);
   assert(s,'settlement for '+d.number);assert(Math.abs(s.open-(open[d.id]||0))<.011,'balance matches aging '+d.number+' '+s.open+' vs '+(open[d.id]||0));
   assert(Math.abs(s.paid-s.items.reduce((n,x)=>n+x.amount,0))<.011,'listed settlements add up '+d.number);assert(Math.abs(s.total-s.paid-s.open)<.011);});}
 const inv=sm.docs.find(d=>d.state==='posted'&&d.type==='invoice'&&a.settlementsOf(sm,d).open>100);
 const before=a.settlementsOf(sm,inv);const sm2={...sm,payments:[...sm.payments,{id:'tp',kind:'in',number:'RCPT/T/1',partner:inv.partner,date:a.TODAY,amount:50,method:'m1',account:'1120',doc:inv.id}]};
 const after=a.settlementsOf(sm2,inv);assert(Math.abs(before.open-after.open-50)<.011&&after.items.some(x=>x.number==='RCPT/T/1'&&x.direct),'a receipt against the invoice settles it first');
 assert.equal(a.settlementsOf(sm,{...inv,state:'draft'}),null);}
console.log('PASS: document payments and balance due, IFRS 18 statements, account groups and drill-down, report comparison periods and comparative statements, dashboard fast/slow movers, post-dated cheques (received, cleared, bounced with charges, issued), party specials, last price, empty price, product codes, first-purchase cost, last purchase price, clean new company, document-specific settlement, sample fixture, legacy master-data migration, start-fresh template, ledger balance, historical account preservation, inherited accounts, pricing tiers, date validity, manual discounts, retired-rule migration, cash movement, stock counts, scrap, costing methods, validation, search and history.');
