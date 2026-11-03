"use client";
import {useState} from 'react';
import Link from 'next/link';
import type {ProductView} from '@/lib/demo';
import {useLanguage} from './language';
import {WhatsApp,money} from './ui';
export function VariantCard({variants,number,reference=false}:{variants:ProductView[];number:string;reference?:boolean}) {
 const {t,lang}=useLanguage();
 const [selected,setSelected]=useState(variants[0].id);
 const p=variants.find(item=>item.id===selected)||variants[0];
 const name=t(p.nameEn,p.nameMl).split(' · ')[0];
 return <article className={reference?'ref-product-card':'product-card'}>
  <Link href={`/products/${p.slug}`}><img src={p.image} alt={name} className={reference?'ref-product-photo':'product-img'} loading="lazy" width={600} height={450}/></Link>
  <div className="product-info">
   <h3><Link href={`/products/${p.slug}`}>{name}</Link></h3>
   <label className="variant-field">{t('Choose pack / size','പാക്ക് / അളവ് തിരഞ്ഞെടുക്കുക')}
    <select value={p.id} onChange={e=>setSelected(e.target.value)}>
     {variants.map(v=><option key={v.id} value={v.id}>{t(v.nameEn,v.nameMl).split(' · ')[1] || t(v.nameEn,v.nameMl)} — {money(v.price,lang)}</option>)}
    </select>
   </label>
   <p>{t(p.descriptionEn,p.descriptionMl)}</p>
   <strong className="price">{money(p.price,lang)}</strong>
   <div className="product-actions">
    <Link className="button ref-card-button" href={`/book?product=${p.id}&quantity=1`}>{t('Book Now','ബുക്ക് ചെയ്യാം')}</Link>
    <WhatsApp number={number} product={t(p.nameEn,p.nameMl)} className="button outline ref-card-button">{t('Enquiry','അന്വേഷണം')}</WhatsApp>
   </div>
  </div>
 </article>;
}
