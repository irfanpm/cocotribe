"use client";
import { useEffect, useTransition, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CoconutLoader } from "./coconut-loader";
const BACKGROUND_REFRESH_MS = 60000;
/** Keeps prices, stock and settings current without a manual page reload. Form input is preserved. */
export function CatalogSync() {
 const router = useRouter();
 const pathname = usePathname();
 const [pending, startTransition] = useTransition();
 const revisions = useRef(new Map<string, string>());
 useEffect(() => {
  if (pathname.startsWith('/admin')) return;
  let lastRefresh = 0;
  const refresh = () => {
   if (document.visibilityState !== 'visible' || Date.now() - lastRefresh < 3000) return;
   lastRefresh = Date.now();
   try { revisions.current.set(pathname, localStorage.getItem("coco-catalog-updated") || ""); } catch {}
   startTransition(() => router.refresh());
  };
  const quietRefresh = () => {
   if (document.visibilityState !== 'visible') return;
   lastRefresh = Date.now();
   router.refresh();
  };
  const storage = (event: StorageEvent) => { if (event.key === 'coco-catalog-updated') refresh(); };
  try {
   const revision = localStorage.getItem('coco-catalog-updated');
   if (revision && revisions.current.get(pathname) !== revision) refresh();
  } catch {}
  window.addEventListener('storage', storage);
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', refresh);
  const timer = setInterval(quietRefresh, BACKGROUND_REFRESH_MS);
  return () => {
   clearInterval(timer);
   window.removeEventListener('storage', storage);
   window.removeEventListener('focus', refresh);
   document.removeEventListener('visibilitychange', refresh);
  };
 }, [router, pathname]);
 return pending ? <div className="catalog-refresh"><CoconutLoader compact /></div> : null;
}
