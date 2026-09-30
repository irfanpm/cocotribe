"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  Phone,
  Printer,
  RefreshCw,
  MessageCircle,
} from "lucide-react";
import { useLanguage } from "./language";
import { Heading, Quantity, money, WhatsApp, ErrorMessage } from "./ui";
import { indiaDate } from "@/lib/validation";
import type { Catalog } from "@/lib/demo";
type GatewayResponse = {
  razorpay_payment_id: string;
  razorpay_signature: string;
};
type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; contact: string };
  theme: { color: string };
  handler: (r: GatewayResponse) => void;
  modal: { ondismiss: () => void };
};
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
      on: (name: string, fn: () => void) => void;
    };
  }
}
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
async function loadCheckout() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error("PAYMENT_UNAVAILABLE"));
    };
    document.head.appendChild(script);
  });
}
export function Booking({ catalog }: { catalog: Catalog }) {
  const { t, lang } = useLanguage();
  const params = useSearchParams();
  const router = useRouter();
  const [productId, setProductId] = useState(
    params.get("product") || catalog.products[0]?.id || "",
  );
  const [quantity, setQuantity] = useState(
    Math.max(1, Math.min(1000, Number(params.get("quantity")) || 1)),
  );
  const [date, setDate] = useState(params.get("date") || "");
  const [slotId, setSlotId] = useState("");
  const [method, setMethod] = useState(
    "DELIVERY",
  );
  const [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [notes, setNotes] = useState("");
  const [stage, setStage] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const requestKey = useRef("");
  const reviewRef = useRef<HTMLHeadingElement>(null);
  const product = catalog.products.find((p) => p.id === productId);
  const slot = catalog.slots.find((s) => s.id === slotId);
  useEffect(() => {
    if (stage === 1) reviewRef.current?.focus();
  }, [stage]);
  useEffect(() => {
    const raw = sessionStorage.getItem("cocotribe-booking-draft");
    if (!raw) return;
    sessionStorage.removeItem("cocotribe-booking-draft");
    try {
      const draft = JSON.parse(raw);
      setName(String(draft.name || ""));
      setPhone(String(draft.phone || ""));
      if (catalog.products.some((p) => p.id === draft.productId))
        setProductId(draft.productId);
      setQuantity(Math.max(1, Math.min(1000, Number(draft.quantity) || 1)));
      setDate(String(draft.date || ""));
      setSlotId(String(draft.slotId || ""));
      if (
        draft.method === "DELIVERY" ||
        (draft.method === "RAZORPAY" && catalog.online)
      )
        setMethod(draft.method);
    } catch {
      /* Ignore malformed temporary drafts. */
    }
  }, []);
  const maxDate = indiaDate(
    new Date(Date.now() + catalog.settings.maxDays * 86400000),
  );
  function review(e: React.FormEvent) {
    e.preventDefault();
    if (!product || !slot) return;
    setError("");
    setStage(1);
  }
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      if (!requestKey.current) requestKey.current = crypto.randomUUID();
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          productId,
          quantity,
          expectedUnitPrice: product?.price,
          date,
          slotId,
          notes,
          method,
          language: lang,
          requestKey: requestKey.current,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const href = `/booking/${result.order.bookingId}#${result.token}`;
      if (!result.gateway || result.order.paymentStatus === "PAID") {
        router.push(href);
        return;
      }
      await loadCheckout();
      const checkout = new window.Razorpay({
        key: result.gateway.key,
        order_id: result.gateway.orderId,
        amount: result.gateway.amount,
        currency: "INR",
        name: "COCOTRIBE",
        description: result.order.bookingId,
        prefill: { name, contact: phone },
        theme: { color: "#173f32" },
        handler: async (payment) => {
          try {
            await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...payment,
                bookingId: result.order.bookingId,
                token: result.token,
              }),
            });
          } finally {
            router.push(href);
          }
        },
        modal: { ondismiss: () => router.push(href) },
      });
      checkout.on("payment.failed", () => router.push(href));
      checkout.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "SERVICE_UNAVAILABLE");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="wrap page-space">
      <Heading
        en="Book Your Coconuts"
        ml="യാത്രയിൽ ഒരു ആശങ്ക കുറയ്ക്കാം."
        eyebrow={t("BOOK YOUR COCONUTS", "നിങ്ങളുടെ തേങ്ങ ബുക്ക് ചെയ്യാം")}
      >
        <p>
          {t(
            "Tell us what you need, and when you’re visiting.",
            "എന്താണ് വേണ്ടതെന്നും എപ്പോഴാണ് വരുന്നതെന്നും അറിയിക്കൂ.",
          )}
        </p>
      </Heading>
      <ol className="progress">
        <li className="active">
          <span>1</span>
          {t("Your details", "നിങ്ങളുടെ വിവരങ്ങൾ")}
        </li>
        <li className={stage === 1 ? "active" : ""}>
          <span>2</span>
          {t("Review & book", "പരിശോധിച്ച് ബുക്ക് ചെയ്യാം")}
        </li>
        <li>
          <span>3</span>
          {t("Booking summary", "ബുക്കിംഗ് സംഗ്രഹം")}
        </li>
      </ol>
      <div className="booking-grid">
        <div className="panel">
          {stage === 0 ? (
            <form onSubmit={review}>
              <h2>
                {t("Let’s plan your order.", "നിങ്ങളുടെ ഓർഡർ തയ്യാറാക്കാം.")}
              </h2>
              <div className="form-grid">
                <label className="field">
                  {t("Full name", "പൂർണ്ണ പേര്")}
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    name="name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </label>
                <label className="field">
                  {t("Mobile number", "മൊബൈൽ നമ്പർ")}
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    pattern="[0-9+ ()-]{10,18}"
                    placeholder="9496669360"
                  />
                </label>
                <label className="field">
                  {t("Product", "ഉൽപ്പന്നം")}
                  <select
                    value={productId}
                    required
                    onChange={(e) => {
                      setProductId(e.target.value);
                      setQuantity(1);
                    }}
                  >
                    {catalog.products.map((p) => (
                      <option key={p.id} value={p.id} disabled={!p.stock}>
                        {t(p.nameEn, p.nameMl)} · {money(p.price, lang)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="field">
                  <label>{t("Quantity", "എണ്ണം")}</label>
                  <Quantity
                    value={quantity}
                    onChange={setQuantity}
                    max={Math.min(product?.stock || 1, 1000)}
                  />
                </div>
                <label className="field">
                  {t("Required date", "ആവശ്യമായ തീയതി")}
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={indiaDate()}
                    max={maxDate}
                    required
                  />
                </label>
                <label className="field">
                  {t("Preferred time slot", "സൗകര്യപ്രദമായ സമയം")}
                  <select
                    value={slotId}
                    onChange={(e) => setSlotId(e.target.value)}
                    required
                  >
                    <option value="">
                      {t("Choose a time", "സമയം തിരഞ്ഞെടുക്കുക")}
                    </option>
                    {catalog.slots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="muted">
                {t(
                  `All times are in India (IST). Please book at least ${catalog.settings.leadHours} hours ahead.`,
                  `എല്ലാ സമയവും ഇന്ത്യൻ സമയം (IST). കുറഞ്ഞത് ${catalog.settings.leadHours} മണിക്കൂർ മുമ്പ് ബുക്ക് ചെയ്യുക.`,
                )}
              </p>
              <label className="field">
                {t("Notes (optional)", "കുറിപ്പുകൾ (വേണമെങ്കിൽ)")}
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder={t(
                    "Anything we should know about your order?",
                    "നിങ്ങളുടെ ഓർഡറിനെക്കുറിച്ച് എന്തെങ്കിലും അറിയിക്കണോ?",
                  )}
                />
              </label>
              <fieldset className="payment-choices">
                <legend>
                  {t(
                    "How would you like to pay?",
                    "എങ്ങനെ പണമടയ്ക്കാൻ ആഗ്രഹിക്കുന്നു?",
                  )}
                </legend>
                {catalog.settings.deliveryEnabled && (
                  <label className={method === "DELIVERY" ? "selected" : ""}>
                    <input
                      type="radio"
                      name="payment"
                      value="DELIVERY"
                      checked={method === "DELIVERY"}
                      onChange={(e) => setMethod(e.target.value)}
                    />
                    <span>
                      <strong>
                        {t("Pay at Delivery", "ലഭിക്കുമ്പോൾ പണമടയ്ക്കാം")}
                      </strong>
                      <small>
                        {t(
                          "Pay when you receive your coconuts.",
                          "തേങ്ങ കൈപ്പറ്റുമ്പോൾ പണമടയ്ക്കാം.",
                        )}
                      </small>
                    </span>
                  </label>
                )}
              </fieldset>
              <button
                className="button full"
                disabled={
                  !product?.stock ||
                  (!catalog.online && !catalog.settings.deliveryEnabled)
                }
              >
                {t("Review my booking", "ബുക്കിംഗ് പരിശോധിക്കാം")}
                <ArrowRight size={18} />
              </button>
            </form>
          ) : (
            <div>
              <h2 ref={reviewRef} tabIndex={-1}>
                {t("Everything look right?", "എല്ലാ വിവരങ്ങളും ശരിയാണോ?")}
              </h2>
              <p>
                {t(
                  "Please check your details before placing the booking.",
                  "ബുക്കിംഗ് നൽകുന്നതിനുമുമ്പ് വിവരങ്ങൾ പരിശോധിക്കുക.",
                )}
              </p>
              <dl className="summary-list">
                {[
                  [t("Name", "പേര്"), name],
                  [t("Mobile", "മൊബൈൽ"), phone],
                  [
                    t("Product", "ഉൽപ്പന്നം"),
                    product ? t(product.nameEn, product.nameMl) : "",
                  ],
                  [t("Quantity", "എണ്ണം"), quantity],
                  [
                    t("Price per piece", "ഒരു എണ്ണത്തിന്റെ വില"),
                    money(product?.price || 0, lang),
                  ],
                  [t("Date", "തീയതി"), date],
                  [t("Time (IST)", "സമയം (IST)"), slot?.label],
                  [t("Payment", "പേയ്‌മെന്റ്"), t(...statuses[method])],
                  [t("Notes", "കുറിപ്പുകൾ"), notes || "—"],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="total-row">
                <span>{t("Total amount", "ആകെ തുക")}</span>
                <strong>{money((product?.price || 0) * quantity, lang)}</strong>
              </div>
              <p className="muted">
                {t(
                  "By placing this booking, you agree to our",
                  "ബുക്കിംഗ് നൽകുന്നതിലൂടെ നിങ്ങൾ അംഗീകരിക്കുന്നു:",
                )}{" "}
                <Link href="/terms">
                  {t("booking terms", "ബുക്കിംഗ് നിബന്ധനകൾ")}
                </Link>{" "}
                {t("and", "ഒപ്പം")}{" "}
                <Link href="/privacy">
                  {t("privacy policy", "സ്വകാര്യതാ നയം")}
                </Link>
                .
              </p>
              {error && <ErrorMessage code={error} />}
              <button className="button full" onClick={confirm} disabled={busy}>
                {busy
                  ? t("Processing…", "പ്രോസസ്സ് ചെയ്യുന്നു…")
                  : method === "RAZORPAY"
                    ? t(
                        "Continue to secure payment",
                        "സുരക്ഷിത പേയ്‌മെന്റിലേക്ക് തുടരാം",
                      )
                    : t("Place booking", "ബുക്കിംഗ് നൽകാം")}
                <ArrowRight size={18} />
              </button>
              <button
                className="text-link back-button"
                disabled={busy}
                onClick={() => {
                  setStage(0);
                  requestKey.current = "";
                }}
              >
                <ArrowLeft size={18} />
                {t("Edit details", "വിവരങ്ങൾ തിരുത്താം")}
              </button>
            </div>
          )}
        </div>
        <aside className="booking-aside">
          <img
            src={product?.image || "/images/hero.jpg"}
            alt={product ? t(product.nameEn, product.nameMl) : ""}
            width="500"
            height="320"
          />
          <div>
            <p className="eyebrow">{t("YOUR ORDER", "നിങ്ങളുടെ ഓർഡർ")}</p>
            <h3>
              {product
                ? t(product.nameEn, product.nameMl)
                : t("Select a product", "ഉൽപ്പന്നം തിരഞ്ഞെടുക്കുക")}
            </h3>
            <div className="summary-line">
              <span>
                {quantity} × {money(product?.price || 0, lang)}
              </span>
              <strong>{money((product?.price || 0) * quantity, lang)}</strong>
            </div>
            <p>
              <ShieldCheck size={18} />
              {t(
                "Pay when you receive your coconuts.",
                "തേങ്ങ കൈപ്പറ്റുമ്പോൾ പണമടയ്ക്കാം.",
              )}
            </p>
            <p>
              {t(
                "Please confirm the collection point or delivery arrangement with our team.",
                "ശേഖരണ സ്ഥലമോ വിതരണ ക്രമീകരണമോ ഞങ്ങളുടെ ടീമുമായി ഉറപ്പിക്കുക.",
              )}
            </p>
            <hr />
            <h3>{t("A little help?", "സഹായം വേണോ?")}</h3>
            <WhatsApp
              number={catalog.settings.whatsapp}
              className="text-link"
            />
            <a className="text-link" href={`tel:+${catalog.settings.phone}`}>
              <Phone size={17} />+{catalog.settings.phone}
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}
type OrderView = {
  bookingId: string;
  name: string;
  phone: string;
  productNameEn: string;
  productNameMl: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
  slotLabel: string;
  method: string;
  paymentStatus: string;
  status: string;
  notes: string;
};
export function Confirmation({
  id,
  catalog,
}: {
  id: string;
  catalog: Catalog;
}) {
  const { t, lang } = useLanguage();
  const [order, setOrder] = useState<OrderView | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const token = useRef("");
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/bookings/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token.current}` },
        cache: "no-store",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setOrder(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "SERVICE_UNAVAILABLE");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    token.current = window.location.hash.slice(1);
    void refresh();
  }, [id]);
  const msg = order
    ? t(
        `Hi COCOTRIBE, please confirm my booking ${id}: ${order.quantity} × ${order.productNameEn}, ${order.date}, ${order.slotLabel} IST.`,
        `നമസ്കാരം COCOTRIBE, എന്റെ ബുക്കിംഗ് ${id} സ്ഥിരീകരിക്കാമോ: ${order.quantity} × ${order.productNameMl}, ${order.date}, ${order.slotLabel} IST.`,
      )
    : "";
  return (
    <section className="wrap narrow page-space confirmation">
      {error && <ErrorMessage code={error} />}{" "}
      {loading && !order && (
        <p role="status">
          {t("Loading your booking…", "ബുക്കിംഗ് ലഭ്യമാക്കുന്നു…")}
        </p>
      )}
      {order && (
        <>
          <div className="confirmation-icon">
            <Check size={34} />
          </div>
          <Heading
            en={
              order.status === "CONFIRMED"
                ? "Your coconuts are booked."
                : order.status === "CANCELLED"
                  ? "This booking is cancelled."
                  : "Your booking has been received."
            }
            ml={
              order.status === "CONFIRMED"
                ? "നിങ്ങളുടെ തേങ്ങ ബുക്ക് ചെയ്തു."
                : order.status === "CANCELLED"
                  ? "ഈ ബുക്കിംഗ് റദ്ദാക്കി."
                  : "നിങ്ങളുടെ ബുക്കിംഗ് ലഭിച്ചു."
            }
          />
          <p>
            {t(
              "Keep this private page link for your records. Please don’t share it publicly.",
              "ഈ സ്വകാര്യ പേജ് ലിങ്ക് സൂക്ഷിക്കുക. പൊതുവായി പങ്കിടരുത്.",
            )}
          </p>
          <div className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t("BOOKING ID", "ബുക്കിംഗ് നമ്പർ")}</p>
                <h2>{order.bookingId}</h2>
              </div>
              <span className="status">{t(...statuses[order.status])}</span>
            </div>
            <dl className="summary-list">
              {[
                [t("Customer", "ഉപഭോക്താവ്"), order.name],
                [t("Mobile", "മൊബൈൽ"), order.phone],
                [
                  t("Product", "ഉൽപ്പന്നം"),
                  t(order.productNameEn, order.productNameMl),
                ],
                [t("Quantity", "എണ്ണം"), order.quantity],
                [
                  t("Unit price", "ഒരു എണ്ണത്തിന്റെ വില"),
                  money(order.unitPrice, lang),
                ],
                [t("Date", "തീയതി"), order.date],
                [t("Time (IST)", "സമയം (IST)"), order.slotLabel],
                [
                  t("Payment method", "പണമടയ്ക്കുന്ന മാർഗം"),
                  t(...statuses[order.method]),
                ],
                [
                  t("Payment status", "പേയ്‌മെന്റ് നില"),
                  t(...statuses[order.paymentStatus]),
                ],
                [t("Notes", "കുറിപ്പുകൾ"), order.notes || "—"],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="total-row">
              <span>{t("Total", "ആകെ")}</span>
              <strong>{money(order.total, lang)}</strong>
            </div>
            {order.status === "PENDING" && (
              <p className="notice">
                {order.method === "DELIVERY"
                  ? t(
                      "Our team will confirm availability and collection arrangements. You haven’t been charged.",
                      "ഞങ്ങളുടെ ടീം ലഭ്യതയും ശേഖരണ ക്രമീകരണവും സ്ഥിരീകരിക്കും. നിങ്ങളിൽ നിന്ന് പണം ഈടാക്കിയിട്ടില്ല.",
                    )
                  : t(
                      "Payment is not confirmed yet. If money was debited, refresh the status or contact us before paying again. An unpaid reservation expires after 30 minutes.",
                      "പേയ്‌മെന്റ് ഇതുവരെ സ്ഥിരീകരിച്ചിട്ടില്ല. പണം പോയെങ്കിൽ വീണ്ടും അടയ്ക്കുന്നതിന് മുമ്പ് നില പുതുക്കുകയോ ബന്ധപ്പെടുകയോ ചെയ്യുക. പണമടയ്ക്കാത്ത ബുക്കിംഗ് 30 മിനിറ്റിന് ശേഷം കാലഹരണപ്പെടും.",
                    )}
              </p>
            )}
            <div className="button-row no-print">
              <a
                className="button"
                target="_blank"
                rel="noopener noreferrer"
                href={`https://wa.me/${catalog.settings.whatsapp}?text=${encodeURIComponent(msg)}`}
              >
                <MessageCircle size={18} />
                {t("Confirm on WhatsApp", "WhatsApp-ൽ സ്ഥിരീകരിക്കാം")}
              </a>
              <button className="button outline" onClick={() => window.print()}>
                <Printer size={18} />
                {t("Print summary", "സംഗ്രഹം പ്രിന്റ് ചെയ്യാം")}
              </button>
              <button
                className="text-link"
                disabled={loading}
                onClick={refresh}
              >
                <RefreshCw size={17} />
                {t("Refresh status", "നില പുതുക്കുക")}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
