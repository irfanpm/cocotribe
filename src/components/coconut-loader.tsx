"use client";
import { useLanguage } from "./language";
export function CoconutLoader({compact = false}: {compact?: boolean}) {
 const {t} = useLanguage();
 return <div className={`coconut-loader ${compact ? "compact" : ""}`} role="status" aria-live="polite">
  <span className="coconut-loader-fruit" aria-hidden="true"><span /></span>
  <span>{t("Getting things ready…", "തയ്യാറാക്കുന്നു…")}</span>
 </div>;
}
