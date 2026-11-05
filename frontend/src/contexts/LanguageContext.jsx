import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { formatCurrency, productText, translate, translatedError } from "../i18n/localization";

const LanguageContext = createContext(null);

function initialLanguage() {
  try {
    const saved = localStorage.getItem("salebeast-language");
    if (saved === "ar" || saved === "en") return saved;
  } catch { /* Language selection also works without browser storage. */ }
  return navigator.language?.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(initialLanguage);
  const value = useMemo(() => ({
    language,
    isArabic: language === "ar",
    setLanguage: (next) => { if (next === "en" || next === "ar") setLanguage(next); },
    t: (key, values) => translate(language, key, values),
    productText: (product, field = "name") => productText(product, field, language),
    // Category/location translations can be supplied as ar_name without requiring it in their schemas.
    dataName: (record) => translate(language, productText(record, "name", language)),
    formatPrice: (amount) => formatCurrency(amount, language),
    errorText: (message, fallback) => translatedError(language, message, fallback),
  }), [language]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.title = translate(language, "SaleBeast | Electronics for Better Setups");
    document.querySelector('meta[name="description"]')?.setAttribute("content", translate(language,
      "SaleBeast electronics — projectors, gamepads, and accessories for better everyday setups."));
    try { localStorage.setItem("salebeast-language", language); } catch { /* Storage may be disabled. */ }
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
}
