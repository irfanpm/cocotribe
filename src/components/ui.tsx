"use client";
import Link from "next/link";
import { MessageCircle, ArrowUpRight, Minus, Plus, Leaf } from "lucide-react";
import { useLanguage } from "./language";
export function money(value: number, lang = "en") {
  return new Intl.NumberFormat(lang === "ml" ? "ml-IN" : "en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: value % 100 ? 2 : 0,
  }).format(value / 100);
}
export function WhatsApp({
  number,
  product,
  children,
  className = "button outline",
  style,
}: {
  number: string;
  product?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { t } = useLanguage();
  const message = product
    ? t(
        `Hi COCOTRIBE, I would like to know more about ${product}.`,
        `നമസ്കാരം COCOTRIBE, ${product}യെക്കുറിച്ച് കൂടുതൽ അറിയാൻ ആഗ്രഹിക്കുന്നു.`,
      )
    : t(
        "Hi COCOTRIBE, I would like to enquire about coconut booking.",
        "നമസ്കാരം COCOTRIBE, തേങ്ങ ബുക്കിംഗിനെക്കുറിച്ച് അറിയാൻ ആഗ്രഹിക്കുന്നു.",
      );
  return (
    <a
      className={className}
      style={style}
      href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <MessageCircle size={19} />
      {children || t("WhatsApp enquiry", "WhatsApp-ൽ ചോദിക്കാം")}
    </a>
  );
}
export function BookLink({
  href = "/book",
  small = false,
}: {
  href?: string;
  small?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <Link className={`button ${small ? "small" : ""}`} href={href}>
      {t("Book Coconuts", "തേങ്ങ ബുക്ക് ചെയ്യാം")}
      <ArrowUpRight size={18} />
    </Link>
  );
}
export function Quantity({
  value,
  onChange,
  max = 1000,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  const { t } = useLanguage();
  return (
    <div className="quantity">
      <button
        type="button"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        aria-label={t("Decrease quantity", "എണ്ണം കുറയ്ക്കുക")}
      >
        <Minus size={16} />
      </button>
      <input
        aria-label={t("Quantity", "എണ്ണം")}
        type="number"
        min="1"
        max={max}
        value={value}
        onChange={(e) =>
          onChange(Math.max(1, Math.min(max, Number(e.target.value) || 1)))
        }
      />
      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        aria-label={t("Increase quantity", "എണ്ണം കൂട്ടുക")}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
export function Brand() {
  const { t } = useLanguage();
  return (
    <span className="brand">
      <Leaf strokeWidth={1.5} size={33} />
      <span>
        COCOTRIBE<small>{t("ROOTED IN GOODNESS", "നന്മയിൽ വേരൂന്നി")}</small>
      </span>
    </span>
  );
}
export function Heading({
  eyebrow,
  en,
  ml,
  children,
}: {
  eyebrow?: string;
  en: string;
  ml: string;
  children?: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="page-heading">
      <Link href="/" className="inner-breadcrumb">{t("Home", "ഹോം")} <span aria-hidden="true">/</span> {t(en, ml)}</Link>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{t(en, ml)}</h1>
      {children}
    </div>
  );
}
export const errorMessages: Record<string, [string, string]> = {
  PRICE_CHANGED: [
    "The price has changed. Refresh this page and review the new total before booking.",
    "വില മാറിയിട്ടുണ്ട്. പേജ് പുതുക്കി പുതിയ ആകെ തുക പരിശോധിച്ചശേഷം ബുക്ക് ചെയ്യുക.",
  ],
  DEMO_MODE: [
    "This is a preview. Please call or WhatsApp us to book.",
    "ഇത് പ്രിവ്യൂ ആണ്. ബുക്ക് ചെയ്യാൻ വിളിക്കുകയോ WhatsApp ചെയ്യുകയോ ചെയ്യുക.",
  ],
  INVALID_INPUT: [
    "Please check the details and try again.",
    "വിവരങ്ങൾ പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക.",
  ],
  OUT_OF_STOCK: [
    "That quantity is no longer available. Please reduce it.",
    "ആ അളവ് ഇപ്പോൾ ലഭ്യമല്ല. എണ്ണം കുറയ്ക്കുക.",
  ],
  INVALID_SLOT: [
    "Please choose a later date or time.",
    "പിന്നീടുള്ള തീയതിയോ സമയമോ തിരഞ്ഞെടുക്കുക.",
  ],
  SLOT_FULL: [
    "This time slot is full. Please choose another.",
    "ഈ സമയം പൂർണ്ണമാണ്. മറ്റൊരു സമയം തിരഞ്ഞെടുക്കുക.",
  ],
  PAYMENT_UNAVAILABLE: [
    "Online payment is unavailable. Please try again or contact us.",
    "ഓൺലൈൻ പേയ്‌മെന്റ് ലഭ്യമല്ല. വീണ്ടും ശ്രമിക്കുക അല്ലെങ്കിൽ ബന്ധപ്പെടുക.",
  ],
  BOOKING_EXPIRED: [
    "This payment reservation expired. Please start a new booking.",
    "പണമടയ്ക്കാനുള്ള സമയം കഴിഞ്ഞു. പുതിയ ബുക്കിംഗ് ആരംഭിക്കുക.",
  ],
  RATE_LIMIT: [
    "Too many attempts. Please try again later or call us.",
    "കൂടുതൽ ശ്രമങ്ങൾ നടന്നു. അൽപ്പസമയത്തിന് ശേഷം ശ്രമിക്കുക അല്ലെങ്കിൽ വിളിക്കുക.",
  ],
  SERVICE_UNAVAILABLE: [
    "We could not complete that request. Please try again or call us.",
    "അഭ്യർത്ഥന പൂർത്തിയാക്കാനായില്ല. വീണ്ടും ശ്രമിക്കുക അല്ലെങ്കിൽ വിളിക്കുക.",
  ],
  NOT_FOUND: [
    "Booking not found. Please use your private confirmation link.",
    "ബുക്കിംഗ് കണ്ടെത്തിയില്ല. നിങ്ങളുടെ സ്വകാര്യ സ്ഥിരീകരണ ലിങ്ക് ഉപയോഗിക്കുക.",
  ],
  PAYMENT_INVALID: [
    "Payment could not be verified yet. Check your booking status before paying again.",
    "പേയ്‌മെന്റ് പരിശോധിക്കാൻ കഴിഞ്ഞില്ല. വീണ്ടും പണമടയ്ക്കുന്നതിന് മുമ്പ് ബുക്കിംഗ് നില പരിശോധിക്കുക.",
  ],
};
export function ErrorMessage({ code }: { code: string }) {
  const { t } = useLanguage();
  const pair = errorMessages[code] || errorMessages.SERVICE_UNAVAILABLE;
  return (
    <p className="notice error" role="alert">
      {t(...pair)}
    </p>
  );
}
