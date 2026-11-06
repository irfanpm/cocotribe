"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { translate, type Locale } from "@/lib/translate";
export type { Locale };
const Context = createContext<{
  lang: Locale;
  setLang: (v: Locale) => void;
  t: (en: string, ml: string) => string;
}>({ lang: "en", setLang: () => {}, t: (e) => e });
function remember(value: Locale) {
  // The cookie lets the server render the right language first, with no flash of English.
  document.cookie = `koko-language=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  try {
    localStorage.setItem("koko-language", value);
  } catch {
    /* Private browsing can block storage; the cookie still works. */
  }
}
export function LanguageProvider({ children, initial = "en" }: { children: ReactNode; initial?: Locale }) {
  const [lang, setLanguage] = useState<Locale>(initial);
  useEffect(() => {
    // Visitors from before the cookie existed keep the choice saved on their device.
    if (document.cookie.includes("koko-language=")) return;
    let value: string | null = null;
    try {
      value = localStorage.getItem("koko-language");
    } catch {
      return;
    }
    if (value === "ml" || value === "ta" || value === "hi") {
      setLanguage(value);
      remember(value);
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  function setLang(value: Locale) {
    setLanguage(value);
    remember(value);
  }
  return (
    <Context.Provider
      value={{ lang, setLang, t: (en, ml) => translate(en, ml, lang) }}
    >
      {children}
    </Context.Provider>
  );
}
export const useLanguage = () => useContext(Context);
