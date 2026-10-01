"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  ShoppingBasket,
  ShoppingCart,
  Check,
  MessageCircle,
  Truck,
  Ship,
  Leaf,
  Clock,
  Smartphone,
  Headphones,
  ArrowRight,
  Banknote,
  Palmtree,
} from "lucide-react";
import { useLanguage } from "./language";
import { WhatsApp, money } from "./ui";
import type { Catalog } from "@/lib/demo";
import { indiaDate } from "@/lib/validation";

export function ReferenceCrop({
  x,
  y,
  w,
  h,
  label,
  className = "",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`reference-crop ${className}`}
      style={{
        backgroundImage: "url('/images/reference.webp')",
        backgroundSize: `${(1672 / w) * 100}% ${(941 / h) * 100}%`,
        backgroundPosition: `${(x / (1672 - w)) * 100}% ${(y / (941 - h)) * 100}%`,
      }}
    />
  );
}

function QuickBooking({ catalog }: { catalog: Catalog }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [product, setProduct] = useState("");
  return (
    <form
      className="ref-booking"
      onSubmit={(e) => {
        e.preventDefault();
        const fields = Object.fromEntries(new FormData(e.currentTarget));
        sessionStorage.setItem(
          "cocotribe-booking-draft",
          JSON.stringify(fields),
        );
        router.push("/book");
      }}
    >
      <h2>{t("Book Your Coconuts", "നിങ്ങളുടെ തേങ്ങ ബുക്ക് ചെയ്യാം")}</h2>
      <p className="ref-book-sub">{t("Easy booking for your visit", "എളുപ്പത്തിൽ ബുക്ക് ചെയ്യൂ")}</p>
      <div className="ref-form-grid">
        <label>
          {t("Name *", "പേര് *")}
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            placeholder={t("Enter your name", "നിങ്ങളുടെ പേര്")}
          />
        </label>
        <label>
          {t("Phone *", "ഫോൺ *")}
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            pattern="[0-9+ ()-]{10,18}"
            placeholder={t("Enter your phone number", "ഫോൺ നമ്പർ")}
          />
        </label>
        <label>
          {t("Product *", "ഉൽപ്പന്നം *")}
          <select
            name="productId"
            required
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          >
            <option value="">
              {t("Select product", "ഉൽപ്പന്നം തിരഞ്ഞെടുക്കുക")}
            </option>
            {catalog.products.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.stock}>
                {t(p.nameEn, p.nameMl)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Quantity *", "എണ്ണം *")}
          <input
            name="quantity"
            required
            type="number"
            min={1}
            max={Math.min(
              1000,
              catalog.products.find((p) => p.id === product)?.stock || 1000,
            )}
            placeholder={t("Enter quantity", "എണ്ണം നൽകുക")}
          />
        </label>
        <label>
          {t("Preferred Date *", "ആവശ്യമായ തീയതി *")}
          <input
            name="date"
            type="date"
            min={indiaDate()}
            max={indiaDate(
              new Date(Date.now() + catalog.settings.maxDays * 86400000),
            )}
            required
          />
        </label>
        <label>
          {t("Time Slot *", "സമയം *")}
          <select name="slotId" required>
            <option value="">{t("Select time", "സമയം തിരഞ്ഞെടുക്കുക")}</option>
            {catalog.slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="ref-span-two">
          {t("Payment Method *", "പണമടയ്ക്കുന്ന മാർഗം *")}
          <select name="method" required>
            <option value="">
              {t("Select payment method", "പേയ്‌മെന്റ് തിരഞ്ഞെടുക്കുക")}
            </option>
            {catalog.settings.deliveryEnabled && (
              <option value="DELIVERY">
                {t("Pay at Delivery", "ലഭിക്കുമ്പോൾ പണമടയ്ക്കാം")}
              </option>
            )}
            {catalog.online && <option value="RAZORPAY">
              {t("Online Payment (Razorpay)", "ഓൺലൈൻ (Razorpay)")}
            </option>}
          </select>
        </label>
      </div>
      <button className="button ref-proceed" disabled={!catalog.online && !catalog.settings.deliveryEnabled}>
        <CalendarDays size={18} />
        {t("Proceed to Book", "ബുക്കിംഗിലേക്ക് തുടരുക")}
      </button>
      {!catalog.online && !catalog.settings.deliveryEnabled && <p role="status">{t("Booking is temporarily unavailable. Please contact us.", "ബുക്കിംഗ് താൽക്കാലികമായി ലഭ്യമല്ല. ദയവായി ബന്ധപ്പെടുക.")}</p>}
      <small>
        {t(
          "Review your order",
          "നിങ്ങളുടെ ഓർഡർ പരിശോധിക്കുക",
        )}
      </small>
    </form>
  );
}

export function ReferenceHome({ catalog }: { catalog: Catalog }) {
  const { t, lang } = useLanguage();
  const s = catalog.settings;
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const products = catalog.products.map(p => ({
    p, en: p.nameEn, ml: p.nameMl, desc: p.descriptionEn,
    descMl: p.descriptionMl, price: p.price,
  }));
  const faqs = [
    {
      en: "How early can I book coconuts for my Guruvayur visit?",
      ml: "ഗുരുവായൂർ യാത്രയ്ക്ക് എത്ര നേരത്തേ തേങ്ങ ബുക്ക് ചെയ്യാം?",
      answer: catalog.faqs[0],
    },
    {
      en: "Can I choose a specific time for delivery or collection?",
      ml: "വിതരണത്തിനോ ശേഖരണത്തിനോ സമയം തിരഞ്ഞെടുക്കാമോ?",
      answer: null,
    },
    {
      en: "Do you supply in bulk for events?",
      ml: "ചടങ്ങുകൾക്ക് മൊത്തമായി വിതരണം ചെയ്യുമോ?",
      answer: catalog.faqs[6],
    },
    {
      en: "What payment methods are available?",
      ml: "ഏതെല്ലാം പേയ്‌മെന്റ് മാർഗങ്ങൾ ലഭ്യമാണ്?",
      answer: catalog.faqs[2],
    },
  ];
  return (
    <div className="reference-home">
      <section className="ref-hero">
        <div className="ref-hero-copy">
          <p className="ref-kicker">
            {t(
              "PURE COCONUTS. A MORE MEANINGFUL VISIT.",
              "ശുദ്ധമായ തേങ്ങകൾ. അർത്ഥവത്തായ ഒരു ദർശനം.",
            )}
          </p>
          <h1>
            {lang === 'en' && s.heroEn === 'Pre-Book Fresh Coconuts Before Your Guruvayur Visit' ? <>Pre-Book Fresh Coconuts<br/>Before Your Guruvayur Visit</> : t(s.heroEn,s.heroMl)}
          </h1>
          <p className="ref-hero-description">
            {t(
              "Easy booking. | Timely delivery or collection. |",
              "എളുപ്പത്തിൽ ബുക്കിംഗ്. | സമയബന്ധിത വിതരണമോ ശേഖരണമോ. |",
            )}
            <br />
            {t(
              "WhatsApp support – for a hassle-free and peaceful darshan.",
              "ശാന്തമായ ദർശനത്തിനായി WhatsApp സഹായം.",
            )}
          </p>
          <div className="ref-hero-buttons">
            <Link href="/book" className="button">
              <CalendarDays size={23} />
              {t("Book Now", "ബുക്ക് ചെയ്യാം")}
            </Link>
            <WhatsApp number={s.whatsapp} className="button outline">
              {t("WhatsApp Enquiry", "WhatsApp അന്വേഷണം")}
            </WhatsApp>
          </div>
          <p className="ref-malayalam">
            {t("Nature’s gift for a meaningful visit", "ഭക്തിയുടെ പുണ്യത്തിൽ, പ്രകൃതിയുടെ സമ്മാനം")}
          </p>
          <p className="ref-subline">
            {t(
              "Fresh Coconuts for a More Meaningful Guruvayur Visit",
              "അർത്ഥവത്തായ ഗുരുവായൂർ ദർശനത്തിന് പുതിയ തേങ്ങകൾ",
            )}
          </p>
        </div>
        <div className="ref-tradition" aria-hidden="true">
          {t("Tradition", "പാരമ്പര്യം")}
          <br />
          {t("Travels", "യാത്രയിൽ")}
          <br />
          {t("Together", "ഒപ്പം")}
        </div>
        <p className="ref-booking-motto">
          {t("SIMPLE BOOKINGS", "എളുപ്പമുള്ള ബുക്കിംഗ്")}
          <br />
          {t("FOR A MORE", "കൂടുതൽ ശാന്തമായ")}
          <br />
          {t("PEACEFUL DARSHAN", "ദർശനത്തിനായി")}
          <span />
        </p>
        <QuickBooking catalog={catalog} />
        <div className="ref-blessing">
          <p>
            {t("May your", "നിങ്ങളുടെ")}
            <br />
            {t("Guruvayur visit", "ഗുരുവായൂർ ദർശനം")}
            <br />
            {t("be blessed with", "നന്മകളാൽ")}
            <br />
            {t("goodness", "അനുഗ്രഹീതമാകട്ടെ")}
          </p>
          <div>
            <span>{t("A peaceful journey", "ശുഭ യാത്ര")}</span>
            <small>{t("Have a blessed visit", "നന്മ നിറഞ്ഞ ദർശനം ആശംസിക്കുന്നു")}</small>
          </div>
        </div>
      </section>
      <section className="ref-how">
        <div className="ref-how-title">
          <h2>{t("How It Works", "എങ്ങനെ ബുക്ക് ചെയ്യാം")}</h2>
          <p>
            {t(
              "Simple steps to get your coconuts",
              "തേങ്ങ ലഭിക്കാൻ ലളിതമായ ചുവടുകൾ",
            )}
          </p>
        </div>
        <div className="ref-steps">
          {[
            [ShoppingBasket, "1. Choose Product", "ഉൽപ്പന്നം തിരഞ്ഞെടുക്കൂ"],
            [ShoppingBasket, "2. Select Quantity", "അളവ് തിരഞ്ഞെടുക്കൂ"],
            [CalendarDays, "3. Pick Date & Time", "തീയതി, സമയം തിരഞ്ഞെടുക്കൂ"],
            [Check, "4. Confirm Booking", "ബുക്കിംഗ് സ്ഥിരീകരിക്കൂ"],
          ].map(([Icon, en, ml], i) => {
            const I = Icon as typeof Check;
            return (
              <div className="ref-step" key={i}>
                <div className="ref-circle">
                  {i === 0 ? (
                    <ReferenceCrop
                      x={274}
                      y={429}
                      w={30}
                      h={27}
                      label="Coconut"
                    />
                  ) : (
                    <I />
                  )}
                </div>
                <div>
                  <h3>{t(en as string, ml as string)}</h3>
                  <p>{t(["Choose your coconut", "Select the quantity", "Choose a convenient slot", "Review and place your order"][i], ["വേണ്ട തേങ്ങ തിരഞ്ഞെടുക്കാം", "ആവശ്യമായ എണ്ണം നൽകാം", "സൗകര്യപ്രദമായ സമയം നൽകാം", "പരിശോധിച്ച് ബുക്ക് ചെയ്യാം"][i])}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="ref-commerce">
        <div className="ref-products">
          <div className="ref-section-heading">
            <div>
              <h2>{t("Popular Products", "ജനപ്രിയ ഉൽപ്പന്നങ്ങൾ")}</h2>
              <p>
                {t(
                  "Fresh from our farmers, to your hands",
                  "കർഷകരിൽ നിന്ന് നിങ്ങളുടെ കൈകളിലേക്ക്",
                )}
              </p>
            </div>
            <Link href="/products">
              {t("View All Products", "എല്ലാ ഉൽപ്പന്നങ്ങളും")}
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="ref-product-grid">
            {!products.length && <p role="status">{t("No products available right now.", "ഇപ്പോൾ ഉൽപ്പന്നങ്ങൾ ലഭ്യമല്ല.")}</p>}
            {products.map((item) => {
              const en = item.p?.nameEn || item.en,
                ml = item.p?.nameMl || item.ml;
              return (
                <article className="ref-product-card" key={en}>
                  <Link
                    href={item.p ? `/products/${item.p.slug}` : "/services"}
                  >
                    <img src={item.p.image} alt={t(en, ml)} className="ref-product-photo" loading="lazy" decoding="async" width={360} height={180} />
                  </Link>
                  <div>
                    <h3>
                      <Link
                        href={item.p ? `/products/${item.p.slug}` : "/services"}
                      >
                        {t(en, ml)}
                      </Link>
                    </h3>
                    <p>{t(item.p?.descriptionEn || item.desc, item.p?.descriptionMl || item.descMl)}</p>
                    <strong>
                      {item.price
                        ? `${money(item.p?.price || item.price, lang)} ${t("onwards", "മുതൽ")}`
                        : t("Custom Pricing", "ആവശ്യാനുസരണമുള്ള വില")}
                    </strong>
                    {item.p && item.p.stock > 0 ? (
                      <Link
                        className="button ref-card-button"
                        href={`/book?product=${item.p.id}`}
                      >
                        <ShoppingCart size={15} />
                        {t("Book Now", "ബുക്ക് ചെയ്യാം")}
                      </Link>
                    ) : (
                      <WhatsApp
                        number={s.whatsapp}
                        product={t(en, ml)}
                        className="button outline ref-card-button"
                      >
                        {t("Enquiry", "അന്വേഷണം")}
                      </WhatsApp>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        <div className="ref-services">
          <div className="ref-section-heading">
            <div>
              <h2>{t("Other Services", "മറ്റു സേവനങ്ങൾ")}</h2>
              <p>
                {t(
                  "More than just coconuts",
                  "തേങ്ങകൾക്കപ്പുറം കൂടുതൽ സേവനങ്ങൾ",
                )}
              </p>
            </div>
            <Link href="/services">
              {t("View All Services", "എല്ലാ സേവനങ്ങളും")}
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="ref-services-grid">
            {[
              [
                Leaf,
                "Bulk Coconut Supply",
                "മൊത്ത തേങ്ങ വിതരണം",
                "For temples, events, institutions and functions.",
                "ക്ഷേത്രങ്ങൾക്കും ചടങ്ങുകൾക്കും സ്ഥാപനങ്ങൾക്കും.",
              ],
              [
                ShoppingBasket,
                "Copra Supply",
                "കൊപ്ര വിതരണം",
                "High quality copra for traders and manufacturers.",
                "വ്യാപാരികൾക്കും നിർമ്മാതാക്കൾക്കും മികച്ച കൊപ്ര.",
              ],
              [
                Truck,
                "Commercial Orders",
                "വാണിജ്യ ഓർഡറുകൾ",
                "Regular supply for hotels, retail chains and businesses.",
                "ഹോട്ടലുകൾക്കും കടകൾക്കും സ്ഥാപനങ്ങൾക്കും പതിവ് വിതരണം.",
              ],
              [
                Ship,
                "Export Related Supply",
                "കയറ്റുമതി സംബന്ധിച്ച വിതരണം",
                "Assistance for export requirements.",
                "കയറ്റുമതി ആവശ്യങ്ങൾക്ക് സഹായം.",
              ],
            ].map(([Icon, en, ml, desc, descMl], i) => {
              const I = Icon as typeof Leaf;
              return (
                <Link className="ref-service" href="/contact" key={i}>
                  <span className="ref-circle">
                    {i < 2 ? (
                      <ReferenceCrop
                        x={i === 0 ? 882 : 1112}
                        y={550}
                        w={36}
                        h={36}
                        label={t(en as string, ml as string)}
                      />
                    ) : (
                      <I size={29} />
                    )}
                  </span>
                  <div>
                    <h3>{t(en as string, ml as string)}</h3>
                    <p>{t(desc as string, descMl as string)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        <aside className="ref-payments">
          <div className="ref-section-heading">
            <div>
              <h2>{t("Payment Options", "പേയ്‌മെന്റ് മാർഗങ്ങൾ")}</h2>
              <p>
                {t(
                  "Flexible and secure payments",
                  "സൗകര്യപ്രദവും സുരക്ഷിതവുമായ പേയ്‌മെന്റ്",
                )}
              </p>
            </div>
          </div>
          <div className="ref-payment-card">
            {catalog.online && <>
            <strong>
              {t(
                "Online Payment (Razorpay / UPI)",
                "ഓൺലൈൻ പേയ്‌മെന്റ് (Razorpay / UPI)",
              )}
            </strong>
            <ReferenceCrop
              x={1383}
              y={557}
              w={220}
              h={63}
              label="Razorpay, UPI, Google Pay, PhonePe and Paytm"
              className="ref-payment-logos"
            />
            </>}
            {catalog.settings.deliveryEnabled && <div className="ref-delivery">
              <Banknote size={40} />
              <div>
                <h3>{t("Pay at Delivery", "ലഭിക്കുമ്പോൾ പണമടയ്ക്കാം")}</h3>
                <p>
                  {t(
                    "Also available for selected locations",
                    "തിരഞ്ഞെടുത്ത സ്ഥലങ്ങളിൽ ലഭ്യമാണ്",
                  )}
                </p>
              </div>
            </div>}
          </div>
        </aside>
      </section>
      <section className="ref-trust">
        <div className="ref-trust-title">
          <h2>{t("Why Choose COCOTRIBE?", "എന്തുകൊണ്ട് COCOTRIBE?")}</h2>
          <p>
            {t("A brand you can trust", "നിങ്ങൾക്ക് വിശ്വസിക്കാവുന്ന ബ്രാൻഡ്")}
          </p>
        </div>
        <div className="ref-reasons">
          {[
            [
              Leaf,
              "Quality Sourcing",
              "ഗുണമേന്മയുള്ള സംഭരണം",
              "Fresh, naturally grown coconuts from trusted farmers.",
              "വിശ്വസനീയ കർഷകരിൽ നിന്ന് നല്ല തേങ്ങകൾ.",
            ],
            [
              Clock,
              "Timely Fulfillment",
              "സമയബന്ധിത വിതരണം",
              "On-time delivery or collection as per your schedule.",
              "നിങ്ങളുടെ സമയത്തിനനുസരിച്ചുള്ള വിതരണം.",
            ],
            [
              Smartphone,
              "Easy Booking",
              "എളുപ്പമുള്ള ബുക്കിംഗ്",
              "Simple and senior-friendly booking process.",
              "ഏവർക്കും എളുപ്പമുള്ള ബുക്കിംഗ്.",
            ],
            [
              Headphones,
              "Dedicated Support",
              "നേരിട്ടുള്ള സഹായം",
              "Real people. Quick responses on WhatsApp.",
              "WhatsApp വഴി വേഗത്തിലുള്ള മറുപടി.",
            ],
          ].map(([Icon, en, ml, desc, descMl], i) => {
            const I = Icon as typeof Leaf;
            return (
              <div className="ref-reason" key={i}>
                <span className="ref-circle">
                  <I size={23} />
                </span>
                <div>
                  <h3>{t(en as string, ml as string)}</h3>
                  <p>{t(desc as string, descMl as string)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="ref-whatsapp-band">
          <MessageCircle size={36} />
          <div>
            <h3>
              {t(
                "Need Help? Chat with us on WhatsApp",
                "സഹായം വേണോ? WhatsApp-ൽ സംസാരിക്കാം",
              )}
            </h3>
            <p>
              {t(
                "We’re here to help with your booking, bulk orders or any queries.",
                "ബുക്കിംഗിനും മൊത്ത ഓർഡറുകൾക്കും സംശയങ്ങൾക്കും സഹായിക്കാം.",
              )}
            </p>
          </div>
          <WhatsApp number={s.whatsapp} className="ref-chat-pill">
            {t("WhatsApp Now", "WhatsApp ചെയ്യാം")}
            <ArrowRight size={14} />
          </WhatsApp>
        </div>
      </section>
      <section className="ref-faq">
        <div className="ref-faq-heading">
          <div>
            <h2>{t("Frequently Asked Questions", "പതിവ് ചോദ്യങ്ങൾ")}</h2>
            <p>
              {t(
                "Quick answers for your convenience",
                "നിങ്ങളുടെ സൗകര്യത്തിന് വേഗത്തിലുള്ള മറുപടി",
              )}
            </p>
          </div>
          <Link href="/faq">
            {t("View All FAQs", "എല്ലാ ചോദ്യങ്ങളും")}
            <ArrowRight size={13} />
          </Link>
        </div>
        <div className="ref-faq-items">
          {faqs.map((f, i) => (
            <div key={f.en}>
              <button
                aria-expanded={openFaq === i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {t(f.en, f.ml)}
                <span>{openFaq === i ? "−" : "+"}</span>
              </button>
              {openFaq === i && (
                <p className="ref-faq-answer">
                  {f.answer
                    ? t(f.answer.answerEn, f.answer.answerMl)
                    : t(
                        "Yes. Choose an available time slot when you book. Our team will confirm collection or delivery arrangements.",
                        "അതെ. ബുക്ക് ചെയ്യുമ്പോൾ ലഭ്യമായ സമയം തിരഞ്ഞെടുക്കാം. ശേഖരണമോ വിതരണമോ ഞങ്ങളുടെ ടീം സ്ഥിരീകരിക്കും.",
                      )}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
