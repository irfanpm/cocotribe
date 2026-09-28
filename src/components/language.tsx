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
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLanguage] = useState<Locale>("en");
  useEffect(() => {
    const value = localStorage.getItem("koko-language");
    if (value === "ml" || value === "ta" || value === "hi") setLanguage(value);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  function setLang(value: Locale) {
    setLanguage(value);
    localStorage.setItem("koko-language", value);
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
