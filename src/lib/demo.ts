export const sampleProducts = [
  {
    id: "fresh",
    slug: "fresh-coconut",
    nameEn: "Fresh Coconut",
    nameMl: "പച്ച തേങ്ങ",
    descriptionEn:
      "Premium quality fresh coconuts ideal for pooja and everyday use.",
    descriptionMl:
      "പൂജയ്ക്കും ദൈനംദിന ഉപയോഗത്തിനും മികച്ച ഗുണമേന്മയുള്ള തേങ്ങകൾ.",
    price: 4000,
    image: "/images/fresh.jpg",
    active: true,
    stock: 500,
  },
  {
    id: "copra",
    slug: "dry-coconut",
    nameEn: "Copra / Dry Coconut",
    nameMl: "കൊപ്ര / ഉണക്കത്തേങ്ങ",
    descriptionEn:
      "Dried coconuts, high quality and naturally processed.",
    descriptionMl:
      "ഉയർന്ന ഗുണമേന്മയുള്ള, സ്വാഭാവികമായി ഉണക്കിയ തേങ്ങകൾ.",
    price: 12000,
    image: "/images/copra.jpg",
    active: true,
    stock: 200,
  },
];
export const sampleSlots = [
  {
    id: "morning",
    label: "06:00 – 09:00",
    startMinute: 360,
    capacity: 50,
    active: true,
  },
  {
    id: "midmorning",
    label: "09:00 – 12:00",
    startMinute: 540,
    capacity: 50,
    active: true,
  },
  {
    id: "afternoon",
    label: "12:00 – 15:00",
    startMinute: 720,
    capacity: 50,
    active: true,
  },
  {
    id: "evening",
    label: "15:00 – 18:00",
    startMinute: 900,
    capacity: 50,
    active: true,
  },
];
export const sampleSettings = {
  id: "main",
  phone: "919496669360",
  whatsapp: "919496669360",
  email: "hello@cocotribe.in",
  addressEn: "West Nada, Guruvayur, Thrissur, Kerala – 680101",
  addressMl: "വെസ്റ്റ് നട, ഗുരുവായൂർ, തൃശ്ശൂർ, കേരളം – 680101",
  hoursEn: "Contact us to confirm collection hours",
  hoursMl: "ശേഖരണ സമയം അറിയാൻ ബന്ധപ്പെടുക",
  heroEn: "Pre-Book Fresh Coconuts Before Your Guruvayur Visit",
  heroMl: "ഗുരുവായൂർ ദർശനത്തിന് മുമ്പേ പുതിയ തേങ്ങകൾ ബുക്ക് ചെയ്യൂ",
  aboutEn:
    "COCOTRIBE brings coconut sourcing and thoughtful customer service together. From a family’s temple visit to a business’s regular supply, we help arrange the right quantity and a convenient collection time.",
  aboutMl:
    "നല്ല തേങ്ങകളും കരുതലുള്ള സേവനവും ഒരുമിപ്പിക്കുകയാണ് COCOTRIBE. കുടുംബത്തിന്റെ ക്ഷേത്രദർശനത്തിനായാലും സ്ഥാപനത്തിന്റെ പതിവ് ആവശ്യത്തിനായാലും വേണ്ട അളവും സൗകര്യപ്രദമായ ശേഖരണ സമയവും ക്രമീകരിക്കാൻ ഞങ്ങൾ സഹായിക്കുന്നു.",
  leadHours: 2,
  maxDays: 90,
  deliveryEnabled: true,
  onlineEnabled: false,
};
const faqRows = [
  [
    "How early should I pre-book?",
    "എത്ര നേരത്തേ ബുക്ക് ചെയ്യണം?",
    "Please book at least 2 hours ahead. Available dates and time slots are shown when you book. For larger orders, contact us in advance.",
    "കുറഞ്ഞത് 2 മണിക്കൂർ മുമ്പ് ബുക്ക് ചെയ്യുക. ലഭ്യമായ തീയതികളും സമയവും ബുക്ക് ചെയ്യുമ്പോൾ കാണാം. വലിയ ഓർഡറുകൾക്ക് മുൻകൂട്ടി ബന്ധപ്പെടുക.",
  ],
  [
    "Can I order multiple coconuts?",
    "ഒന്നിലധികം തേങ്ങകൾ ഓർഡർ ചെയ്യാമോ?",
    "Yes. Choose your quantity while booking. Contact us for quantities beyond the available stock or for wholesale pricing.",
    "തീർച്ചയായും. ബുക്ക് ചെയ്യുമ്പോൾ എണ്ണം തിരഞ്ഞെടുക്കുക. വലിയ അളവുകൾക്കും മൊത്തവിലയ്ക്കും ഞങ്ങളെ ബന്ധപ്പെടുക.",
  ],
  [
    "Can I pay online?",
    "ഓൺലൈനായി പണമടയ്ക്കാമോ?",
    "Yes, when online payments are enabled, Razorpay checkout supports the payment options available for your account, including UPI and cards.",
    "ഓൺലൈൻ പേയ്‌മെന്റ് ലഭ്യമാകുമ്പോൾ Razorpay വഴി UPI, കാർഡ് തുടങ്ങിയ ലഭ്യമായ മാർഗങ്ങളിൽ പണമടയ്ക്കാം.",
  ],
  [
    "Is Pay at Delivery available?",
    "ലഭിക്കുമ്പോൾ പണമടയ്ക്കാമോ?",
    "Yes, when available at checkout. Payment is collected when you receive your order, at the collection or delivery arrangement confirmed with us.",
    "ചെക്കൗട്ടിൽ ഈ മാർഗം ലഭ്യമാണെങ്കിൽ തിരഞ്ഞെടുക്കാം. മുൻകൂട്ടി ഉറപ്പിച്ച ക്രമീകരണപ്രകാരം ഓർഡർ ലഭിക്കുമ്പോൾ പണമടയ്ക്കാം.",
  ],
  [
    "Can I change my booking?",
    "ബുക്കിംഗ് മാറ്റാനാകുമോ?",
    "Call or WhatsApp us with your booking ID as early as possible. Changes and cancellations depend on preparation status; any refund is confirmed by our team.",
    "ബുക്കിംഗ് നമ്പർ സഹിതം എത്രയും വേഗം വിളിക്കുകയോ WhatsApp ചെയ്യുകയോ ചെയ്യുക. തയ്യാറാക്കലിന്റെ ഘട്ടമനുസരിച്ചാണ് മാറ്റങ്ങളും റദ്ദാക്കലും. റീഫണ്ട് ടീം സ്ഥിരീകരിക്കും.",
  ],
  [
    "How do I know my order is confirmed?",
    "ഓർഡർ ഉറപ്പായെന്ന് എങ്ങനെ അറിയാം?",
    "After placing your booking, you will receive a booking ID and a private summary link. The status on that page shows whether your booking is pending or confirmed.",
    "ബുക്ക് ചെയ്താൽ ബുക്കിംഗ് നമ്പറും സ്വകാര്യ സംഗ്രഹ ലിങ്കും ലഭിക്കും. ബുക്കിംഗ് കാത്തിരിക്കുകയാണോ സ്ഥിരീകരിച്ചോ എന്ന് ആ പേജിൽ കാണാം.",
  ],
  [
    "Can I place bulk orders?",
    "മൊത്തമായി ഓർഡർ ചെയ്യാമോ?",
    "Yes. Contact us for bulk, wholesale, commercial and export-related supply enquiries. Availability, pricing and fulfilment are agreed individually.",
    "അതെ. മൊത്തവ്യാപാരം, സ്ഥാപനങ്ങൾ, കയറ്റുമതി സംബന്ധിച്ച വിതരണ ആവശ്യങ്ങൾക്ക് ബന്ധപ്പെടുക. ലഭ്യതയും വിലയും വിതരണവും പ്രത്യേകം ഉറപ്പിക്കും.",
  ],
  [
    "How do I contact you on WhatsApp?",
    "WhatsApp-ൽ എങ്ങനെ ബന്ധപ്പെടാം?",
    "Use any WhatsApp button on this website to chat with COCOTRIBE. Product enquiry buttons include the selected product in your message.",
    "ഈ വെബ്സൈറ്റിലെ WhatsApp ബട്ടൺ അമർത്തിയാൽ COCOTRIBE-യുമായി സംസാരിക്കാം. ഉൽപ്പന്നത്തിന്റെ ബട്ടണിൽ അമർത്തിയാൽ അതിന്റെ പേരും സന്ദേശത്തിൽ ഉണ്ടാകും.",
  ],
];
export const sampleFaqs = faqRows.map((f, i) => ({
  id: `faq-${i}`,
  questionEn: f[0],
  questionMl: f[1],
  answerEn: f[2],
  answerMl: f[3],
  position: i,
  active: true,
}));
export type ProductView = (typeof sampleProducts)[number];
export type SettingsView = typeof sampleSettings;
export type SlotView = (typeof sampleSlots)[number];
export type FaqView = (typeof sampleFaqs)[number];
export type Catalog = {
  products: ProductView[];
  slots: SlotView[];
  settings: SettingsView;
  faqs: FaqView[];
  demo: boolean;
  online: boolean;
};
