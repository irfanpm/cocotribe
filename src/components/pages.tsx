"use client";
import Link from "next/link";
import { useState } from "react";
import { MapPin, Phone, Mail, Clock, Check, ArrowRight } from "lucide-react";
import { useLanguage } from "./language";
import {
  Heading,
  WhatsApp,
  BookLink,
  Quantity,
  money,
  ErrorMessage,
} from "./ui";
import { ProductCard, ServiceCards, FAQList } from "./home";
import type { Catalog, ProductView } from "@/lib/demo";
export function Products({ catalog }: { catalog: Catalog }) {
  const { t } = useLanguage();
  return (
    <section className="wrap page-space">
      <Heading
        en="Our Coconut Products"
        ml="ഞങ്ങളുടെ തേങ്ങ ഉൽപ്പന്നങ്ങൾ"
        eyebrow={t("OUR PRODUCTS", "ഞങ്ങളുടെ ഉൽപ്പന്നങ്ങൾ")}
      >
        <p>
          {t(
            "Choose your coconut. We’ll help with the rest.",
            "തേങ്ങ തിരഞ്ഞെടുക്കൂ. ബാക്കി കാര്യങ്ങളിൽ ഞങ്ങൾ സഹായിക്കാം.",
          )}
        </p>
      </Heading>
      <div className="product-grid catalog-grid">
        {catalog.products.map((p) => (
          <ProductCard
            key={p.id}
            p={p}
            number={catalog.settings.whatsapp}
            demo={catalog.demo}
          />
        ))}
      </div>
      {!catalog.products.length && (
        <p className="notice">
          {t(
            "No products available right now. Please contact us.",
            "ഇപ്പോൾ ഉൽപ്പന്നങ്ങൾ ലഭ്യമല്ല. ദയവായി ബന്ധപ്പെടുക.",
          )}
        </p>
      )}
    </section>
  );
}
export function ProductDetail({
  product: p,
  catalog,
}: {
  product: ProductView;
  catalog: Catalog;
}) {
  const { t, lang } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState("");
  return (
    <section className="wrap page-space">
      <Link className="text-link" href="/products">
        ← {t("All products", "എല്ലാ ഉൽപ്പന്നങ്ങളും")}
      </Link>
      <div className="detail-grid">
        <img
          src={p.image}
          width="900"
          height="700"
          alt={t(p.nameEn, p.nameMl)}
        />
        <div>
          <p className="eyebrow">
            {t("CAREFULLY SOURCED", "കരുതലോടെ തിരഞ്ഞെടുത്തത്")}
          </p>
          <h1>{t(p.nameEn, p.nameMl)}</h1>
          <p className="detail-price">
            {money(p.price, lang)}{" "}
            <small>
              {t("per piece", "ഒരു എണ്ണത്തിന്")}
              {catalog.demo ? t(" · Sample price", " · മാതൃകാ വില") : ""}
            </small>
          </p>
          <p>{t(p.descriptionEn, p.descriptionMl)}</p>
          <p className="availability">
            <Check size={18} />
            {p.stock > 0
              ? t(
                  `${p.stock} available to book`,
                  `${p.stock} എണ്ണം ബുക്ക് ചെയ്യാം`,
                )
              : t("Currently unavailable", "ഇപ്പോൾ ലഭ്യമല്ല")}
          </p>
          <div className="field">
            <label>{t("Quantity", "എണ്ണം")}</label>
            <Quantity
              value={quantity}
              onChange={setQuantity}
              max={Math.max(1, p.stock)}
            />
          </div>
          <label className="field">
            {t("Required date", "ആവശ്യമായ തീയതി")}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <div className="button-row">
            {p.stock > 0 && (
              <BookLink
                href={`/book?product=${p.id}&quantity=${quantity}${date ? `&date=${date}` : ""}`}
              />
            )}
            <WhatsApp
              number={catalog.settings.whatsapp}
              product={t(p.nameEn, p.nameMl)}
            />
          </div>
          <p className="muted">
            {t(
              "Collection or delivery details will be arranged directly with our team.",
              "ശേഖരണത്തിന്റെയോ വിതരണത്തിന്റെയോ വിവരങ്ങൾ ഞങ്ങളുടെ ടീമുമായി നേരിട്ട് ഉറപ്പിക്കുക.",
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
export function Services({ catalog }: { catalog: Catalog }) {
  const { t } = useLanguage();
  return (
    <section className="wrap page-space">
      <Heading
        en="Our Services"
        ml="ഞങ്ങളുടെ സേവനങ്ങൾ"
        eyebrow={t("OUR SERVICES", "ഞങ്ങളുടെ സേവനങ്ങൾ")}
      >
        <p>
          {t(
            "Coconut pre-booking comes first. Our supply support goes further.",
            "തേങ്ങ മുൻകൂട്ടി ബുക്ക് ചെയ്യുന്നതിനാണ് മുൻഗണന. മറ്റു വിതരണ ആവശ്യങ്ങൾക്കും സഹായിക്കാം.",
          )}
        </p>
      </Heading>
      <div className="feature-panel">
        <div>
          <h2>
            {t(
              "Visiting Guruvayur? Start here.",
              "ഗുരുവായൂരിലേക്ക് വരുകയാണോ? ഇവിടെ തുടങ്ങാം.",
            )}
          </h2>
          <p>
            {t(
              "Choose the quantity you need and a preferred collection time. A little planning for a more relaxed visit.",
              "വേണ്ട എണ്ണവും സൗകര്യപ്രദമായ ശേഖരണ സമയവും തിരഞ്ഞെടുക്കൂ. ആശ്വാസകരമായ യാത്രയ്ക്കായി ചെറിയൊരു ഒരുക്കം.",
            )}
          </p>
          <BookLink />
        </div>
        <img
          src="/images/hero.jpg"
          alt={t("Fresh coconuts", "പുതിയ തേങ്ങകൾ")}
          width="500"
          height="300"
        />
      </div>
      <ServiceCards />
      <div className="notice">
        <h3>
          {t(
            "Tell us what your business needs.",
            "നിങ്ങളുടെ സ്ഥാപനത്തിന്റെ ആവശ്യം അറിയിക്കൂ.",
          )}
        </h3>
        <p>
          {t(
            "Share your product, quantity, location and frequency. We’ll discuss availability, pricing, logistics and applicable export requirements before confirming supply.",
            "ഉൽപ്പന്നം, അളവ്, സ്ഥലം, എത്ര ഇടവേളയിൽ വേണം എന്നിവ അറിയിക്കുക. ലഭ്യത, വില, ഗതാഗതം, ബാധകമായ കയറ്റുമതി നിബന്ധനകൾ എന്നിവ ചർച്ച ചെയ്തശേഷം വിതരണം ഉറപ്പിക്കും.",
          )}
        </p>
        <WhatsApp number={catalog.settings.whatsapp} />
      </div>
    </section>
  );
}
export function About({ catalog }: { catalog: Catalog }) {
  const { t } = useLanguage();
  return (
    <section className="wrap page-space">
      <Heading
        en="About COCOTRIBE"
        ml="COCOTRIBE-യെക്കുറിച്ച്"
        eyebrow={t("MEET COCOTRIBE", "COCOTRIBE-യെ അറിയാം")}
      />
      <div className="detail-grid">
        <img
          src="/images/hero.jpg"
          width="900"
          height="700"
          alt={t("Coconuts in a Kerala garden", "കേരളത്തിലെ തേങ്ങകൾ")}
        />
        <div>
          <h2>
            {t(
              "Good sourcing. Simple service.",
              "നല്ല ഉൽപ്പന്നങ്ങൾ. ലളിതമായ സേവനം.",
            )}
          </h2>
          <p>{t(catalog.settings.aboutEn, catalog.settings.aboutMl)}</p>
          <ul className="check-list">
            {[
              ["Quality in every selection", "തിരഞ്ഞെടുപ്പിൽ ഗുണമേന്മ"],
              [
                "Reliable sourcing and clear availability",
                "വിശ്വസനീയമായ സംഭരണവും വ്യക്തമായ ലഭ്യതയും",
              ],
              [
                "Timely fulfilment, arranged with you",
                "നിങ്ങളുമായി ഉറപ്പിച്ച സമയത്ത് വിതരണം",
              ],
              [
                "Support for families and bulk requirements",
                "കുടുംബങ്ങൾക്കും മൊത്ത ആവശ്യങ്ങൾക്കും സഹായം",
              ],
              ["Friendly support, a call away", "ഒരു വിളിയിൽ സൗഹൃദപരമായ സഹായം"],
            ].map(([en, ml]) => (
              <li key={en}>
                <Check size={19} />
                {t(en, ml)}
              </li>
            ))}
          </ul>
          <p className="notice">
            {t(
              "COCOTRIBE is an independent coconut supply business. We are not affiliated with, endorsed by, or an official supplier of Guruvayur Temple.",
              "COCOTRIBE ഒരു സ്വതന്ത്ര തേങ്ങ വിതരണ സ്ഥാപനമാണ്. ഗുരുവായൂർ ക്ഷേത്രവുമായി ഔദ്യോഗിക ബന്ധമോ അംഗീകാരമോ ഇല്ല; ക്ഷേത്രത്തിന്റെ ഔദ്യോഗിക വിതരണക്കാരല്ല.",
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
export function FAQs({ catalog }: { catalog: Catalog }) {
  const { t } = useLanguage();
  return (
    <section className="wrap narrow page-space">
      <Heading
        en="Frequently Asked Questions"
        ml="പതിവ് ചോദ്യങ്ങൾ"
        eyebrow={t(
          "YOUR QUESTIONS, ANSWERED",
          "നിങ്ങളുടെ ചോദ്യങ്ങൾക്ക് മറുപടി",
        )}
      />
      <FAQList catalog={catalog} />
      <div className="closing">
        <h3>{t("Still have a question?", "ഇനിയും സംശയമുണ്ടോ?")}</h3>
        <WhatsApp number={catalog.settings.whatsapp} />
      </div>
    </section>
  );
}
export function Contact({ catalog }: { catalog: Catalog }) {
  const { t } = useLanguage();
  const s = catalog.settings;
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(form));
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setDone(true);
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "SERVICE_UNAVAILABLE");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="wrap page-space">
      <Heading
        en="Contact COCOTRIBE"
        ml="COCOTRIBE-യെ ബന്ധപ്പെടുക"
        eyebrow={t("GET IN TOUCH", "ബന്ധപ്പെടാം")}
      />
      <div className="contact-grid">
        <div className="contact-info">
          <h2>
            {t(
              "Let’s make your visit easier.",
              "നിങ്ങളുടെ യാത്ര എളുപ്പമാക്കാം.",
            )}
          </h2>
          <a href={`tel:+${s.phone}`}>
            <Phone />+{s.phone}
          </a>
          <WhatsApp number={s.whatsapp} />
          {s.email && (
            <a href={`mailto:${s.email}`}>
              <Mail />
              {s.email}
            </a>
          )}
          <p>
            <MapPin />
            {t(s.addressEn, s.addressMl)}
          </p>
          <p>
            <Clock />
            {t(s.hoursEn, s.hoursMl)}
          </p>
          <div className="map-placeholder">
            <MapPin size={35} />
            <h3>{t("Guruvayur, Kerala", "ഗുരുവായൂർ, കേരളം")}</h3>
            <p>
              {t(
                "Please call to confirm the exact collection point before travelling.",
                "യാത്രയ്ക്ക് മുമ്പ് കൃത്യമായ ശേഖരണ സ്ഥലം വിളിച്ച് ഉറപ്പിക്കുക.",
              )}
            </p>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Guruvayur%20Kerala"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              {t("View Guruvayur area", "ഗുരുവായൂർ പ്രദേശം കാണാം")}
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
        <form className="panel" onSubmit={submit}>
          <h2>{t("Leave us a message.", "ഒരു സന്ദേശം അയയ്ക്കാം.")}</h2>
          <p>
            {t(
              "For urgent changes to a booking, please call us.",
              "ബുക്കിംഗിൽ അടിയന്തര മാറ്റങ്ങൾക്ക് വിളിക്കുക.",
            )}
          </p>
          <label className="field">
            {t("Full name", "പൂർണ്ണ പേര്")}
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
            />
          </label>
          <label className="field">
            {t("Mobile number", "മൊബൈൽ നമ്പർ")}
            <input
              name="phone"
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              pattern="[0-9+ ()-]{10,18}"
            />
          </label>
          <label className="field">
            {t("Your message", "നിങ്ങളുടെ സന്ദേശം")}
            <textarea
              name="message"
              required
              minLength={10}
              maxLength={2000}
              rows={5}
            />
          </label>
          <label className="honeypot" aria-hidden="true">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <p className="muted">
            {t(
              "Your details are used to respond to this enquiry.",
              "ഈ അന്വേഷണത്തിന് മറുപടി നൽകാനാണ് നിങ്ങളുടെ വിവരങ്ങൾ ഉപയോഗിക്കുന്നത്.",
            )}{" "}
            <Link href="/privacy">{t("Privacy policy", "സ്വകാര്യതാ നയം")}</Link>
          </p>
          {error && <ErrorMessage code={error} />}{" "}
          {done && (
            <p className="notice success" role="status">
              {t(
                "Message received. Our team will get back to you.",
                "സന്ദേശം ലഭിച്ചു. ഞങ്ങളുടെ ടീം നിങ്ങളെ ബന്ധപ്പെടും.",
              )}
            </p>
          )}
          <button className="button" disabled={busy}>
            {busy
              ? t("Sending…", "അയയ്ക്കുന്നു…")
              : t("Send message", "സന്ദേശം അയയ്ക്കുക")}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </section>
  );
}
export function Legal({ kind }: { kind: "terms" | "privacy" }) {
  const { t } = useLanguage();
  const privacy = kind === "privacy";
  const rows = privacy
    ? [
        [
          "Information we collect",
          "ശേഖരിക്കുന്ന വിവരങ്ങൾ",
          "We collect your name, phone number, booking details and any notes or enquiries you submit to fulfil orders and provide support. Please do not include sensitive personal information in notes.",
          "ഓർഡർ നിറവേറ്റാനും സഹായം നൽകാനും പേര്, ഫോൺ നമ്പർ, ബുക്കിംഗ് വിവരങ്ങൾ, നിങ്ങൾ അയയ്ക്കുന്ന കുറിപ്പുകൾ എന്നിവ ശേഖരിക്കുന്നു. കുറിപ്പുകളിൽ സ്വകാര്യമായ വിവരങ്ങൾ ചേർക്കരുത്.",
        ],
        [
          "Payments and WhatsApp",
          "പേയ്‌മെന്റും WhatsApp-ഉം",
          "Online payments are processed by Razorpay. We store payment references and status, not your card credentials. WhatsApp opens an external service and shares only the message you choose to send. These services have their own privacy policies.",
          "ഓൺലൈൻ പേയ്‌മെന്റ് Razorpay കൈകാര്യം ചെയ്യുന്നു. പേയ്‌മെന്റ് നമ്പറും നിലയും മാത്രമാണ് സൂക്ഷിക്കുന്നത്; കാർഡ് വിവരങ്ങളല്ല. WhatsApp ബാഹ്യ സേവനമാണ്; നിങ്ങൾ അയയ്ക്കുന്ന സന്ദേശം മാത്രമേ പങ്കിടൂ. ഈ സേവനങ്ങൾക്ക് സ്വന്തം സ്വകാര്യതാ നയങ്ങളുണ്ട്.",
        ],
        [
          "Storage and access",
          "സംഭരണവും പ്രവേശനവും",
          "Booking records are accessible to authorised staff. We retain records as needed for fulfilment, support and applicable accounting requirements. Contact us to request access, correction or deletion, subject to required record retention.",
          "ബുക്കിംഗ് വിവരങ്ങൾ അംഗീകൃത ജീവനക്കാർക്ക് മാത്രം ലഭിക്കും. വിതരണം, സഹായം, ബാധകമായ അക്കൗണ്ടിംഗ് ആവശ്യങ്ങൾക്കനുസരിച്ച് രേഖകൾ സൂക്ഷിക്കും. വിവരങ്ങൾ കാണാനോ തിരുത്താനോ നീക്കാനോ ബന്ധപ്പെടാം; നിർബന്ധമായ രേഖാസൂക്ഷണ വ്യവസ്ഥകൾ ബാധകമാണ്.",
        ],
        [
          "Cookies and preferences",
          "കുക്കികളും മുൻഗണനകളും",
          "Your language preference is stored on your device. Admin sign-in uses a secure session cookie. Your private booking link contains an access token; keep it private. No advertising trackers are included.",
          "ഭാഷാ തിരഞ്ഞെടുപ്പ് നിങ്ങളുടെ ഉപകരണത്തിൽ സൂക്ഷിക്കുന്നു. അഡ്മിൻ പ്രവേശനത്തിന് സുരക്ഷിത സെഷൻ കുക്കി ഉപയോഗിക്കുന്നു. സ്വകാര്യ ബുക്കിംഗ് ലിങ്കിൽ പ്രവേശന ടോക്കൺ ഉള്ളതിനാൽ അത് രഹസ്യമായി സൂക്ഷിക്കുക. പരസ്യ ട്രാക്കറുകൾ ഉപയോഗിക്കുന്നില്ല.",
        ],
      ]
    : [
        [
          "Booking and fulfilment",
          "ബുക്കിംഗും വിതരണവും",
          "Select a product, quantity and preferred time. Bookings are subject to availability and the status shown in your order summary. Contact our team to confirm the collection point or any delivery arrangement. Temple entry, rituals and temple services are not included.",
          "ഉൽപ്പന്നവും എണ്ണവും സമയവും തിരഞ്ഞെടുക്കുക. ലഭ്യതയും ഓർഡറിലെ നിലയും ബുക്കിംഗിന് ബാധകമാണ്. ശേഖരണ സ്ഥലമോ വിതരണ ക്രമീകരണമോ ടീമുമായി ഉറപ്പിക്കുക. ക്ഷേത്രപ്രവേശനം, വഴിപാടുകൾ, ക്ഷേത്രസേവനങ്ങൾ എന്നിവ ഉൾപ്പെടുന്നില്ല.",
        ],
        [
          "Prices and payment",
          "വിലയും പേയ്‌മെന്റും",
          "The total shown at review is the amount for the selected products. No additional delivery charges are collected by this checkout. Any separate delivery service must be explicitly agreed before fulfilment. Online orders are confirmed only after payment capture; Pay at Delivery bookings initially await our team’s confirmation.",
          "പരിശോധനയിൽ കാണുന്ന തുകയാണ് തിരഞ്ഞെടുത്ത ഉൽപ്പന്നങ്ങളുടെ വില. ഈ ചെക്കൗട്ടിൽ അധിക ഡെലിവറി നിരക്ക് ഈടാക്കുന്നില്ല. പ്രത്യേകം ഡെലിവറി സേവനം വേണമെങ്കിൽ മുൻകൂട്ടി ഉറപ്പിക്കണം. ഓൺലൈൻ പേയ്‌മെന്റ് പൂർത്തിയായശേഷം ഓർഡർ സ്ഥിരീകരിക്കും; ലഭിക്കുമ്പോൾ പണമടയ്ക്കുന്ന ബുക്കിംഗ് ടീം സ്ഥിരീകരിക്കണം.",
        ],
        [
          "Changes, cancellation and refunds",
          "മാറ്റങ്ങൾ, റദ്ദാക്കൽ, റീഫണ്ട്",
          "Contact us as early as possible with your booking ID. Changes depend on stock and preparation status. Our team will confirm cancellation eligibility, any applicable charges and refund arrangements before proceeding. Refunds, where agreed, are processed through the original payment method.",
          "ബുക്കിംഗ് നമ്പർ സഹിതം എത്രയും വേഗം ബന്ധപ്പെടുക. സ്റ്റോക്കും തയ്യാറാക്കലിന്റെ ഘട്ടവും അനുസരിച്ചാണ് മാറ്റങ്ങൾ. റദ്ദാക്കലിന്റെ യോഗ്യത, ബാധകമായ ചെലവ്, റീഫണ്ട് ക്രമീകരണം എന്നിവ ടീം മുൻകൂട്ടി സ്ഥിരീകരിക്കും. അംഗീകരിച്ച റീഫണ്ട് പണമടച്ച അതേ മാർഗത്തിലൂടെ നൽകും.",
        ],
        [
          "Independent business",
          "സ്വതന്ത്ര സ്ഥാപനം",
          "COCOTRIBE supplies coconut products independently. We do not claim an official affiliation with Guruvayur Temple. For product or booking issues, use the phone or WhatsApp contact listed on this website.",
          "COCOTRIBE സ്വതന്ത്രമായി തേങ്ങ ഉൽപ്പന്നങ്ങൾ വിതരണം ചെയ്യുന്നു. ഗുരുവായൂർ ക്ഷേത്രവുമായി ഔദ്യോഗിക ബന്ധമുണ്ടെന്ന് അവകാശപ്പെടുന്നില്ല. ഉൽപ്പന്നമോ ബുക്കിംഗോ സംബന്ധിച്ച പ്രശ്നങ്ങൾക്ക് വെബ്സൈറ്റിലെ ഫോൺ അല്ലെങ്കിൽ WhatsApp വഴി ബന്ധപ്പെടുക.",
        ],
      ];
  return (
    <article className="wrap narrow page-space legal">
      <Heading
        en={privacy ? "Your privacy matters." : "Booking terms."}
        ml={
          privacy ? "നിങ്ങളുടെ സ്വകാര്യത പ്രധാനമാണ്." : "ബുക്കിംഗ് നിബന്ധനകൾ."
        }
      />
      {rows.map(([en, ml, bodyEn, bodyMl]) => (
        <section key={en}>
          <h2>{t(en, ml)}</h2>
          <p>{t(bodyEn, bodyMl)}</p>
        </section>
      ))}
      <Link href="/contact" className="button">
        {t("Contact COCOTRIBE", "COCOTRIBE-യെ ബന്ധപ്പെടുക")}
      </Link>
    </article>
  );
}
