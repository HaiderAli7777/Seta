/* Import an authorised, verified catalogue export. This does not bypass source-site access controls. */
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { validateRows } from './validate-catalog.mjs';
const filename=process.argv[2];
if(!filename) throw new Error('Usage: npm run import:catalog -- /path/to/verified-products.json');
const rows=validateRows(JSON.parse(readFileSync(filename,'utf8')));
writeFileSync('src/catalog/products.json.tmp',JSON.stringify(rows,null,2)+'\n');
renameSync('src/catalog/products.json.tmp','src/catalog/products.json');
const meta=JSON.parse(readFileSync('src/catalog/meta.json','utf8'));
meta.productCount=rows.length;
meta.photoCoverage=rows.filter(p=>p.images.length).length;
meta.coverage='partial'; // Only a pagination/coverage audit may promote this to complete.
meta.liveVerification=rows.every(p=>p.liveVerifiedAt)?'verified-import':'pending';
meta.notes='Imported export; full source-category coverage must be audited separately.';
writeFileSync('src/catalog/meta.json',JSON.stringify(meta,null,2)+'\n');
console.log(`Imported ${rows.length} products. Run npm run build. Audit category completeness before release.`);
