import type { ProductView } from './demo';
export function productFamily(p: ProductView) {
 return /^(pooja-coconut|normal-coconut)-(2|5|10)$/.exec(p.slug)?.[1]
   || (/^coconut-oil-(1-litre|1-kg)$/.test(p.slug) ? 'coconut-oil' : p.slug);
}
export function groupProducts(products: ProductView[]) {
 const groups = new Map<string, ProductView[]>();
 for (const p of products) {const key=productFamily(p); groups.set(key,[...(groups.get(key)||[]),p]);}
 return [...groups.values()];
}
