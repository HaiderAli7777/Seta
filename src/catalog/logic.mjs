export const CATEGORIES = [
  { id: 'mouse', label: 'Mouse', plural: 'Mice', tagline: 'Every move matters.', description: 'From everyday precision to your next gaming session.', icon: 'Mouse', tone: 'blue' },
  { id: 'keyboard', label: 'Keyboard', plural: 'Keyboards', tagline: 'Find your flow.', description: 'A better place for your next great idea.', icon: 'Keyboard', tone: 'sage' },
  { id: 'audio', label: 'Headsets & Microphones', plural: 'Headsets & microphones', tagline: 'Be heard. Get immersed.', description: 'Audio for your calls, games and creative projects.', icon: 'Headphones', tone: 'peach' },
  { id: 'ram', label: 'RAM', plural: 'Memory', tagline: 'Room to do more.', description: 'Find the capacity and memory generation your PC needs.', icon: 'MemoryStick', tone: 'lilac' },
  { id: 'drives', label: 'Hard Drives', plural: 'Hard drives', tagline: 'Keep what matters.', description: 'Portable, desktop and enterprise storage to fit your plans.', icon: 'HardDrive', tone: 'sand' },
];

// Calculate in paisa: source price + exactly 10%, rounded only to the nearest paisa.
export function sellingPaisa(sourcePrice) {
  if (!Number.isFinite(sourcePrice) || sourcePrice <= 0) throw new TypeError('A positive numeric source price is required.');
  return Math.round(Math.round(sourcePrice * 100) * 110 / 100);
}
export const sellingPrice = p => sellingPaisa(p.sourcePrice) / 100;
export const money = value => 'Rs. ' + Number(value).toLocaleString('en-PK', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 });
export const normalise = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
const aliases = { mouse: 'mouse', mice: 'mouse', keyboard: 'keyboard', keyboards: 'keyboard', ram: 'ram', memory: 'ram', headset: 'audio', headsets: 'audio', headphone: 'audio', headphones: 'audio', microphone: 'audio', microphones: 'audio', mic: 'audio', hdd: 'drives', drive: 'drives', drives: 'drives' };
const ignored = new Set(['a', 'an', 'the', 'i', 'want', 'need', 'show', 'me', 'find', 'please', 'for', 'my', 'with', 'some', 'buy', 'looking', 'at', 'and', 'hard', 'rs', 'pkr']);

export function searchIntent(query = '') {
  let text = query.toLowerCase();
  const match = text.match(/(?:under|below|less than|up to|upto|budget)\s*(?:rs\.?\s*|pkr\s*)?([\d,]+(?:\.\d+)?)(k)?\b/);
  let ceiling = 0;
  if (match) { ceiling = Number(match[1].replaceAll(',', '')) * (match[2] ? 1000 : 1); text = text.replace(match[0], ''); }
  const words = normalise(text).split(' ').filter(Boolean);
  const category = words.map(w => aliases[w]).find(Boolean) || '';
  const terms = words.filter(w => !ignored.has(w) && !aliases[w]);
  // A microphone/headset query should not return every audio product.
  if (words.some(w => ['mic', 'microphone', 'microphones'].includes(w))) terms.push('microphone');
  if (words.some(w => ['headset', 'headsets', 'headphone', 'headphones'].includes(w))) terms.push('headset');
  return { category, ceiling, terms };
}

export function filterProducts(products, { category = '', query = '', brand = '', max = 0, sort = 'featured' } = {}) {
  const intent = searchIntent(query);
  const priceMax = Math.min(...[Number(max), intent.ceiling].filter(n => n > 0)) || Infinity;
  const rows = products.filter(p => (!category || p.category === category) && (!intent.category || p.category === intent.category) && (!brand || p.brand === brand) && sellingPrice(p) <= priceMax && intent.terms.every(t => (t === 'microphone' || t === 'headset' ? normalise(p.name) : normalise([p.name, p.brand, ...p.specs.flat()].join(' '))).replaceAll(' ', '').includes(t.replaceAll(' ', ''))));
  return rows.sort((a, b) => sort === 'price-asc' ? sellingPrice(a) - sellingPrice(b) : sort === 'price-desc' ? sellingPrice(b) - sellingPrice(a) : sort === 'name' ? a.name.localeCompare(b.name) : Number(!!b.featured) - Number(!!a.featured) || a.name.localeCompare(b.name));
}

export function cleanIds(value, products, limit = Infinity) {
  const valid = new Set(products.map(p => p.id));
  return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && valid.has(id)))].slice(0, limit) : [];
}
export function cleanBag(value, products) {
  if (!Array.isArray(value)) return [];
  const valid = new Set(products.map(p => p.id));
  const rows = new Map();
  value.forEach(line => {
    if (!line || !valid.has(line.id) || !Number.isFinite(line.quantity) || line.quantity <= 0) return;
    rows.set(line.id, { id: line.id, quantity: Math.min(99, Math.floor(line.quantity) + (rows.get(line.id)?.quantity || 0)) });
  });
  return [...rows.values()];
}
export function bagTotalPaisa(bag, products) {
  const byId = new Map(products.map(p => [p.id, p]));
  return cleanBag(bag, products).reduce((sum, line) => sum + sellingPaisa(byId.get(line.id).sourcePrice) * line.quantity, 0);
}
