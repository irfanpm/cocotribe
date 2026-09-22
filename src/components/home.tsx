"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Leaf,
  Package,
  ShieldCheck,
  Clock,
  Truck,
  Warehouse,
  Globe,
  Headphones,
  Calendar,
  MessageCircle,
  ShoppingCart,
  Info,
  Smartphone,
  HeadphonesIcon,
  Plus
} from "lucide-react";
import { useLanguage } from "./language";
import { BookLink, WhatsApp, Quantity, money } from "./ui";
import type { Catalog, ProductView } from "@/lib/demo";

export function FAQList({
  catalog,
  limit,
}: {
  catalog: Catalog;
  limit?: number;
}) {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="faq-list">
      {catalog.faqs.slice(0, limit).map((f, i) => (
        <div key={f.id} className={`faq-item ${openIndex === i ? 'active' : ''}`}>
          <button type="button" className="faq-question" aria-expanded={openIndex === i} aria-controls={`faq-answer-${f.id}`} onClick={() => toggleFAQ(i)}>
            <span>{t(f.questionEn, f.questionMl)}</span>
            <span className="faq-plus" aria-hidden="true" style={{transform: openIndex === i ? 'rotate(45deg)' : 'none'}}><Plus size={18} /></span>
          </button>
          {openIndex === i && <div id={`faq-answer-${f.id}`} className="faq-answer">{t(f.answerEn, f.answerMl)}</div>}
        </div>
      ))}
    </div>
  );
}

export function ServiceCards() {
  const { t } = useLanguage();
  const rows = [
    [
      Truck,
      "Bulk coconut supply",
      "മൊത്ത തേങ്ങ വിതരണം",
      "For gatherings, events and larger requirements.",
      "ചടങ്ങുകൾക്കും വലിയ ആവശ്യങ്ങൾക്കും.",
    ],
    [
      Package,
      "Copra supply",
      "കൊപ്ര വിതരണം",
      "Dried coconut for trade and everyday use.",
      "വ്യാപാരത്തിനും ദൈനംദിന ആവശ്യങ്ങൾക്കും.",
    ],
    [
      Warehouse,
      "Wholesale & commercial",
      "മൊത്തവ്യാപാരവും സ്ഥാപനങ്ങളും",
      "Supply enquiries for shops, kitchens and businesses.",
      "കടകൾക്കും അടുക്കളകൾക്കും സ്ഥാപനങ്ങൾക്കും.",
    ],
    [
      Globe,
      "Export-related supply",
      "കയറ്റുമതി സംബന്ധിച്ച വിതരണം",
      "Tell us your quantity and destination requirements.",
      "ആവശ്യമായ അളവും ലക്ഷ്യസ്ഥാനവും അറിയിക്കുക.",
    ],
  ] as const;
  return (
    <div className="service-grid">
      {rows.map(([Icon, en, ml, descEn, descMl]) => (
        <Link href="/contact" className="service-card" key={en as string}>
          <Icon size={28} strokeWidth={1.4} />
          <div>
            <h3>{t(en as string, ml as string)}</h3>
            <p>{t(descEn as string, descMl as string)}</p>
          </div>
          <ArrowUpRight size={18} />
        </Link>
      ))}
    </div>
  );
}

export function ProductCard({ p, number, demo }: { p: ProductView; number: string; demo: boolean }) {
  const { t, lang } = useLanguage();
  return (
    <div key={p.id} className="product-card">
      <img src={p.image} alt={t(p.nameEn, p.nameMl)} className="product-img" />
      <div className="product-info">
        <h3>{t(p.nameEn, p.nameMl)}</h3>
        <p>{t(p.descriptionEn, p.descriptionMl)}</p>
        <p className="price">{money(p.price, lang)} {t("onwards", "മുതൽ")}</p>
        {p.stock > 0 ? (
          <Link href={`/book?product=${p.id}&quantity=1`} className="btn-primary w-full" style={{width: '100%'}}>
            <ShoppingCart size={16} /> {t("Book Now", "ബുക്ക് ചെയ്യാം")}
          </Link>
        ) : (
          <WhatsApp number={number} product={t(p.nameEn, p.nameMl)} className="btn-outline w-full" style={{width: '100%'}}>
             {t("Enquiry", "അന്വേഷിക്കുക")}
          </WhatsApp>
        )}
      </div>
    </div>
  );
}

