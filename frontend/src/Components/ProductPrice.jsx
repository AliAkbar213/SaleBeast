import { hasDiscountedPrice } from "../utils/productPrice";

export default function ProductPrice({ price, discountedPrice, formatPrice = (value) => `${value} KD` }) {
  const hasDiscount = hasDiscountedPrice(discountedPrice);

  if (!hasDiscount) return <>{formatPrice(price)}</>;

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="sr-only">Original price: </span>
      <del className="text-[0.75em] font-normal text-text-muted">{formatPrice(price)}</del>
      <span className="sr-only">Discounted price: </span>
      <span className="rounded-md bg-primary/10 px-2 py-0.5 font-bold text-primary">{formatPrice(discountedPrice)}</span>
    </span>
  );
}
