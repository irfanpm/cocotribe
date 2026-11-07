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
  DELIVERY: ["Pay at Delivery", "ലഭിക്കുമ്പോൾ പണമടയ്ക്കാം"],
  RAZORPAY: ["Online · Razorpay", "ഓൺലൈൻ · Razorpay"],
};
const wording: Record<Locale, { hello: string; update: string; order: string; payment: string; help: string }> = {
  en: { hello: "Hello", update: "here is an update on your COCOTRIBE booking", order: "Order status", payment: "Payment status", help: "Please reply here if you have any questions." },
  ml: { hello: "നമസ്കാരം", update: "നിങ്ങളുടെ COCOTRIBE ബുക്കിംഗിന്റെ പുതിയ വിവരം", order: "ഓർഡർ നില", payment: "പേയ്‌മെന്റ് നില", help: "സംശയങ്ങളുണ്ടെങ്കിൽ ഇവിടെ മറുപടി നൽകുക." },
  ta: { hello: "வணக்கம்", update: "உங்கள் COCOTRIBE முன்பதிவு பற்றிய புதிய தகவல்", order: "ஆர்டர் நிலை", payment: "கட்டண நிலை", help: "சந்தேகங்கள் இருந்தால் இங்கே பதிலளிக்கவும்." },
  hi: { hello: "नमस्ते", update: "आपकी COCOTRIBE बुकिंग की नई जानकारी", order: "ऑर्डर की स्थिति", payment: "भुगतान की स्थिति", help: "कोई प्रश्न हो तो यहाँ उत्तर दें।" },
};
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
export function orderUpdateMessage(order: OrderForMessage) {
  const lang = locale(order.language);
  const words = wording[lang];
  const label = (code: string) => translate(...(statuses[code] || [code, code]), lang);
  return [
    `${words.hello} ${order.name}, ${words.update} ${order.bookingId}:`,
    `${translate(order.productNameEn, order.productNameMl, lang)} × ${order.quantity}`,
    `${order.date}, ${order.slotLabel} IST`,
    `${words.order}: ${label(order.status)}`,
    `${words.payment}: ${label(order.paymentStatus)}`,
    words.help,
  ].join("\n");
}
/** Opens WhatsApp with the message ready. Staff still press send; nothing goes automatically. */
export function orderUpdateLink(order: OrderForMessage) {
  return `https://wa.me/${order.phone}?text=${encodeURIComponent(orderUpdateMessage(order))}`;
}
