/* Mizan Studio 3 — additive schema, pricing, inventory and search helpers. */
const DEFAULT_CATEGORIES = [
  {id:'cat_goods',name:'Trading goods',income:'4100',expense:'5100',inventory:'1300',adjustment:'6900'},
  {id:'cat_services',name:'Professional services',income:'4200',expense:'5200',inventory:'1300',adjustment:'6900'},
  ...[['6200','Rent'],['6400','Freight & clearing'],['6500','Professional expenses'],['6600','Marketing']].map(([expense,name])=>({id:'cat_'+expense,name,income:'4900',expense,inventory:'1300',adjustment:'6900'}))
];
let CATEGORIES = DEFAULT_CATEGORIES;
const categoryOf = p => CATEGORIES.find(c=>c.id===p?.category);
const productText = p => p ? [p.id,p.code,p.barcode,p.name,p.brand,p.packing,categoryOf(p)?.name,p.uom].filter(Boolean).join(' ') : '';
const normSearch = s => String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function searchScore(q, values, exact=[]) {
  const n=normSearch(q), text=normSearch(values);
  if(!n) return 1;
  if(exact.some(v=>normSearch(v)===n))return 1000;
  const tokens=n.split(/\s+/).filter(Boolean);
  if(!tokens.every(t=>text.includes(t)))return 0;
  return text.startsWith(n)?100:50+tokens.filter(t=>text.split(/[^a-z0-9]+/).some(w=>w.startsWith(t))).length;
}
// Group cash at entry level so transfers between bank accounts do not inflate turnover.
function cashMovement(entries, codes, from, to) {
  let incoming=0,outgoing=0;
  entries.filter(e=>inRange(e.date,from,to)).forEach(e=>{
    const net=R2(e.lines.filter(l=>codes.includes(l.acc)).reduce((sum,l)=>sum+l.debit-l.credit,0));
    if(net>0)incoming+=net;else outgoing-=net;
  });
  return {incoming:R2(incoming),outgoing:R2(outgoing),net:R2(incoming-outgoing)};
}
const newProduct = () => ({id:uid('pr'),code:'',barcode:'',name:'',brand:'',category:'cat_goods',packing:'',kind:'goods',uom:'Units',price:0,cost:0,tax:'s5',income:'4100',expense:'5100',inventory:'1300',reorder:5,custom:true});
const newPartner = (role='customer') => ({id:uid('p'),name:'',role,trn:'',emirate:'Dubai',address:'',address2:'',contact:'',phone:'',terms:30,salesman:'',pricelist:'',custom:true});
function enrichProduct(p) {
  const category=p.category || (p.kind==='goods'?'cat_goods':p.code?.startsWith('EX-')?'cat_'+p.expense:'cat_services');
  const c=CATEGORIES.find(c=>c.id===category);
  return {...p,category,barcode:p.barcode||'',brand:p.brand||'',packing:p.packing||'',reorder:p.reorder??5,
    income:c?.income||p.income,expense:c?.expense||p.expense,inventory:c?.inventory||p.inventory||A.INV,adjustment:c?.adjustment||'6900'};
}
const accountSnapshot = p => ({income:p?.income||'4100',expense:p?.expense||'6900',inventory:p?.inventory||A.INV,adjustment:p?.adjustment||'6900'});
function freezeAccounts(d) {return {...d,lines:d.lines.map(l=>({...l,accounts:l.accounts||accountSnapshot(PROD[l.product])}))};}
function migrateBooks(raw) {
  const s={docs:[],payments:[],manual:[],accounts:[],partners:[],products:[],assets:[],methods:[],users:SEED_USERS,einv:{},costing:'avco',...raw};
  s.categories=raw.categories||DEFAULT_CATEGORIES.map(c=>({...c}));
  s.priceLists=raw.priceLists||[];s.stockOps=raw.stockOps||[];s.brands=raw.brands||[];s.settings={productCodes:'auto',codePrefix:'P-',codeDigits:5,...(raw.settings||{})};
  s.salespeople=raw.salespeople||SEED_USERS.filter(u=>['admin','sales'].includes(u.role)).map(u=>({id:u.id,name:u.name,active:true}));
  // Capture the original accounts before category inheritance is applied.
  if((raw.schemaVersion||0)<3){
    const old=Object.fromEntries([...LEGACY_PRODUCTS,...s.products].map(p=>[p.id,p]));
    Object.values(old).forEach(p=>{
      if(p.category)return;
      const match=s.categories.find(c=>c.income===p.income&&c.expense===p.expense&&c.inventory===(p.inventory||A.INV));
      let c=match;
      if(!c){c={id:'cat_legacy_'+p.income+'_'+p.expense+'_'+(p.inventory||A.INV),name:'Legacy accounts '+p.income+' / '+p.expense,income:p.income,expense:p.expense,inventory:p.inventory||A.INV,adjustment:'6900'};s.categories.push(c);}
      const existing=s.products.find(x=>x.id===p.id);
      if(existing)existing.category=c.id;
      else if(c.id.startsWith('cat_legacy_'))s.products.push({...p,category:c.id});
    });
    s.docs=s.docs.map(d=>d.state==='posted'?{...d,lines:d.lines.map(l=>({...l,accounts:l.accounts||accountSnapshot(old[l.product])}))}:d);
  }
  // Retire master rules without altering any saved line price, discount or total.
  if((raw.schemaVersion||0)<4){
    if(raw.discounts?.length)s.retiredDiscountRules=[...(raw.retiredDiscountRules||[]),...raw.discounts];
    const detach=record=>{const {discount,...rest}=record;return rest;};
    s.partners=s.partners.map(detach);s.docs=s.docs.map(detach);
  }
  delete s.discounts;
  // Schema 5: customers, vendors and products moved from code into the books.
  if((raw.schemaVersion||0)<5){
    const have=(list,id)=>list.some(x=>x.id===id);
    s.partners=[...LEGACY_PARTNERS.filter(p=>!have(s.partners,p.id)).map(p=>({...p})),...s.partners];
    s.products=[...LEGACY_PRODUCTS.filter(p=>!have(s.products,p.id)).map(p=>({...p})),...s.products];
  }
  s.schemaVersion=5;return s;
}
function pricingFor(state, product, qty, date, listId, side='sale') {
  const lastBuy=+product.lastPurchase||0;
  let price=side==='sale'?+product.price:(lastBuy||+product.cost),source=side==='sale'?'Product price':lastBuy?'Last purchase price':'Product cost';
  const valid=r=>r.active!==false&&(!r.from||r.from<=date)&&(!r.to||r.to>=date);
  const pl=(state.priceLists||[]).find(x=>x.id===listId&&valid(x)&&x.side===side);
  if(pl){
    const eligible=(pl.rules||[]).filter(r=>(!r.product||r.product===product.id)&&(!r.category||r.category===product.category)&&(+qty>=+r.minQty));
    eligible.sort((a,b)=>(!!b.product-!!a.product)|| (!!b.category-!!a.category)||(+b.minQty-+a.minQty));
    const r=eligible[0];
    if(r){price=r.mode==='fixed'?+r.value:(side==='sale'?+product.price:+product.cost||lastBuy)*(1-(+r.value)/100);source=pl.name;}
  }
  return {price:R2(price),priceSource:source};
}
function productHistory(state,pid,side,partner='',exclude='',before='9999-12-31') {
  const type=side==='sale'?'invoice':'bill';
  return state.docs.filter(d=>d.type===type&&d.state==='posted'&&d.id!==exclude&&d.date<=before&&(!partner||d.partner===partner))
    .flatMap(d=>amounts(d).lines.filter(l=>l.product===pid).map(l=>({...l,date:d.date,number:d.number,docId:d.id,partner:d.partner,unitNet:R2(l.price*(1-(l.disc||0)/100))})))
    .sort((a,b)=>b.date.localeCompare(a.date)||b.number.localeCompare(a.number));
}
const saveMaster=(setState,key,rec)=>setState(s=>({...s,[key]:(s[key]||[]).some(x=>x.id===rec.id)?s[key].map(x=>x.id===rec.id?rec:x):[...(s[key]||[]),rec]}));
function scrollPageTop(){document.querySelector('.page')?.scrollTo({top:0,left:0,behavior:'instant'});}

/* A posted bill teaches each product its purchase price: the last price paid is remembered for the
   next bill, and a product bought for the first time takes that price as its cost. */
function learnPurchasePrices(state, bill) {
  const list = state.products || [];
  const updates = {};
  bill.lines.forEach((l) => {
    const p = PROD[l.product]; if (!p || p.id === 'ob_balance' || /^EX-/.test(p.code || '')) return;
    const unit = R2((+l.price || 0) * (1 - (+l.disc || 0) / 100)); if (!(unit > 0)) return;
    const boughtBefore = state.docs.some((d) => d.id !== bill.id && d.type === 'bill' && d.state === 'posted' && d.lines.some((x) => x.product === p.id));
    const base = updates[p.id] || list.find((x) => x.id === p.id) || p;
    updates[p.id] = { ...base, lastPurchase: unit, cost: !boughtBefore && !(+base.cost > 0) ? unit : base.cost };
  });
  if (!Object.keys(updates).length) return list;
  return list.map((x) => updates[x.id] || x);
}
