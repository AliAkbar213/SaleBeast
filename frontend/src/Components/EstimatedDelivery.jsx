import { useLanguage } from "../contexts/LanguageContext";

export default function EstimatedDelivery({ className = "" }) {
  const { t } = useLanguage();

  return (
    <section className={`flex items-start gap-3 rounded-xl border border-primary/15 bg-primary-soft p-4 text-start ${className}`}>
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-bold leading-6 text-text-main">{t("Estimated delivery: 1–2 days")}</h2>
        <p className="mt-1 text-sm leading-6 text-text-muted">{t("Usually delivered within 6–24 hours after order confirmation.")}</p>
      </div>
    </section>
  );
}
