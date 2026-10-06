const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{transformSync}=require('esbuild'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=['invoeez-source.jsx','enhancements-data.jsx','company-template.jsx','enhancements-ui.jsx','dashboard.jsx','design.jsx','onboarding.jsx','brand-assets.jsx','brand.jsx','clarity.jsx'].concat(['tests/sample-fixture.jsx']).map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const icons=[...fs.readFileSync(path.join(root,'runtime-prefix.js'),'utf8').matchAll(/var ([A-Z]\w+) = __mk/g)].map(m=>m[1]);
const ctx={console,Intl,Date,Math,Number,crypto:require('node:crypto').webcrypto,React:{createContext:v=>v},window:{},setTimeout};icons.forEach(n=>ctx[n]=()=>null);vm.createContext(ctx);
vm.runInContext(transformSync(source,{loader:'jsx',target:'es2020'}).code+`\n globalThis.api={aging,buildSampleBooks,freshBooks,LEGACY_PARTNERS,LEGACY_PRODUCTS,TEMPLATE_ACCOUNTS,TEMPLATE_CATEGORIES,TEMPLATE_EXPENSE_ITEMS,DEMO,migrateBooks,deriveBooks,syncProducts,syncPartners,syncAccounts,syncMethods,pricingFor,productHistory,freezeAccounts,amounts,searchScore,cashMovement,validateStockOperation,PRODUCTS_SEED,DEFAULT_CATEGORIES,TODAY};`,ctx);
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
console.log('PASS: clean new company, document-specific settlement, sample fixture, legacy master-data migration, start-fresh template, ledger balance, historical account preservation, inherited accounts, pricing tiers, date validity, manual discounts, retired-rule migration, cash movement, stock counts, scrap, costing methods, validation, search and history.');
