import { hasDiscountedPrice } from "../utils/productPrice";
import { useLanguage } from "../contexts/LanguageContext";

export default function ProductPrice({ price, discountedPrice, formatPrice: customFormatPrice }) {
  const { t, formatPrice: localizedFormatPrice } = useLanguage();
  const formatPrice = customFormatPrice || localizedFormatPrice;
  const hasDiscount = hasDiscountedPrice(discountedPrice);

  if (!hasDiscount) return <bdi>{formatPrice(price)}</bdi>;

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="sr-only">{t("Original price:")} </span>
      <del className="text-[0.75em] font-normal text-text-muted"><bdi>{formatPrice(price)}</bdi></del>
      <span className="sr-only">{t("Discounted price:")} </span>
      <span className="rounded-md bg-primary/10 px-2 py-0.5 font-bold text-primary"><bdi>{formatPrice(discountedPrice)}</bdi></span>
    </span>
  );
}
