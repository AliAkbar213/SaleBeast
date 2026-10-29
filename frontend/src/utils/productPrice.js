export const hasDiscountedPrice = (value) => value != null
  && String(value).trim() !== ""
  && Number.isFinite(Number(value));

export const getProductPrice = (product) => Number(
  hasDiscountedPrice(product.discounted_price) ? product.discounted_price : product.price
);
