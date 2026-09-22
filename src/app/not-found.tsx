"use client";
import Link from "next/link";
import { useLanguage } from "@/components/language";
export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="wrap narrow page-space">
      <p className="eyebrow">404</p>
      <h1>{t("This page has wandered off.", "ഈ പേജ് കണ്ടെത്താനായില്ല.")}</h1>
      <Link className="button" href="/">
        {t("Back to home", "ഹോമിലേക്ക് മടങ്ങാം")}
      </Link>
    </div>
  );
}
