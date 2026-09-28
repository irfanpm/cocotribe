import { translations } from "./translations";
export type Locale = "en" | "ml" | "ta" | "hi";
export function translate(en: string, ml: string, lang: Locale): string {
  if (lang === "en") return en;
  if (lang === "ml") return ml;
  if (translations[en]) return translations[en][lang];
  const tamil = lang === "ta";
  let match = en.match(/^(\d+) available to book$/);
  if (match) return tamil ? `${match[1]} எண்ணிக்கை கிடைக்கும்` : `${match[1]} नग बुकिंग के लिए उपलब्ध`;
  match = en.match(/^All times are in India \(IST\)\. Please book at least (\d+) hours ahead\.$/);
  if (match) return tamil ? `அனைத்து நேரங்களும் இந்திய நேரம் (IST). குறைந்தது ${match[1]} மணி நேரம் முன்பே பதிவு செய்யவும்.` : `सभी समय भारतीय समय (IST) में हैं। कम से कम ${match[1]} घंटे पहले बुक करें।`;
  match = en.match(/^Hi COCOTRIBE, I would like to know more about (.+)\.$/);
  if (match) return tamil ? `வணக்கம் COCOTRIBE, ${match[1]} பற்றி மேலும் அறிய விரும்புகிறேன்.` : `नमस्ते COCOTRIBE, ${match[1]} के बारे में अधिक जानना चाहता/चाहती हूँ।`;
  match = en.match(/^Hi COCOTRIBE, please confirm my booking (.+): (\d+) × (.+), (\d{4}-\d{2}-\d{2}), (.+) IST\.$/);
  if (match) { const [,id,qty,product,date,slot] = match; const name = translations[product]?.[lang] || product;
    return tamil ? `வணக்கம் COCOTRIBE, எனது முன்பதிவு ${id} உறுதிசெய்யவும்: ${qty} × ${name}, ${date}, ${slot} IST.` : `नमस्ते COCOTRIBE, मेरी बुकिंग ${id} की पुष्टि करें: ${qty} × ${name}, ${date}, ${slot} IST.`;
  }
  // Custom administrator-authored content remains in English until translated.
  return en;
}
