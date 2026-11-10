"use client";
import { useCallback, useEffect, useState } from "react";
import { BellRing, BellOff, Smartphone } from "lucide-react";

type State =
  | "checking"
  | "unsupported"
  | "ios-install-first"
  | "not-configured"
  | "blocked"
  | "off"
  | "on";

function base64UrlToBytes(value: string) {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}
function deviceLabel() {
  const ua = navigator.userAgent;
  const kind = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "Device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "browser";
  return `${kind} · ${browser}`;
}
async function registration() {
  return navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" });
}

/**
 * Turns new-order notifications on or off for this phone or computer.
 * compact: a one-line prompt for the orders screen, shown only while this device is off.
 */
export function PhoneAlerts({ publicKey, devices, compact = false }: { publicKey: string | null; devices: number; compact?: boolean }) {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const check = useCallback(async () => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const ios = /iPhone|iPad/.test(navigator.userAgent);
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (!supported) return setState(ios && !installed ? "ios-install-first" : "unsupported");
    if (!publicKey) return setState("not-configured");
    if (Notification.permission === "denied") return setState("blocked");
    const reg = await registration();
    setState((await reg.pushManager.getSubscription()) ? "on" : "off");
  }, [publicKey]);
  useEffect(() => {
    check().catch(() => setState("unsupported"));
  }, [check]);

  async function turnOn() {
    if (!publicKey) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const subscription =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }));
      const r = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...subscription.toJSON(), label: deviceLabel() }),
      });
      if (!r.ok) throw new Error("save");
      setState("on");
      setMessage("Notifications are on for this device. Send a test to check they arrive.");
    } catch {
      setError("Could not turn on notifications on this device. Check that notifications are allowed for this site, then try again.");
    } finally {
      setBusy(false);
    }
  }
  async function sendTest() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const subscription = await (await registration()).pushManager.getSubscription();
      if (!subscription) return setState("off");
      const r = await fetch("/api/admin/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      const result = await r.json();
      if (r.ok) setMessage("Test sent. It should appear on this device within a few seconds.");
      else if (result.removed) {
        setState("off");
        setError("This device's notification permission has expired. Turn notifications on again.");
      } else setError("The test could not be delivered. Please try again shortly.");
    } catch {
      setError("Could not reach the server. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  async function turnOff() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const subscription = await (await registration()).pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/admin/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("off");
      setMessage("Notifications are off for this device.");
    } catch {
      setError("Could not turn notifications off. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    if (state !== "off" && state !== "ios-install-first") return null;
    return (
      <div className="notice" role="status" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <BellRing size={20} />
        <span style={{ flex: "1 1 220px" }}>
          {state === "ios-install-first"
            ? "To get new-order alerts on this iPhone, tap Share, then Add to Home Screen, and open the admin from there."
            : "Get a notification on this device whenever a new order arrives."}
        </span>
        {state === "off" && (
          <button className="button" disabled={busy} onClick={turnOn}>
            {busy ? "Turning on…" : "Turn on notifications"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <h2>
        <Smartphone size={22} style={{ verticalAlign: "-3px", marginRight: 8 }} />
        New-order notifications
      </h2>
      <p>
        Each phone or computer that turns this on is told about new bookings, online payments and confirmed orders. Tapping
        the notification opens the order.{" "}
        {devices ? `${devices} device${devices === 1 ? "" : "s"} turned on.` : "No devices turned on yet."}
      </p>
      {state === "checking" && <p className="muted">Checking this device…</p>}
      {state === "not-configured" && (
        <p className="notice">Notifications are not set up on the server yet. Add the VAPID keys in Vercel, then redeploy.</p>
      )}
      {state === "unsupported" && (
        <p className="notice">This browser cannot receive notifications. On Android use Chrome; on iPhone add the admin to the Home Screen first.</p>
      )}
      {state === "ios-install-first" && (
        <p className="notice">On iPhone: tap Share, then Add to Home Screen. Open COCOTRIBE Admin from the Home Screen and turn notifications on there. Requires iOS 16.4 or later.</p>
      )}
      {state === "blocked" && (
        <p className="notice error">Notifications are blocked for this site. Allow them in the browser or phone settings, then reload this page.</p>
      )}
      <div className="button-row">
        {state === "off" && (
          <button className="button" disabled={busy} onClick={turnOn}>
            <BellRing size={18} />
            {busy ? "Turning on…" : "Turn on for this device"}
          </button>
        )}
        {state === "on" && (
          <>
            <button className="button" disabled={busy} onClick={sendTest}>
              <BellRing size={18} />
              {busy ? "Sending…" : "Send test notification"}
            </button>
            <button className="button outline" disabled={busy} onClick={turnOff}>
              <BellOff size={18} />
              Turn off for this device
            </button>
          </>
        )}
      </div>
      {message && <p className="notice success" role="status">{message}</p>}
      {error && <p className="notice error" role="alert">{error}</p>}
    </div>
  );
}
