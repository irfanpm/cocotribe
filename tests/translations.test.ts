import {test} from 'node:test';
import assert from 'node:assert/strict';
import {translate} from '../src/lib/translate';
import {translations} from '../src/lib/translations';
import {sampleProducts,sampleFaqs,sampleSettings} from '../src/lib/demo';
test('Tamil and Hindi cover seeded customer content',()=>{
 const values=[...sampleProducts.flatMap(p=>[p.nameEn,p.descriptionEn]),...sampleFaqs.flatMap(f=>[f.questionEn,f.answerEn]),sampleSettings.heroEn,sampleSettings.aboutEn,sampleSettings.addressEn,sampleSettings.hoursEn];
 for(const value of values) for(const locale of ['ta','hi'] as const) assert.ok(translations[value]?.[locale],`${locale}: ${value}`);
});
test('locale choice preserves English and Malayalam and translates dynamic booking text',()=>{
 assert.equal(translate('Home','ഹോം','en'),'Home');assert.equal(translate('Home','ഹോം','ml'),'ഹോം');
 assert.equal(translate('Home','ഹോം','ta'),'முகப்பு');assert.equal(translate('Home','ഹോം','hi'),'होम');
 for(const locale of ['ta','hi'] as const){assert.match(translate('20 available to book','',locale),/20/);assert.notEqual(translate('20 available to book','',locale),'20 available to book');assert.ok(translate('Hi COCOTRIBE, I would like to know more about Fresh Coconut.','',locale).includes('COCOTRIBE'));}
 assert.equal(translate('Custom product','', 'ta'),'Custom product');
});

import {bookingSchema} from '../src/lib/validation';
test('booking API accepts all four customer languages',()=>{
 const data={name:'Language test',phone:'9999999999',productId:'test',quantity:1,expectedUnitPrice:4000,date:'2026-10-10',slotId:'test',method:'DELIVERY',requestKey:'12345678-1234-4123-8123-123456789012'};
 for(const language of ['en','ml','ta','hi']) assert.equal(bookingSchema.safeParse({...data,language}).success,true);
 assert.equal(bookingSchema.safeParse({...data,language:'xx'}).success,false);
});