export function Home({ catalog }: { catalog: Catalog }) {
  const { t, lang } = useLanguage();
  const { settings: s } = catalog;

  return (
    <>
      <section className="hero-section" style={{backgroundImage: "url('/hero_bg.png')"}}>
        <div className="hero-container container">
          <div className="hero-content">
            <p className="hero-subtitle">{t("PURE COCONUTS. A MORE MEANINGFUL VISIT.", "ശുദ്ധമായ തേങ്ങകൾ. അർത്ഥവത്തായ ദർശനം.")}</p>
            <h1 className="hero-title">
              {t("Pre-Book Fresh Coconuts Before Your Guruvayur Visit", "ഗുരുവായൂർ ദർശനത്തിന് മുൻപായി പുതിയ തേങ്ങകൾ പ്രീ-ബുക്ക് ചെയ്യുക")}
            </h1>
            <p className="hero-description" style={{marginBottom: '40px', fontSize: '18px', color: 'var(--color-text-main)'}}>
              {t("Pre-book fresh coconuts before your Guruvayur visit and collect/receive them easily without last-minute searching.", "ക്ഷേത്രദർശനത്തിനായി തേങ്ങ മുൻകൂട്ടി ബുക്ക് ചെയ്യാം. അവസാന നിമിഷം പരക്കം പായേണ്ടതില്ല.")}
            </p>
            
            <div className="hero-actions">
              <Link href="/book" className="btn-primary" style={{textDecoration: 'none'}}>
                <Calendar size={18} /> {t("Book Now", "ബുക്ക് ചെയ്യാം")}
              </Link>
              <WhatsApp number={s.whatsapp} className="btn-outline hero-btn-outline" style={{textDecoration: 'none'}}>
                {t("WhatsApp Enquiry", "വാട്ട്സാപ്പിൽ അന്വേഷിക്കുക")}
              </WhatsApp>
            </div>

            <div className="hero-footer-text mt-6">
              <p className="malayalam-text">{t("ഭക്തിയുടെ പുണ്യത്തിൽ, പ്രകൃതിയുടെ സമ്മാനം", "ഭക്തിയുടെ പുണ്യത്തിൽ, പ്രകൃതിയുടെ സമ്മാനം")}</p>
              <p className="english-text">{t("Fresh Coconuts for a More Meaningful Guruvayur Visit", "Fresh Coconuts for a More Meaningful Guruvayur Visit")}</p>
            </div>
          </div>

          <div className="hero-form-wrapper" id="book">
            <div className="hero-form-card">
              <h2 style={{color: 'var(--color-primary-dark)', marginBottom: '8px', textAlign: 'center'}}>{t("Book Your Coconuts", "തേങ്ങ ബുക്ക് ചെയ്യാം")}</h2>
              <p className="malayalam-form-text" style={{textAlign: 'center', marginBottom: '24px'}}>{t("Easy booking | Timely delivery", "എളുപ്പത്തിൽ ബുക്ക് ചെയ്യൂ | യഥാസമയം ലഭിക്കും")}</p>
              
              <form className="booking-form" action="/book" method="GET">
                <div className="form-group" style={{marginBottom: '16px'}}>
                  <label style={{display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600}}>{t("Select Product", "ഉൽപ്പന്നം")}</label>
                  <select name="product" style={{width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: '4px'}}>
                    {catalog.products.filter(p => p.stock > 0).map(p => (
                      <option key={p.id} value={p.id}>{t(p.nameEn, p.nameMl)}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-row" style={{display: 'flex', gap: '16px', marginBottom: '16px'}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label style={{display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600}}>{t("Quantity", "എണ്ണം")}</label>
                    <input type="number" name="quantity" min="1" defaultValue="1" style={{width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: '4px'}} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label style={{display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600}}>{t("Date", "തീയതി")}</label>
                    <input type="date" style={{width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: '4px'}} />
                  </div>
                </div>

                <div className="form-group" style={{marginBottom: '24px'}}>
                  <label style={{display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600}}>{t("WhatsApp Number", "വാട്ട്സാപ്പ് നമ്പർ")}</label>
                  <div className="input-icon-wrapper" style={{position: 'relative'}}>
                    <input type="tel" placeholder={t("Enter your number", "നിങ്ങളുടെ നമ്പർ")} style={{width: '100%', padding: '10px 12px', paddingRight: '36px', border: '1px solid var(--color-border)', borderRadius: '4px'}} />
                    <MessageCircle size={18} className="input-icon whatsapp" style={{position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#25d366'}} />
                  </div>
                </div>

                <button type="submit" className="btn-primary w-full form-submit" style={{width: '100%', display: 'flex', justifyContent: 'center', padding: '14px', border: 'none', cursor: 'pointer'}}>
                  <Calendar size={18} style={{marginRight: '8px'}} /> {t("Proceed to Book", "ബുക്കിംഗ് തുടരുക")}
                </button>
                <p className="form-secure-text" style={{textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--color-text-muted)'}}>
                  🔒 {t("Safe & secure booking", "സുരക്ഷിതമായ ബുക്കിംഗ്")}
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section container">
        <div className="hiw-header">
          <h2 className="section-title">{t("How It Works", "എങ്ങനെ പ്രവർത്തിക്കുന്നു")}</h2>
          <p className="section-subtitle">{t("Simple steps to get your coconuts", "ലളിതമായ ഘട്ടങ്ങൾ")}</p>
        </div>

        <div className="hiw-steps">
          <div className="hiw-step">
            <div className="step-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a9.6 9.6 0 0 0-7.1 3" />
                <circle cx="9" cy="10" r="1" fill="currentColor" />
                <circle cx="15" cy="10" r="1" fill="currentColor" />
                <circle cx="12" cy="14" r="1" fill="currentColor" />
              </svg>
            </div>
            <div className="step-content">
              <h3 className="step-title">{t("1. Choose Product", "1. ഉൽപ്പന്നം തിരഞ്ഞെടുക്കുക")}</h3>
              <p className="step-malayalam">{t("Select what you need", "നിങ്ങൾക്ക് ആവശ്യമുള്ളത് തിരഞ്ഞെടുക്കുക")}</p>
            </div>
          </div>

          <div className="step-divider"></div>

          <div className="hiw-step">
            <div className="step-icon-wrapper">
              <Package size={24} />
            </div>
            <div className="step-content">
              <h3 className="step-title">{t("2. Select Quantity", "2. അളവ് തിരഞ്ഞെടുക്കുക")}</h3>
              <p className="step-malayalam">{t("Choose how many", "എണ്ണം തിരഞ്ഞെടുക്കുക")}</p>
            </div>
          </div>

          <div className="step-divider"></div>

          <div className="hiw-step">
            <div className="step-icon-wrapper">
              <Calendar size={24} />
            </div>
            <div className="step-content">
              <h3 className="step-title">{t("3. Pick Date & Time", "3. തീയതി, സമയം തിരഞ്ഞെടുക്കുക")}</h3>
              <p className="step-malayalam">{t("Select when you want it", "എപ്പോൾ വേണമെന്ന് തിരഞ്ഞെടുക്കുക")}</p>
            </div>
          </div>

          <div className="step-divider"></div>

          <div className="hiw-step">
            <div className="step-icon-wrapper">
              <ShieldCheck size={24} />
            </div>
            <div className="step-content">
              <h3 className="step-title">{t("4. Confirm Booking", "4. ബുക്കിംഗ് സ്ഥിരീകരിക്കുക")}</h3>
              <p className="step-malayalam">{t("Pay online or at delivery", "ഓൺലൈനായോ ലഭിക്കുമ്പോഴോ പണമടയ്ക്കുക")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Products & Services Section */}
      <section className="products-services-section container" id="products">
        <div className="ps-grid">
          
          {/* Popular Products */}
          <div className="ps-column products-col">
            <div className="section-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px'}}>
              <div>
                <h2 className="section-title">{t("Popular Products", "പ്രധാന ഉൽപ്പന്നങ്ങൾ")}</h2>
                <p className="section-subtitle">{t("Fresh from our farmers, to your hands", "കർഷകരിൽ നിന്ന് നേരിട്ട്")}</p>
              </div>
              <Link href="/products" className="view-all-link">{t("View All Products →", "എല്ലാ ഉൽപ്പന്നങ്ങളും കാണുക →")}</Link>
            </div>

            <div className="products-grid">
              {catalog.products.map(p => (
                <ProductCard key={p.id} p={p} number={s.whatsapp} demo={catalog.demo} />
              ))}
            </div>
          </div>

          {/* Right Side: Services & Payment */}
          <div className="ps-column services-col" id="services">
            
            {/* Other Services */}
            <div className="services-section">
              <div className="section-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px'}}>
                <div>
                  <h2 className="section-title">{t("Other Services", "മറ്റു സേവനങ്ങൾ")}</h2>
                  <p className="section-subtitle">{t("More than just coconuts", "തേങ്ങകൾക്കും അപ്പുറം")}</p>
                </div>
                <Link href="/services" className="view-all-link">{t("View All Services →", "എല്ലാ സേവനങ്ങളും കാണുക →")}</Link>
              </div>

              <div className="services-grid">
                <div className="service-card">
                  <div className="service-icon-bg"><Truck size={20} /></div>
                  <div>
                    <h4>{t("Bulk Coconut Supply", "മൊത്ത തേങ്ങ വിതരണം")}</h4>
                    <p>{t("For temples, events, institutions and functions.", "അമ്പലങ്ങൾക്കും ചടങ്ങുകൾക്കും.")}</p>
                  </div>
                </div>

                <div className="service-card">
                  <div className="service-icon-bg"><Package size={20} /></div>
                  <div>
                    <h4>{t("Copra Supply", "കൊപ്ര വിതരണം")}</h4>
                    <p>{t("High quality copra for traders and manufacturers.", "വ്യാപാരികൾക്കും നിർമ്മാതാക്കൾക്കും.")}</p>
                  </div>
                </div>

                <div className="service-card">
                  <div className="service-icon-bg"><Warehouse size={20} /></div>
                  <div>
                    <h4>{t("Commercial Orders", "വാണിജ്യ ഓർഡറുകൾ")}</h4>
                    <p>{t("Regular supply for hotels, retail chains and businesses.", "ഹോട്ടലുകൾക്കും ബിസിനസുകൾക്കും.")}</p>
                  </div>
                </div>

                <div className="service-card">
                  <div className="service-icon-bg"><Globe size={20} /></div>
                  <div>
                    <h4>{t("Export Related Supply", "കയറ്റുമതി സംബന്ധിച്ച വിതരണം")}</h4>
                    <p>{t("Assistance for export requirements.", "കയറ്റുമതി ആവശ്യങ്ങൾക്ക്.")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Options */}
            <div className="payment-options-section mt-8" style={{marginTop: '32px'}}>
              <h2 className="section-title">{t("Payment Options", "പേയ്‌മെന്റ് രീതികൾ")}</h2>
              <p className="section-subtitle">{t("Flexible and secure payments", "സുരക്ഷിതമായ പേയ്‌മെന്റുകൾ")}</p>
              
              <div className="payment-card">
                <h4>{t("Online Payment (Razorpay / UPI)", "ഓൺലൈൻ പേയ്‌മെന്റ് (Razorpay / UPI)")}</h4>
                <div className="payment-logos" style={{display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap'}}>
                  <span style={{fontWeight: 'bold', color: '#2563eb', fontStyle: 'italic', fontSize: '18px'}}>Razorpay</span>
                  <span style={{fontWeight: 'bold', color: '#1f2937', fontStyle: 'italic', fontSize: '18px'}}>UPI</span>
                  <span style={{fontWeight: 'bold', color: '#16a34a', fontSize: '18px'}}>G Pay</span>
                  <span style={{fontWeight: 'bold', color: '#9333ea', fontSize: '18px'}}>PhonePe</span>
                  <span style={{fontWeight: 'bold', color: '#60a5fa', fontSize: '18px'}}>Paytm</span>
                </div>
                <div style={{marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px'}}>
                  <div style={{fontSize: '30px'}}>🤝</div>
                  <div>
                    <h4 style={{margin: 0}}>{t("Pay at Delivery", "ലഭിക്കുമ്പോൾ പണമടയ്ക്കുക")}</h4>
                    <p style={{margin: 0, fontSize: '14px', color: 'var(--color-text-muted)'}}>{t("Also available for selected locations", "തിരഞ്ഞെടുത്ത സ്ഥലങ്ങളിൽ ലഭ്യമാണ്")}</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section container" id="faq">
        {/* Features Row */}
        <div className="features-container">
          <div className="features-header">
            <h2 className="section-title">{t("Why Choose COCOTRIBE", "എന്തുകൊണ്ട് COCOTRIBE")}</h2>
            <p className="section-subtitle">{t("A brand you can trust", "വിശ്വസിക്കാവുന്ന ഒരു ബ്രാൻഡ്")}</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon"><Leaf size={20} /></div>
              <div>
                <h4>{t("Quality Sourcing", "ഗുണമേന്മ")}</h4>
                <p>{t("Fresh, naturally grown coconuts from trusted farmers.", "കർഷകരിൽ നിന്നുള്ള പുതിയ തേങ്ങകൾ.")}</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Clock size={20} /></div>
              <div>
                <h4>{t("Timely Fulfillment", "കൃത്യസമയം")}</h4>
                <p>{t("On-time delivery or collection as per your schedule.", "നിങ്ങളുടെ സമയത്തിനനുസരിച്ച് നൽകുന്നു.")}</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Smartphone size={20} /></div>
              <div>
                <h4>{t("Easy Booking", "എളുപ്പമുള്ള ബുക്കിംഗ്")}</h4>
                <p>{t("Simple and senior-friendly booking process.", "മുതിർന്നവർക്കും എളുപ്പത്തിൽ ബുക്ക് ചെയ്യാം.")}</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><HeadphonesIcon size={20} /></div>
              <div>
                <h4>{t("Dedicated Support", "സഹായം")}</h4>
                <p>{t("Real people. Quick responses on WhatsApp.", "വാട്ട്സാപ്പിലൂടെ വേഗത്തിലുള്ള മറുപടി.")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="faq-divider"></div>

        {/* FAQ Row */}
        <div className="faq-container">
          <div className="faq-header">
            <div>
              <h2 className="section-title">{t("Frequently Asked Questions", "പതിവ് ചോദ്യങ്ങൾ")}</h2>
              <p className="section-subtitle">{t("Quick answers for your convenience", "നിങ്ങളുടെ സംശയങ്ങൾക്കുള്ള മറുപടി")}</p>
            </div>
            <Link href="/faq" className="view-all-link">{t("View All FAQs →", "എല്ലാ ചോദ്യങ്ങളും കാണുക →")}</Link>
          </div>
          
          <FAQList catalog={catalog} />
        </div>
      </section>
    </>
  );
}
