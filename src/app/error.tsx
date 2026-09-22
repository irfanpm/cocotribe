"use client";
import { useLanguage } from "@/components/language";
export default function Error({ reset }: { reset: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="wrap narrow page-space">
      <h1>{t("A little hiccup.", "ചെറിയൊരു തടസ്സം.")}</h1>
      <p>
        {t(
          "Please try again, or call us for help.",
          "വീണ്ടും ശ്രമിക്കുക അല്ലെങ്കിൽ സഹായത്തിനായി വിളിക്കുക.",
        )}
      </p>
      <button className="button" onClick={reset}>
        {t("Try again", "വീണ്ടും ശ്രമിക്കുക")}
      </button>
    </div>
  );
}
