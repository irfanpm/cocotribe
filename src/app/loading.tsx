"use client";
import { useLanguage } from "@/components/language";
export default function Loading() {
  const { t } = useLanguage();
  return (
    <div className="wrap page-space" role="status">
      {t("Getting things ready…", "തയ്യാറാക്കുന്നു…")}
    </div>
  );
}
