"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { CoconutLoader } from "./coconut-loader";
import { sampleProducts, sampleSlots, sampleFaqs, sampleSettings } from "@/lib/demo";
import { useRouter } from "next/navigation";
import { LogOut, Plus, Search, LockKeyhole, ArrowRight, X, Menu, LayoutDashboard, Package, CalendarDays, CircleHelp, Settings, Inbox, ExternalLink, Leaf, History, MessageCircle } from "lucide-react";
import { money } from "./ui";
import { nextOrderStatuses, nextPaymentStatuses } from "@/lib/order-rules";
import { orderUpdateLink, orderUpdateMessage } from "@/lib/order-messages";
import { PhoneAlerts } from "./phone-alerts";
import type { ProductView, SlotView, FaqView, SettingsView } from "@/lib/demo";
type AdminOrder = {
  id: string;
  bookingId: string;
  name: string;
  phone: string;
  productNameEn: string;
  productNameMl: string;
  language: string;
  quantity: number;
  date: string;
  slotLabel: string;
  total: number;
  method: string;
  paymentStatus: string;
  status: string;
  notes: string;
  createdAt: string;
};
type AdminData = {
  orders: AdminOrder[];
  count: number;
  page: number;
  products: ProductView[];
  slots: SlotView[];
  faqs: FaqView[];
  settings: SettingsView;
  messages: {
    id: string;
    name: string;
    phone: string;
    message: string;
    createdAt: string;
  }[];
  stats: Record<string, number>;
  audit: {
    id: string;
    adminEmail: string;
    action: string;
    entityId: string;
    details: Record<string, { from: unknown; to: unknown }> | null;
    createdAt: string;
  }[];
  reconcile?: { lastSuccessAt: string | null; lastError: string | null } | null;
  ownerAlerts?: { to: string } | null;
  push?: { publicKey: string | null; devices: number };
};
export function AdminLogin({ demo }: { demo: boolean }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  return (
    <section className="wrap narrow page-space">
      <form
        className="panel login-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const form = Object.fromEntries(new FormData(e.currentTarget));
          try {
            const r = await fetch("/api/admin/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(form),
            });
            if (!r.ok) {
              const data = await r.json();
              throw new Error(
                data.error === "INVALID_CREDENTIALS"
                  ? "The email or password is incorrect."
                  : data.error === "RATE_LIMIT"
                    ? "Too many attempts. Try again after 15 minutes."
                    : "Sign-in is unavailable. Check the server configuration.",
              );
            }
            router.push("/admin");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to sign in.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <LockKeyhole size={35} />
        <p className="eyebrow">COCOTRIBE · ADMIN</p>
        <h1>Welcome back.</h1>
        <p>Sign in to manage bookings and your website.</p>
        {demo && (
          <p className="notice">
            Admin sign-in requires the PostgreSQL database and an admin account.
            See the setup guide. No default password is shipped.
            <Link className="button" href="/admin/preview">Explore admin preview <ArrowRight size={18} /></Link>
          </p>
        )}
        <label className="field">
          Email
          <input name="email" required type="email" autoComplete="username" />
        </label>
        <label className="field">
          Password
          <input
            name="password"
            required
            type="password"
            autoComplete="current-password"
            maxLength={200}
          />
        </label>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button className="button full" disabled={busy || demo}>
          {busy ? "Signing in…" : "Sign in securely"}
          <ArrowRight size={18} />
        </button>
      </form>
    </section>
  );
}
type Editor = {
  kind: "product" | "slot" | "faq" | "settings";
  id?: string;
  values: Record<string, string | number | boolean>;
};
const labels: Record<string, string> = {
  nameEn: "Name · English",
  nameMl: "Name · Malayalam",
  descriptionEn: "Description · English",
  descriptionMl: "Description · Malayalam",
  price: "Price in paise (₹40 = 4000)",
  image: "Image path in /images/",
  stock: "Available stock (unreserved)",
  active: "Active / visible",
  slug: "URL slug",
  label: "Time slot label",
  startMinute: "Start minute in IST (06:00 = 360)",
  capacity: "Maximum bookings per date",
  questionEn: "Question · English",
  questionMl: "Question · Malayalam",
  answerEn: "Answer · English",
  answerMl: "Answer · Malayalam",
  position: "Display order",
  phone: "Phone (country code + number)",
  whatsapp: "WhatsApp (country code + number)",
  email: "Email (optional)",
  addressEn: "Address · English",
  addressMl: "Address · Malayalam",
  hoursEn: "Opening hours · English",
  hoursMl: "Opening hours · Malayalam",
  heroEn: "Home headline · English",
  heroMl: "Home headline · Malayalam",
  aboutEn: "About · English",
  aboutMl: "About · Malayalam",
  leadHours: "Minimum notice in hours",
  maxDays: "Maximum days in advance",
  deliveryEnabled: "Enable Pay at Delivery",
  onlineEnabled: "Enable Online Payment (Razorpay keys required)",
};
const emptyProduct = {
  slug: "",
  nameEn: "",
  nameMl: "",
  descriptionEn: "",
  descriptionMl: "",
  price: 4000,
  image: "/images/fresh.jpg",
  stock: 0,
  active: false,
};
const emptySlot = {
  label: "06:00 – 09:00",
  startMinute: 360,
  capacity: 50,
  active: true,
};
const emptyFaq = {
  questionEn: "",
  questionMl: "",
  answerEn: "",
  answerMl: "",
  position: 0,
  active: true,
};
function editValues(obj: object) {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => key in labels),
  );
}
const previewOrders: AdminOrder[] = ["CONFIRMED", "READY", "PENDING"].map((status, i) => ({
  id: `preview-${i}`, bookingId: `DEMO-100${i + 1}`, name: `Sample Customer ${i + 1}`, phone: "0000000000",
  productNameEn: "Fresh Coconut", productNameMl: "പുതിയ തേങ്ങ", language: "en", quantity: (i + 1) * 5, date: new Date().toISOString().slice(0,10),
  slotLabel: "09:00 – 12:00", total: (i + 1) * 20000, method: i === 1 ? "RAZORPAY" : "DELIVERY",
  paymentStatus: i === 1 ? "PAID" : "PENDING", status, notes: "Fictional booking for dashboard preview.", createdAt: new Date().toISOString()
}));
/** The order as it will be saved: the server turns a paid order into a refund when it is cancelled. */
function afterSave(order: AdminOrder): AdminOrder {
  return order.status === "CANCELLED" && order.paymentStatus === "PAID"
    ? { ...order, paymentStatus: "REFUND_REQUIRED" }
    : order;
}
export function AdminDashboard({ preview = false }: { preview?: boolean }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<AdminData | null>(null),
    [tab, setTab] = useState("Orders"),
    [search, setSearch] = useState(""),
    [date, setDate] = useState(""),
    [payment, setPayment] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [editor, setEditor] = useState<Editor | null>(null),
    [selected, setSelected] = useState<AdminOrder | null>(null),
    [customerUpdate, setCustomerUpdate] = useState<AdminOrder | null>(null),
    [askingToSend, setAskingToSend] = useState(false);
  useEffect(() => {
    if (!selected) setAskingToSend(false);
  }, [selected]);
  async function updateOrder(sendMessage: boolean) {
    if (!selected) return;
    const order = afterSave(selected);
    // Must open during the click, or browsers block it as a pop-up. It stays blank until the save succeeds.
    const whatsapp = sendMessage ? window.open("", "_blank") : null;
    if (whatsapp) whatsapp.opener = null;
    const saved = await save("order", selected.id, {
      status: selected.status,
      paymentStatus: selected.paymentStatus,
    });
    setAskingToSend(false);
    if (!saved) {
      whatsapp?.close();
      return;
    }
    if (!sendMessage) return;
    if (whatsapp) whatsapp.location.href = orderUpdateLink(order);
    else setCustomerUpdate(order);
  }
  useEffect(() => {
    if (!editor && !selected) return;
    const modal = document.querySelector<HTMLElement>(".modal");
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        modal?.querySelectorAll<HTMLElement>(
          "button:not([disabled]),input,select,textarea,a[href]",
        ) || [],
      );
    focusable()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditor(null);
        setSelected(null);
      }
      if (e.key === "Tab") {
        const items = focusable();
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [!!editor, !!selected]);
  useEffect(() => {
    const booking = new URLSearchParams(window.location.search).get("booking");
    if (booking) setSearch(booking.slice(0, 40));
  }, []);
  useEffect(() => {
    if (!sidebarOpen) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [sidebarOpen]);
  const loadSequence = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setRefreshing(true);
    if (preview) {
      setRefreshing(false);
      const orders = previewOrders.filter(o => (!search || `${o.name} ${o.bookingId} ${o.phone}`.toLowerCase().includes(search.toLowerCase())) && (!date || o.date === date) && (!payment || o.paymentStatus === payment) && (!status || o.status === status));
      setData({orders, count: orders.length, page: 0, products: sampleProducts, slots: sampleSlots, faqs: sampleFaqs, settings: sampleSettings, messages: [{id:"sample-message",name:"Sample Customer",phone:"0000000000",message:"Sample enquiry: Do you supply coconuts for family events?",createdAt:new Date().toISOString()}],stats:{todays:3,upcoming:3,total:3,pending:2,paid:1,delivery:2},audit:[]});
      return;
    }
    try {
      const q = new URLSearchParams({
        search,
        date,
        payment,
        status,
        page: String(page),
      });
      const r = await fetch(`/api/admin/data?${q}`, { cache: "no-store" });
      if (r.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!r.ok) throw new Error("Could not load the dashboard. Please retry.");
      const next = await r.json();
      if (sequence !== loadSequence.current) return;
      setData(next);
      setError("");
    } catch (e) {
      if (sequence === loadSequence.current) setError(e instanceof Error ? e.message : "Unable to load.");
    } finally {
      if (sequence === loadSequence.current) setRefreshing(false);
    }
  }, [search, date, payment, status, page, router, preview]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);
  async function save(kind: string, id: string | undefined, values: unknown): Promise<boolean> {
    if (preview) { setEditor(null); setSelected(null); setNotice("Read-only preview. No changes were saved."); return false; }
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, data: values }),
      });
      if (r.status === 401) {
        router.replace("/admin/login");
        return false;
      }
      const result = await r.json();
      if (!r.ok) {
        if (result.error === "STOCK_CHANGED") await load();
        throw new Error(
          result.error === "INVALID_INPUT"
            ? "Please check all fields. Both languages are required."
            : result.error === "STOCK_CHANGED"
              ? "A customer booked this product while you were editing. The latest stock is now shown; please check it and save again."
            : result.error === "CONFLICT"
              ? "That URL slug is already used by another product."
            : result.error === "PAYMENT_MANAGED_BY_GATEWAY"
              ? "Online payment status is verified by Razorpay. Refunds must be processed in Razorpay first."
              : result.error === "PAYMENT_PENDING"
                ? "Payment must be received before completing or advancing an online order."
                : result.error === "INVALID_STATUS"
                  ? "That status change is not allowed. Move orders forward one step, or cancel."
                  : "Could not save changes. Please retry.",
        );
      }
      setEditor(null);
      setSelected(null);
      if (result.entity) setData(current => {
        if (!current) return current;
        const replace = <T extends {id: string}>(items: T[], entity: T) => items.some(item => item.id === entity.id)
          ? items.map(item => item.id === entity.id ? entity : item) : [...items, entity];
        if (kind === "product" || kind === "stock") return {...current, products: replace(current.products, result.entity)};
        if (kind === "slot") return {...current, slots: replace(current.slots, result.entity)};
        if (kind === "faq") return {...current, faqs: replace(current.faqs, result.entity)};
        if (kind === "settings") return {...current, settings: result.entity};
        return current;
      });
      setNotice("Changes saved.");
      try { localStorage.setItem("coco-catalog-updated", String(Date.now())); } catch {}
      router.refresh();
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-wrap admin-workspace">
      <aside className={sidebarOpen ? "admin-sidebar open" : "admin-sidebar"} id="admin-sidebar">
        <Link href="/" className="admin-logo"><Leaf size={30}/><span>COCOTRIBE<small>BUSINESS ADMIN</small></span></Link>
        <p className="admin-nav-label">WORKSPACE</p>
        <nav aria-label="Admin sections">
          {[["Orders",LayoutDashboard],["Products",Package],["Time slots",CalendarDays],["FAQs",CircleHelp],["Website settings",Settings],["Messages",Inbox],["Audit log",History]].map(([name,Icon]) => {
            const label = name as string;
            const NavIcon = Icon as typeof LayoutDashboard;
            return <button type="button" key={label} className={tab === label ? "active" : ""} aria-current={tab === label ? "page" : undefined} onClick={()=>{setTab(label);setNotice("");setSidebarOpen(false);}}><NavIcon size={20}/>{label}</button>;
          })}
        </nav>
        <div className="admin-sidebar-bottom"><Link href="/"><ExternalLink size={18}/>View website</Link><p>COCOTRIBE Operations<br/>Guruvayur, Kerala</p></div>
      </aside>
      {sidebarOpen && <button className="admin-overlay" aria-label="Close navigation" onClick={()=>setSidebarOpen(false)}/>}
      <div className="admin-mobile-bar"><button className="button outline" aria-controls="admin-sidebar" aria-expanded={sidebarOpen} onClick={()=>setSidebarOpen(!sidebarOpen)}><Menu size={20}/> Menu</button><strong>COCOTRIBE ADMIN</strong></div>
      {preview && <p className="notice">Admin preview · Fictional sample data only. Explore all tabs and editors; saving is disabled. <Link href="/">Back to website</Link></p>}
      <div className="section-heading">
        <div>
          <p className="eyebrow">COCOTRIBE · OPERATIONS</p>
          <h1>{tab === "Orders" ? "Bookings overview" : tab}</h1>
          <p className="admin-page-description">{tab === "Orders" ? "Manage bookings, track payments and prepare upcoming orders." : "Manage your " + tab.toLowerCase() + " in one place."}</p>
        </div>
        <button
          className="button outline"
          onClick={async () => {
            if (preview) { router.push("/"); return; }
            await fetch("/api/admin/logout", { method: "POST" });
            router.replace("/admin/login");
            router.refresh();
          }}
        >
          <LogOut size={17} />
          {preview ? "Exit preview" : "Sign out"}
        </button>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}{" "}
          <button className="text-link" onClick={load}>
            Retry
          </button>
        </p>
      )}
      {data && refreshing && <CoconutLoader compact />}
      {notice && (
        <p role="status" className="notice success">
          {notice}
        </p>
      )}
      {customerUpdate && (
        <div className="notice" role="status">
          <p>The status is saved, but your browser did not open WhatsApp. {customerUpdate.name} has not been told yet.</p>
          <div className="button-row">
            <a
              className="button"
              href={orderUpdateLink(customerUpdate)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setCustomerUpdate(null)}
            >
              <MessageCircle size={18} />
              Send WhatsApp update
            </a>
            <button className="text-link" onClick={() => setCustomerUpdate(null)}>
              Not now
            </button>
          </div>
        </div>
      )}
      {!data ? (
        error ? null : <CoconutLoader />
      ) : (
        <>
          {tab === "Orders" && !preview && data.push && (
            <PhoneAlerts compact publicKey={data.push.publicKey} devices={data.push.devices} />
          )}
          {tab === "Orders" && <div className="stats">
            {[
              ["todays", "Today’s bookings"],
              ["upcoming", "Upcoming bookings"],
              ["total", "Total orders"],
              ["pending", "Pending payments"],
              ["paid", "Paid orders"],
              ["delivery", "Pay at Delivery"],
            ].map(([key, label]) => (
              <div key={key}>
                <span>{label}</span>
                <strong>{data.stats[key]}</strong>
              </div>
            ))}
          </div>}
          {tab === "Orders" && (
            <>
              <div className="admin-filters">
                <label className="search-field">
                  <Search size={19} />
                  <input
                    aria-label="Search bookings"
                    placeholder="Name, phone or booking ID"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                  />
                </label>
                <label>
                  Date
                  <input
                    aria-label="Filter by booking date"
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setPage(0);
                    }}
                  />
                </label>
                <label>
                  Payment
                  <select
                    value={payment}
                    onChange={(e) => {
                      setPayment(e.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="">All payments</option>
                    {["PENDING", "PAID", "REFUND_REQUIRED", "REFUNDED"].map(
                      (s) => (
                        <option key={s}>{s}</option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Order status
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="">All statuses</option>
                    {[
                      "PENDING",
                      "CONFIRMED",
                      "PREPARING",
                      "READY",
                      "COMPLETED",
                      "CANCELLED",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {[
                        "Booking",
                        "Customer / phone",
                        "Product / quantity",
                        "Date / time (IST)",
                        "Amount",
                        "Method",
                        "Payment",
                        "Status",
                        "",
                      ].map((s) => (
                        <th key={s}>{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((o) => (
                      <tr key={o.id}>
                        <td>{o.bookingId}</td>
                        <td>
                          {o.name}
                          <small>
                            <a href={`tel:+${o.phone}`}>{o.phone}</a>
                          </small>
                        </td>
                        <td>
                          {o.productNameEn}
                          <small>Quantity: {o.quantity}</small>
                        </td>
                        <td>
                          {o.date}
                          <small>{o.slotLabel}</small>
                        </td>
                        <td>{money(o.total)}</td>
                        <td>
                          {o.method === "DELIVERY"
                            ? "Pay at Delivery"
                            : "Razorpay"}
                        </td>
                        <td>
                          <span className="status">{o.paymentStatus}</span>
                        </td>
                        <td>{o.status}</td>
                        <td>
                          <button
                            className="text-link"
                            onClick={() => setSelected({ ...o })}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.orders.length && (
                  <div className="empty">No bookings match these filters.</div>
                )}
              </div>
              <div className="pagination">
                <span>{data.count} bookings</span>
                <button
                  className="button outline"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>Page {page + 1}</span>
                <button
                  className="button outline"
                  disabled={(page + 1) * 50 >= data.count}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
          {tab === "Products" && (
            <>
              <div className="section-heading">
                <p>
                  Stock is the quantity available after existing reservations.
                </p>
                <button
                  className="button"
                  onClick={() =>
                    setEditor({ kind: "product", values: emptyProduct })
                  }
                >
                  <Plus size={18} />
                  Add product
                </button>
              </div>
              <div className="admin-cards">
                {data.products.map((p) => (
                  <article className="panel" key={p.id}>
                    <img className="admin-product-image" src={p.image} alt="" />
                    <h3>{p.nameEn}</h3>
                    <p>{p.nameMl}</p>
                    <p>
                      {money(p.price)} · {p.stock} available ·{" "}
                      {p.active ? "Active" : "Inactive"}
                    </p>
                    <form key={`${p.id}-${p.stock}`} onSubmit={e => {
                      e.preventDefault();
                      const stock = Number(new FormData(e.currentTarget).get("stock"));
                      void save("stock", p.id, {stock, expected: p.stock});
                    }}>
                      <label className="field">Available stock / ലഭ്യമായ സ്റ്റോക്ക്
                        <input name="stock" type="number" min="0" max="1000000" step="1" required defaultValue={p.stock} />
                      </label>
                      <p className="muted">Enter remaining packs, bottles or packets. Coconut stock is packs, not individual pieces.</p>
                      <button className="button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save stock"}</button>
                    </form>
                    <button
                      className="button outline"
                      onClick={() =>
                        setEditor({
                          kind: "product",
                          id: p.id,
                          // Stock has its own guarded form above.
                          values: Object.fromEntries(Object.entries(editValues(p)).filter(([key]) => key !== "stock")),
                        })
                      }
                    >
                      Edit product
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === "Time slots" && (
            <>
              <div className="section-heading">
                <p>Capacity is the maximum number of bookings per date.</p>
                <button
                  className="button"
                  onClick={() => setEditor({ kind: "slot", values: emptySlot })}
                >
                  <Plus size={18} />
                  Add slot
                </button>
              </div>
              <div className="admin-cards">
                {data.slots.map((s) => (
                  <article className="panel" key={s.id}>
                    <h3>{s.label} IST</h3>
                    <p>
                      {s.capacity} bookings per day ·{" "}
                      {s.active ? "Active" : "Inactive"}
                    </p>
                    <button
                      className="button outline"
                      onClick={() =>
                        setEditor({
                          kind: "slot",
                          id: s.id,
                          values: editValues(s),
                        })
                      }
                    >
                      Edit slot
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === "FAQs" && (
            <>
              <button
                className="button"
                onClick={() => setEditor({ kind: "faq", values: emptyFaq })}
              >
                <Plus size={18} />
                Add FAQ
              </button>
              <div className="admin-cards">
                {data.faqs.map((f) => (
                  <article className="panel" key={f.id}>
                    <h3>{f.questionEn}</h3>
                    <p>{f.answerEn}</p>
                    <p>
                      {f.active ? "Visible" : "Hidden"} · Position {f.position}
                    </p>
                    <button
                      className="button outline"
                      onClick={() =>
                        setEditor({
                          kind: "faq",
                          id: f.id,
                          values: editValues(f),
                        })
                      }
                    >
                      Edit FAQ
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === "Website settings" && !preview && data.push && (
            <PhoneAlerts publicKey={data.push.publicKey} devices={data.push.devices} />
          )}
          {tab === "Website settings" && (
            <div className="panel" style={{ marginBottom: 20 }}>
              <h2>WhatsApp order alerts</h2>
              {data.ownerAlerts ? (
                <>
                  <p>New bookings, online payments and confirmed orders are sent to {data.ownerAlerts.to}.</p>
                  <button
                    className="button outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      setNotice("");
                      try {
                        const r = await fetch("/api/admin/notify-test", { method: "POST" });
                        const result = await r.json();
                        if (r.ok) setNotice("Test alert sent. Check WhatsApp on the alert number.");
                        else setError(`WhatsApp did not accept the test alert: ${result.reason || result.error}`);
                      } catch {
                        setError("Could not reach the server. Please retry.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy ? "Sending…" : "Send test alert"}
                  </button>
                </>
              ) : (
                <p className="muted">Not set up yet. Add the WhatsApp settings in Vercel to receive alerts.</p>
              )}
            </div>
          )}
          {tab === "Website settings" && (
            <div className="panel">
              <h2>Contact details & website content</h2>
              <p>
                Edit both languages, phone, WhatsApp, address, email, opening
                hours, booking notice and payment options.
              </p>
              <dl className="summary-list">
                <div>
                  <dt>Phone</dt>
                  <dd>{data.settings.phone}</dd>
                </div>
                <div>
                  <dt>WhatsApp</dt>
                  <dd>{data.settings.whatsapp}</dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>{data.settings.addressEn}</dd>
                </div>
              </dl>
              <button
                className="button"
                onClick={() =>
                  setEditor({
                    kind: "settings",
                    id: "main",
                    values: editValues(data.settings),
                  })
                }
              >
                Edit settings
              </button>
            </div>
          )}
          {tab === "Messages" && (
            <div className="admin-cards">
              {!data.messages.length && <p>No enquiries yet.</p>}
              {data.messages.map((m) => (
                <article className="panel" key={m.id}>
                  <h3>{m.name}</h3>
                  <a className="text-link" href={`tel:+${m.phone}`}>
                    {m.phone}
                  </a>
                  <p className="preserve-lines">{m.message}</p>
                  <small>
                    {new Date(m.createdAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    IST
                  </small>
                </article>
              ))}
            </div>
          )}
          {tab === "Audit log" && (
            <>
              {data.reconcile !== undefined && (
                <p className={data.reconcile?.lastError || !data.reconcile?.lastSuccessAt ? "notice error" : "notice"}>
                  Payment reconciliation:{" "}
                  {data.reconcile?.lastSuccessAt
                    ? `last successful run ${new Date(data.reconcile.lastSuccessAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`
                    : "has not run yet. Check the scheduled job."}
                  {data.reconcile?.lastError ? ` · Latest problem: ${data.reconcile.lastError}` : ""}
                </p>
              )}
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      {["When (IST)", "Admin", "Action", "Record", "Changes"].map((s) => (
                        <th key={s}>{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.audit.map((a) => (
                      <tr key={a.id}>
                        <td>{new Date(a.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
                        <td>{a.adminEmail}</td>
                        <td>{a.action.replace("update:", "Updated ")}</td>
                        <td>{a.entityId}</td>
                        <td>
                          {Object.entries(a.details || {}).map(([field, change]) => (
                            <small key={field}>
                              {field}: {String(change.from ?? "—")} → {String(change.to ?? "—")}
                            </small>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.audit.length && <div className="empty">No admin changes recorded yet.</div>}
              </div>
              <p className="muted">Showing the latest 100 entries.</p>
            </>
          )}
        </>
      )}
      {editor && (
        <div className="modal-overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-heading"
          >
            <div className="section-heading">
              <h2 id="edit-heading">
                {editor.id ? "Edit" : "Add"} {editor.kind}
              </h2>
              <button
                className="icon-link"
                aria-label="Close editor"
                onClick={() => setEditor(null)}
              >
                <X />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save(editor.kind, editor.id, editor.values);
              }}
            >
              {Object.entries(editor.values).map(([key, value]) => (
                <label
                  className={
                    typeof value === "boolean" ? "checkbox-field" : "field"
                  }
                  key={key}
                >
                  {labels[key] || key}
                  {typeof value === "boolean" ? (
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          values: { ...editor.values, [key]: e.target.checked },
                        })
                      }
                    />
                  ) : typeof value === "number" ? (
                    <input
                      type="number"
                      value={value}
                      step="1"
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          values: {
                            ...editor.values,
                            [key]: Number(e.target.value),
                          },
                        })
                      }
                    />
                  ) : key.startsWith("description") ||
                    key.startsWith("answer") ||
                    key.startsWith("about") ? (
                    <textarea
                      rows={4}
                      required
                      value={value}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          values: { ...editor.values, [key]: e.target.value },
                        })
                      }
                    />
                  ) : (
                    <input
                      value={value}
                      required={key !== "email"}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          values: { ...editor.values, [key]: e.target.value },
                        })
                      }
                    />
                  )}
                </label>
              ))}
              {error && (
                <p className="notice error" role="alert">
                  {error}
                </p>
              )}
              <button className="button full" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </form>
          </section>
        </div>
      )}
      {selected && (
        <div className="modal-overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-heading"
          >
            <div className="section-heading">
              <h2 id="order-heading">{selected.bookingId}</h2>
              <button
                className="icon-link"
                aria-label="Close order"
                onClick={() => setSelected(null)}
              >
                <X />
              </button>
            </div>
            <p>
              {selected.name} ·{" "}
              <a href={`tel:+${selected.phone}`}>{selected.phone}</a>
            </p>
            <p>
              {selected.quantity} × {selected.productNameEn} ·{" "}
              {money(selected.total)}
            </p>
            <p>
              {selected.date} · {selected.slotLabel} IST
            </p>
            <p className="preserve-lines">{selected.notes || "No notes."}</p>
            <label className="field">
              Order status
              <select
                disabled={askingToSend}
                value={selected.status}
                onChange={(e) =>
                  setSelected({ ...selected, status: e.target.value })
                }
              >
                {nextOrderStatuses(data?.orders.find((o) => o.id === selected.id)?.status || selected.status).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Payment status
              <select
                disabled={askingToSend}
                value={selected.paymentStatus}
                onChange={(e) =>
                  setSelected({ ...selected, paymentStatus: e.target.value })
                }
              >
                {nextPaymentStatuses(selected.method, data?.orders.find((o) => o.id === selected.id)?.paymentStatus || selected.paymentStatus).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <p className="notice">
              Online payments are verified by Razorpay. Process refunds in
              Razorpay, then record REFUNDED here. Cancelling restores reserved
              stock. Completed and cancelled orders cannot be reopened.
            </p>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            {askingToSend ? (
              <div role="group" aria-labelledby="send-question">
                <h3 id="send-question">Send {selected.name} a WhatsApp message about this update?</h3>
                <p className="muted preserve-lines">{orderUpdateMessage(afterSave(selected))}</p>
                <button className="button full" disabled={busy} autoFocus onClick={() => void updateOrder(true)}>
                  <MessageCircle size={18} />
                  {busy ? "Saving…" : "Yes, update and open WhatsApp"}
                </button>
                <button className="button outline full" disabled={busy} onClick={() => void updateOrder(false)}>
                  No, update only
                </button>
                <button className="text-link" disabled={busy} onClick={() => setAskingToSend(false)}>
                  Go back
                </button>
              </div>
            ) : (
              <button
                className="button full"
                disabled={busy}
                onClick={() => {
                  const before = data?.orders.find((o) => o.id === selected.id);
                  if (before?.status === selected.status && before?.paymentStatus === selected.paymentStatus)
                    setSelected(null);
                  else setAskingToSend(true);
                }}
              >
                {busy ? "Saving…" : "Update order"}
              </button>
            )}
            {!askingToSend && data?.orders.some((o) => o.id === selected.id) && (
              <a
                className="button outline full"
                href={orderUpdateLink(data.orders.find((o) => o.id === selected.id)!)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} />
                Message customer with current status
              </a>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
