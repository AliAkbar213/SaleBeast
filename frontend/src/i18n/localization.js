import arabic from "./ar.json" with { type: "json" };

export function translate(language, key, values = {}) {
  const message = language === "ar" && Object.hasOwn(arabic, key) ? arabic[key] : key;
  return String(message ?? "").replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
}

// Resolve each field independently; missing or blank translations use the original.
export function productText(product, field, language) {
  const translated = product?.[`ar_${field}`];
  if (language === "ar" && typeof translated === "string" && translated.trim()) return translated;
  return product?.[field] || (field === "desc" ? product?.description : "") || "";
}

export function formatCurrency(amount, language) {
  const number = new Intl.NumberFormat(language === "ar" ? "ar-KW" : "en-KW", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number(amount || 0));
  return `${number} ${language === "ar" ? "د.ك" : "KD"}`;
}

export function translatedError(language, message, fallback = "Something went wrong") {
  // Keep database and network internals out of the Arabic interface.
  return translate(language, language === "ar" && !Object.hasOwn(arabic, message) ? fallback : (message || fallback));
}
