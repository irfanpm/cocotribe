"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Phone, Mail, MapPin, Palmtree, Heart } from "lucide-react";
import { useLanguage } from "./language";
import { WhatsApp } from "./ui";
import { ReferenceCrop } from "./reference-home";
import type { SettingsView } from "@/lib/demo";
const links = [
  ["/", "Home", "ഹോം"],
  ["/book", "Book Coconuts", "ബുക്കിംഗ്"],
  ["/products", "Products", "ഉൽപ്പന്നങ്ങൾ"],
  ["/services", "Services", "സേവനങ്ങൾ"],
  ["/about", "About", "ഞങ്ങളെക്കുറിച്ച്"],
  ["/faq", "FAQ", "ചോദ്യങ്ങൾ"],
  ["/contact", "Contact", "ബന്ധപ്പെടുക"],
];
function Brand({footer = false}: {footer?: boolean}) {
  const {t} = useLanguage();
  return <span className="ref-brand-lockup"><ReferenceCrop x={footer ? 55 : 106} y={footer ? 839 : 61} w={36} h={footer ? 42 : 47} label="" className="ref-brand-palm"/><span><strong>COCOTRIBE</strong><small>{t("GOODNESS FROM NATURE · WITH YOU ALWAYS", "പ്രകൃതിയുടെ നന്മ · എന്നും നിങ്ങളോടൊപ്പം")}</small></span></span>;
}
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
    <div className="reference-site">
      <a href="#main" className="skip">
        {t("Skip to content", "ഉള്ളടക്കത്തിലേക്ക് പോകുക")}
      </a>
      <header className="ref-header">
        <Link href="/" aria-label={t("COCOTRIBE Home", "COCOTRIBE ഹോം")}>
          <Brand />
        </Link>
        <nav
          className={open ? "ref-nav open" : "ref-nav"}
          aria-label={t("Main navigation", "പ്രധാന മെനു")}
        >
          {links.map(([href, en, ml]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {t(en, ml)}
            </Link>
          ))}
        </nav>
        <div className="ref-header-actions">
          <label className="language coco-language">
            <span className="sr-only">{t("Language", "ഭാഷ")}</span>
            <select aria-label={t("Language", "ഭാഷ")} value={lang} onChange={e => setLang(e.target.value as "en" | "ml" | "ta" | "hi")}>
              <option value="en">English</option>
              <option value="ml">മലയാളം</option>
              <option value="ta">தமிழ்</option>
              <option value="hi">हिन्दी</option>
            </select>
          </label>
          <Link className="ref-gold-button" href="/book">
            {t("Book Now", "ബുക്ക് ചെയ്യാം")}
          </Link>
          <button
            className="ref-menu"
            aria-expanded={open}
            aria-label={t("Toggle menu", "മെനു തുറക്കുക")}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main" className={pathname !== "/" && !admin ? "coco-inner" : undefined}>{children}</main>
      <footer className="ref-footer">
        <div className="ref-footer-main">
          <div className="ref-footer-brand">
            <Link href="/">
              <Brand footer />
            </Link>
          </div>
          <div className="ref-footer-motto">
            <Palmtree size={65} />
            <p>
              {t("Nature’s Goodness", "പ്രകൃതിയുടെ നന്മ")}
              <br />
              <i>
                {t(
                  "for a More Meaningful Tomorrow",
                  "അർത്ഥവത്തായ നാളെയ്ക്കായി",
                )}
              </i>
            </p>
          </div>
          <div className="ref-footer-links">
            <h3>{t("Quick Links", "പ്രധാന ലിങ്കുകൾ")}</h3>
            <div>
              {links.map(([href, en, ml]) => (
                <Link key={href} href={href}>
                  {t(en, ml)}
                </Link>
              ))}
            </div>
          </div>
          <div className="ref-footer-contact">
            <h3>{t("Contact Us", "ബന്ധപ്പെടുക")}</h3>
            <a href={`tel:+${settings.phone}`}>
              <Phone size={12} />+{settings.phone}
            </a>
            <WhatsApp number={settings.whatsapp} className="ref-footer-wa">
              {t("Chat on WhatsApp", "WhatsApp-ൽ സംസാരിക്കാം")}
            </WhatsApp>
            {settings.email && (
              <a href={`mailto:${settings.email}`}>
                <Mail size={12} />
                {settings.email}
              </a>
            )}
            <p>
              <MapPin size={12} />
              {t(settings.addressEn, settings.addressMl)}
            </p>
          </div>
          <div className="ref-footer-good">
            <Palmtree size={65} />
            <p>
              <i>
                {t("Good Coconuts", "നല്ല തേങ്ങകൾ")}
                <br />
                {t("Brighter Tomorrows", "നന്മ നിറഞ്ഞ നാളെകൾ")}
              </i>
            </p>
          </div>
        </div>
        <div className="ref-footer-bottom">
          <span>
            © {new Date().getFullYear()} COCOTRIBE.{" "}
            {t("All rights reserved.", "എല്ലാ അവകാശങ്ങളും നിക്ഷിപ്തം.")}
          </span>
          <div>
            <Link href="/privacy">{t("Privacy Policy", "സ്വകാര്യതാ നയം")}</Link>
            <span>|</span>
            <Link href="/terms">{t("Terms & Conditions", "നിബന്ധനകൾ")}</Link>
          </div>
          <span>
            {t(
              "Rooted in Kerala · Serving with Heart",
              "കേരളത്തിന്റെ നന്മ · ഹൃദയപൂർവ്വം സേവനം",
            )}{" "}
            <Heart size={11} />
          </span>
        </div>
        <div className="ref-site-notice">
          {demo && (
            <span>
              {t(
                "Preview · Sample prices · Online booking not yet open.",
                "പ്രിവ്യൂ · മാതൃകാ വിലകൾ · ഓൺലൈൻ ബുക്കിംഗ് ആരംഭിച്ചിട്ടില്ല.",
              )}
            </span>
          )}
          <span>
            {t(
              "Independent business. Not affiliated with Guruvayur Temple.",
              "സ്വതന്ത്ര സ്ഥാപനം. ഗുരുവായൂർ ക്ഷേത്രവുമായി ഔദ്യോഗിക ബന്ധമില്ല.",
            )}
          </span>
        </div>
      </footer>
      {!admin && (
        <div className="mobile-actions">
          <WhatsApp number={settings.whatsapp} className="button outline">
            WhatsApp
          </WhatsApp>
          <Link href="/book" className="button">
            {t("Book Now", "ബുക്ക് ചെയ്യാം")}
          </Link>
        </div>
      )}
    </div>
  );
}
