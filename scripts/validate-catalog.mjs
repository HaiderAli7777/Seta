import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { CATEGORIES, sellingPaisa } from '../src/catalog/logic.mjs';
export function validateRows(products) {
  if(!Array.isArray(products) || !products.length) throw new Error('Catalogue must be a non-empty array');
  const ids = new Set(), categories = new Set(CATEGORIES.map(c=>c.id));
  for(const p of products) {
    if(!p || !/^[a-z0-9][a-z0-9-]*$/.test(p.id) || ids.has(p.id)) throw new Error('Invalid or duplicate ID: '+p?.id);
    ids.add(p.id);
    if(!p.name || !p.brand || !categories.has(p.category)) throw new Error('Invalid product identity/category: '+p.id);
    sellingPaisa(p.sourcePrice);
    if(!Array.isArray(p.specs) || !p.specs.length || p.specs.some(s=>!Array.isArray(s)||s.length!==2||s.some(v=>typeof v!=='string'||!v.trim()))) throw new Error('Invalid specifications: '+p.id);
    if(new Set(p.specs.map(s=>s[0])).size!==p.specs.length) throw new Error('Duplicate specification labels: '+p.id);
    const source = new URL(p.sourceUrl);
    if(source.protocol!=='https:' || !['czone.com.pk','www.czone.com.pk'].includes(source.hostname)) throw new Error('Invalid Czone source URL: '+p.id);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(p.retrievedAt)) throw new Error('Missing retrieval date: '+p.id);
    if(!['confirm','in-stock','out-of-stock'].includes(p.availability)) throw new Error('Invalid availability: '+p.id);
    if(!Array.isArray(p.images)) throw new Error('Invalid images: '+p.id);
    for(const image of p.images) if(!/^\.\/assets\/products\/[a-zA-Z0-9_./-]+\.(webp|jpe?g|png)$/i.test(image) || image.includes('..')) throw new Error('Use a local original product photo under assets/products: '+p.id);
  }
  return products;
}
export function validateCatalog({release=false}={}) {
  const rows=validateRows(JSON.parse(readFileSync('src/catalog/products.json','utf8')));
  const meta=JSON.parse(readFileSync('src/catalog/meta.json','utf8'));
  if(meta.markupPercent!==10 || meta.currency!=='PKR') throw new Error('Expected 10% markup and PKR');
  for(const p of rows) for(const image of p.images) if(!existsSync(image)) throw new Error('Missing local photo: '+image);
  const pending=rows.filter(p=>!p.liveVerifiedAt || !p.images.length).length;
  if(release && (pending || meta.coverage!=='complete')) throw new Error('Release blocked: '+pending+' products need live verification/photos; source coverage is '+meta.coverage+'.');
  console.log(`${rows.length} products · 10% markup valid · ${pending} need live verification/photos · ${meta.coverage} coverage`);
  return rows;
}
export function writeAudit() {
  const products=JSON.parse(readFileSync('src/catalog/products.json','utf8'));
  const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
  const fields=['id','name','category','source_price_pkr','markup_percent','selling_price_pkr','source_url','retrieved_at','source_kind','live_verified_at','photos'];
  const rows=products.map(p=>[p.id,p.name,p.category,p.sourcePrice,10,(sellingPaisa(p.sourcePrice)/100).toFixed(2),p.sourceUrl,p.retrievedAt,p.sourceKind,p.liveVerifiedAt,p.images.length]);
  mkdirSync('reports',{recursive:true});
  writeFileSync('reports/catalog-price-audit.csv',[fields,...rows].map(r=>r.map(quote).join(',')).join('\n')+'\n');
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) { validateCatalog({release:process.argv.includes('--release')}); writeAudit(); }
