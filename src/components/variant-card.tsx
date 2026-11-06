"use client";
import {useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type {ProductView} from '@/lib/demo';
import {useLanguage} from './language';
import {WhatsApp,money} from './ui';
export function VariantCard({variants,number,reference=false}:{variants:ProductView[];number:string;reference?:boolean}) {
 const {t,lang}=useLanguage();
 const [selected,setSelected]=useState((variants.find(v=>v.stock>0)||variants[0]).id);
 const p=variants.find(item=>item.id===selected)||variants[0];
 const name=t(p.nameEn,p.nameMl).split(' · ')[0];
 return <article className={reference?'ref-product-card':'product-card'}>
  <Link href={`/products/${p.slug}`}><Image src={p.image} alt={name} className={reference?'ref-product-photo':'product-img'} width={600} height={450} sizes="(max-width: 640px) 92vw, (max-width: 1100px) 45vw, 300px"/></Link>
  <div className="product-info">
   <h3><Link href={`/products/${p.slug}`}>{name}</Link></h3>
   <label className="variant-field">{t('Choose pack / size','പാക്ക് / അളവ് തിരഞ്ഞെടുക്കുക')}
    <select value={p.id} onChange={e=>setSelected(e.target.value)}>
     {variants.map(v=><option key={v.id} value={v.id}>{t(v.nameEn,v.nameMl).split(' · ')[1] || t(v.nameEn,v.nameMl)} — {money(v.price,lang)}{v.stock>0?'':` (${t('Currently unavailable','ഇപ്പോൾ ലഭ്യമല്ല')})`}</option>)}
    </select>
   </label>
   <p>{t(p.descriptionEn,p.descriptionMl)}</p>
   <strong className="price">{money(p.price,lang)}</strong>
   <div className="product-actions">
    {p.stock>0
     ? <Link className="button ref-card-button" href={`/book?product=${p.id}&quantity=1`}>{t('Book Now','ബുക്ക് ചെയ്യാം')}</Link>
     : <span className="button ref-card-button" aria-disabled="true" style={{opacity:.6,cursor:'not-allowed'}}>{t('Currently unavailable','ഇപ്പോൾ ലഭ്യമല്ല')}</span>}
    <WhatsApp number={number} product={t(p.nameEn,p.nameMl)} className="button outline ref-card-button">{t('Enquiry','അന്വേഷണം')}</WhatsApp>
   </div>
  </div>
 </article>;
}
