"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Phone, ArrowUpRight } from "lucide-react";
import { useLanguage } from "./language";
import { Brand, WhatsApp, BookLink } from "./ui";
import type { SettingsView } from "@/lib/demo";
const links = [
  ["/", "Home", "ഹോം"],
  ["/book", "Book Coconuts", "ബുക്കിംഗ്"],
  ["/products", "Products", "ഉൽപ്പന്നങ്ങൾ"],
  ["/services", "Our Services", "സേവനങ്ങൾ"],
  ["/about", "About", "ഞങ്ങളെക്കുറിച്ച്"],
  ["/faq", "FAQ", "ചോദ്യങ്ങൾ"],
  ["/contact", "Contact", "ബന്ധപ്പെടുക"],
];
export function Shell({
  children,
  settings,
  demo,
}: {
  children: React.ReactNode;
  settings: SettingsView;
  demo: boolean;
}) {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const admin = pathname.startsWith("/admin");
  return (
    <>
      <a href="#main" className="skip">
        {t("Skip to content", "ഉള്ളടക്കത്തിലേക്ക് പോകുക")}
      </a>
      <div className="topline">
        <span>{t("FROM KERALA, WITH CARE", "കേരളത്തിൽ നിന്ന്, കരുതലോടെ")}</span>
        <a href={`tel:+${settings.phone}`}>
          <Phone size={13} /> +{settings.phone}
        </a>
      </div>
      <nav className="navbar">
        <div className="navbar-container container">
          <div className="navbar-logo">
            <Link href="/" aria-label="COCOTRIBE Home" style={{textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px'}}>
              <svg width="28" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="logo-icon">
                <path d="M13 8c0-3.3-2.7-6-6-6-1.1 0-2.2.3-3.2.8.2.3.4.6.6 1 1.6 2.3 4.3 4.2 7.2 5z"/>
                <path d="M13 8c0-3.3 2.7-6 6-6 1.1 0 2.2.3 3.2.8-.2.3-.4.6-.6 1-1.6 2.3-4.3 4.2-7.2 5z"/>
                <path d="M13 8c0 3.3-2.7 6-6 6-1.1 0-2.2-.3-3.2-.8.2-.3.4-.6.6-1 1.6-2.3 4.3-4.2 7.2-5z"/>
                <path d="M13 8c0 3.3 2.7 6 6 6 1.1 0 2.2-.3 3.2-.8-.2-.3-.4-.6-.6-1-1.6-2.3-4.3-4.2-7.2-5z"/>
                <path d="M13 8v14"/>
              </svg>
              <div className="logo-text">
                <span className="logo-title" style={{color: 'var(--color-primary-dark)'}}>COCOTRIBE</span>
                <span className="logo-subtitle" style={{color: 'var(--color-primary-dark)'}}>{t("GOODNESS FROM NATURE • WITH YOU ALWAYS", "പ്രകൃതിയുടെ നന്മ • എപ്പോഴും നിങ്ങൾക്കൊപ്പം")}</span>
              </div>
            </Link>
          </div>

          <div className="navbar-links">
            {links.map(([href, en, ml]) => (
              <Link
                key={href}
                href={href}
                className={`nav-link ${pathname === href ? "active" : ""}`}
              >
                {t(en, ml)}
              </Link>
            ))}
          </div>

          <div className="navbar-actions">
            <div className="language-switch">
              <span className={`lang ${lang === "en" ? "active" : ""}`} onClick={() => setLang("en")}>EN</span>
              <span className={`lang ${lang === "ml" ? "active" : ""}`} onClick={() => setLang("ml")}>മലയാളം</span>
            </div>
            <Link href="/book" className="btn-accent nav-btn" style={{textDecoration: 'none'}}>{t("Book Now", "ബുക്ക് ചെയ്യാം")}</Link>
          </div>
        </div>
      </nav>
      {demo && (
        <div className="demo-banner">
          {t(
            "Website preview · Sample prices · Online bookings are not yet open.",
            "വെബ്സൈറ്റ് പ്രിവ്യൂ · മാതൃകാ വിലകൾ · ഓൺലൈൻ ബുക്കിംഗ് ആരംഭിച്ചിട്ടില്ല.",
          )}{" "}
          <a href={`tel:+${settings.phone}`}>
            {t("Call to enquire", "അന്വേഷിക്കാൻ വിളിക്കുക")}
          </a>
        </div>
      )}
      <main id="main">{children}</main>
      {!admin && (
        <div className="whatsapp-banner-wrapper">
          <div className="container">
            <div className="whatsapp-banner">
              <div className="wb-content">
                <div className="wb-icon"><WhatsApp number={settings.whatsapp} className=""><span className="sr-only">WhatsApp</span></WhatsApp></div>
                <div>
                  <h3>{t("Need Help? Chat with us on WhatsApp", "സഹായം ആവശ്യമുണ്ടോ? വാട്ട്സാപ്പിൽ സംസാരിക്കാം")}</h3>
                  <p>{t("We're here to help with your booking, bulk orders or any queries.", "ബുക്കിംഗ്, മൊത്തവ്യാപാരം തുടങ്ങിയ കാര്യങ്ങൾക്ക് ഞങ്ങൾ സഹായിക്കാം.")}</p>
                </div>
              </div>
              <WhatsApp number={settings.whatsapp} className="btn-whatsapp-white" style={{textDecoration: 'none'}}>
                {t("WhatsApp Now", "വാട്ട്സാപ്പിൽ ബന്ധപ്പെടുക")} <ArrowUpRight size={16} />
              </WhatsApp>
            </div>
          </div>
        </div>
      )}

      <footer className="footer-section">
        <div className="container">
          <div className="footer-top">
            
            <div className="footer-col brand-col">
              <div className="footer-logo">
                <svg width="28" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="logo-icon-footer">
                  <path d="M13 8c0-3.3-2.7-6-6-6-1.1 0-2.2.3-3.2.8.2.3.4.6.6 1 1.6 2.3 4.3 4.2 7.2 5z"/>
                  <path d="M13 8c0-3.3 2.7-6 6-6 1.1 0 2.2.3 3.2.8-.2.3-.4.6-.6 1-1.6 2.3-4.3 4.2-7.2 5z"/>
                  <path d="M13 8c0 3.3-2.7 6-6 6-1.1 0-2.2-.3-3.2-.8.2-.3.4-.6.6-1 1.6-2.3 4.3-4.2 7.2-5z"/>
                  <path d="M13 8c0 3.3 2.7 6 6 6 1.1 0 2.2-.3 3.2-.8-.2-.3-.4-.6-.6-1-1.6-2.3-4.3-4.2-7.2-5z"/>
                  <path d="M13 8v14"/>
                </svg>
                <div className="logo-text">
                  <span className="logo-title text-white">COCOTRIBE</span>
                  <span className="logo-subtitle text-white-50">{t("GOODNESS FROM NATURE • WITH YOU ALWAYS", "പ്രകൃതിയുടെ നന്മ • എപ്പോഴും നിങ്ങൾക്കൊപ്പം")}</span>
                </div>
              </div>
              <div className="footer-tagline-container">
                <div className="footer-palm-bg">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(176,136,82,0.3)" strokeWidth="1"><path d="M13 8c0-3.3-2.7-6-6-6-1.1 0-2.2.3-3.2.8.2.3.4.6.6 1 1.6 2.3 4.3 4.2 7.2 5z"/><path d="M13 8v14"/></svg>
                </div>
                <div className="footer-tagline">
                  <p>{t("Nature's Goodness", "പ്രകൃതിയുടെ നന്മ")}</p>
                  <p><em>{t("for a More Meaningful Tomorrow", "കൂടുതൽ അർത്ഥവത്തായ നാളെയ്ക്കായി")}</em></p>
                </div>
              </div>
            </div>

            <div className="footer-col">
              <h4 className="footer-heading">{t("Quick Links", "പെട്ടെന്നുള്ള ലിങ്കുകൾ")}</h4>
              <ul className="footer-links">
                {links.map(([href, en, ml]) => (
                  <li key={href}><Link href={href}>{t(en, ml)}</Link></li>
                ))}
              </ul>
            </div>

            <div className="footer-col contact-col">
              <h4 className="footer-heading">{t("Contact Us", "ബന്ധപ്പെടുക")}</h4>
              <ul className="footer-contact">
                <li><Phone size={16} /> +{settings.phone}</li>
                <li><WhatsApp number={settings.whatsapp} className=""><span style={{display: 'flex', alignItems: 'center', gap: '12px'}}>{t("Chat on WhatsApp", "വാട്ട്സാപ്പിൽ സംസാരിക്കാം")}</span></WhatsApp></li>
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> {settings.email || "hello@kokotribe.in"}</li>
                <li className="align-start"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> <span>{t(settings.addressEn, settings.addressMl)}</span></li>
              </ul>
            </div>

            <div className="footer-col right-tagline-col">
              <div className="right-tagline">
                <div className="footer-palm-large">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(176,136,82,0.6)" strokeWidth="1"><path d="M13 8c0-3.3-2.7-6-6-6-1.1 0-2.2.3-3.2.8.2.3.4.6.6 1 1.6 2.3 4.3 4.2 7.2 5z"/><path d="M13 8v14"/></svg>
                </div>
                <div>
                  <p>{t("Good Coconuts", "നല്ല തേങ്ങകൾ")}</p>
                  <p><em>{t("Brighter Tomorrows", "ശോഭനമായ നാളെ")}</em></p>
                </div>
              </div>
            </div>

          </div>
          
          <div className="footer-bottom">
            <div className="copyright">
              © {new Date().getFullYear()} COCOTRIBE. {t("All rights reserved.", "എല്ലാ അവകാശങ്ങളും നിക്ഷിപ്തം.")}
            </div>
            
            <div className="footer-legal">
              <Link href="/privacy">{t("Privacy Policy", "സ്വകാര്യതാ നയം")}</Link>
              <span className="separator">|</span>
              <Link href="/terms">{t("Terms & Conditions", "നിബന്ധനകൾ")}</Link>
            </div>

            <div className="footer-social">
              <a href="#">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
              </a>
            </div>

            <div className="footer-made-with">
              {t("Rooted in Kerala • Serving with Heart 🤍", "കേരളത്തിൽ നിന്ന് • സ്നേഹത്തോടെ സേവനം 🤍")}
            </div>
          </div>
        </div>
      </footer>
      {!admin && (
        <div className="mobile-actions">
          <WhatsApp number={settings.whatsapp} className="button outline">
            WhatsApp
          </WhatsApp>
          <Link href="/book" className="button">
            {t("Book Now", "ബുക്ക് ചെയ്യാം")}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      )}
    </>
  );
}
