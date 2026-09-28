"use client";
import {useEffect, useState} from "react";
import {translate, type Locale} from "@/lib/translate";
export default function Error({ reset }: { reset: () => void }) {
  const [lang,setLang] = useState<Locale>("en");
  useEffect(() => { const saved=localStorage.getItem("koko-language"); if(saved==="ml"||saved==="ta"||saved==="hi")setLang(saved); },[]);
  return <html lang={lang}><body style={{fontFamily:"sans-serif",padding:40}}>
    <h1>COCOTRIBE</h1>
    <p>{translate("We’re temporarily unavailable. Please call +91 94966 69360.","താൽക്കാലികമായി ലഭ്യമല്ല. ദയവായി +91 94966 69360 എന്ന നമ്പറിൽ വിളിക്കുക.",lang)}</p>
    <button onClick={reset}>{translate("Try again","വീണ്ടും ശ്രമിക്കുക",lang)}</button>
  </body></html>;
}
