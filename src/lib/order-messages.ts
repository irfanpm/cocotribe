import { translate, type Locale } from "./translate";
export const statuses: Record<string, [string, string]> = {
  PENDING: ["Pending", "കാത്തിരിക്കുന്നു"],
  CONFIRMED: ["Confirmed", "സ്ഥിരീകരിച്ചു"],
  PREPARING: ["Preparing", "തയ്യാറാക്കുന്നു"],
  READY: ["Ready", "തയ്യാർ"],
  COMPLETED: ["Completed", "പൂർത്തിയായി"],
  CANCELLED: ["Cancelled", "റദ്ദാക്കി"],
  PAID: ["Paid", "പണമടച്ചു"],
  REFUND_REQUIRED: ["Refund to be arranged", "റീഫണ്ട് ക്രമീകരിക്കണം"],
  REFUNDED: ["Refunded", "പണം തിരികെ നൽകി"],
  DELIVERY: ["Cash on Delivery", "ക്യാഷ് ഓൺ ഡെലിവറി"],
  RAZORPAY: ["Online · Razorpay", "ഓൺലൈൻ · Razorpay"],
};
type Words = { hello: string; update: string; order: string; payment: string; track: string; book: string; help: string };
const wording: Record<Locale, Words> = {
  en: { hello: "Hello", update: "here is an update on your COCOTRIBE booking", order: "Order status", payment: "Payment status", track: "Check your order status any time", book: "Book again", help: "Please reply here if you have any questions." },
  ml: { hello: "നമസ്കാരം", update: "നിങ്ങളുടെ COCOTRIBE ബുക്കിംഗിന്റെ പുതിയ വിവരം", order: "ഓർഡർ നില", payment: "പേയ്‌മെന്റ് നില", track: "ഓർഡർ നില എപ്പോൾ വേണമെങ്കിലും അറിയാം", book: "വീണ്ടും ബുക്ക് ചെയ്യാം", help: "സംശയങ്ങളുണ്ടെങ്കിൽ ഇവിടെ മറുപടി നൽകുക." },
  ta: { hello: "வணக்கம்", update: "உங்கள் COCOTRIBE முன்பதிவு பற்றிய புதிய தகவல்", order: "ஆர்டர் நிலை", payment: "கட்டண நிலை", track: "உங்கள் ஆர்டர் நிலையை எப்போது வேண்டுமானாலும் பார்க்கலாம்", book: "மீண்டும் முன்பதிவு செய்ய", help: "சந்தேகங்கள் இருந்தால் இங்கே பதிலளிக்கவும்." },
  hi: { hello: "नमस्ते", update: "आपकी COCOTRIBE बुकिंग की नई जानकारी", order: "ऑर्डर की स्थिति", payment: "भुगतान की स्थिति", track: "अपने ऑर्डर की स्थिति कभी भी देखें", book: "फिर से बुक करें", help: "कोई प्रश्न हो तो यहाँ उत्तर दें।" },
};
/** The site's address for links in messages; the admin page runs on the site itself. */
function site(siteUrl?: string) {
  const url = siteUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  return url.replace(/\/+$/, "");
}
export type OrderForMessage = {
  bookingId: string;
  name: string;
  phone: string;
  productNameEn: string;
  productNameMl: string;
  quantity: number;
  date: string;
  slotLabel: string;
  status: string;
  paymentStatus: string;
  language?: string;
};
function locale(value?: string): Locale {
  return value === "ml" || value === "ta" || value === "hi" ? value : "en";
}
/** The status update a customer receives, in the language they booked in. */
export function orderUpdateMessage(order: OrderForMessage, siteUrl?: string) {
  const lang = locale(order.language);
  const words = wording[lang];
  const label = (code: string) => translate(...(statuses[code] || [code, code]), lang);
  const base = site(siteUrl);
  // The status page asks for the booking phone number, so the link alone reveals nothing.
  const links = base
    ? [`${words.track}: ${base}/booking/${encodeURIComponent(order.bookingId)}`, `${words.book}: ${base}/book`]
    : [];
  return [
    `${words.hello} ${order.name}, ${words.update} ${order.bookingId}:`,
    `${translate(order.productNameEn, order.productNameMl, lang)} × ${order.quantity}`,
    `${order.date}, ${order.slotLabel} IST`,
    `${words.order}: ${label(order.status)}`,
    `${words.payment}: ${label(order.paymentStatus)}`,
    ...links,
    words.help,
  ].join("\n");
}
/** Opens WhatsApp with the message ready. Staff still press send; nothing goes automatically. */
export function orderUpdateLink(order: OrderForMessage, siteUrl?: string) {
  return `https://wa.me/${order.phone}?text=${encodeURIComponent(orderUpdateMessage(order, siteUrl))}`;
}
