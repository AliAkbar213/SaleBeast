import { useLanguage } from "../contexts/LanguageContext";
import { useContext } from "react";
import { Link } from "react-router";
import { AuthContext } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { getProductPrice } from "../utils/productPrice";
import ProductPrice from "../Components/ProductPrice";


function Cart() {
  const { t, productText, formatPrice, dataName } = useLanguage();
  const { user, isLoading } = useContext(AuthContext);
  const { cartItems, cartCount, cartTotal, cartFullTotal, cartDiscountTotal, updateQuantity, removeFromCart, clearCart } = useCart();

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <nav aria-label={t("Breadcrumb")} className="mb-8 flex items-center gap-2 text-sm text-text-muted">
        <Link to="/products" className="hover:text-primary">{t("Products")}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-text-main">{t("Cart")}</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">{t("Your selection")}</p>
          <h1 className="text-3xl font-bold tracking-tight text-text-main sm:text-4xl">{t("Shopping cart")}</h1>
          {cartCount === 0 && (
            <p className="mt-2 text-sm text-text-muted">
              {t("Your cart is empty")}
            </p>
          )}
        </div>
        {cartItems.length > 0 && (
          <button type="button" onClick={clearCart} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-text-muted underline underline-offset-4 hover:text-primary">
            {t("Clear cart")}
          </button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <section className="flex min-h-96 flex-col items-center justify-center rounded-3xl border border-border bg-surface px-6 py-12 text-center">
          <div aria-hidden="true" className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary-soft text-4xl text-primary">🛒</div>
          <h2 className="text-2xl font-bold text-text-main">{t("Nothing in your cart yet")}</h2>
          <p className="mt-3 max-w-sm leading-7 text-text-muted">{t("Browse our products and add something you like. It will appear here.")}</p>
          <Link to="/products" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-7 font-semibold text-text-light transition-colors hover:bg-primary-hover">
            {t("Explore products")}
          </Link>
        </section>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section aria-label={t("Items in your cart")} className="space-y-4">
            {cartItems.map((item) => {
              const quantity = Number(item.quantity) || 1;
              const atLimit = Number.isFinite(Number(item.stock)) && quantity >= Number(item.stock);

              return (
                <article key={item.id} className="flex gap-4 rounded-2xl border border-border bg-surface p-4 sm:gap-6 sm:p-5">
                  <Link to={`/products/${item.id}`} className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background p-2 sm:size-36" aria-label={t("View {name}", { name: productText(item) })}>
                    {item.image ? (
                      <img src={item.image} alt={productText(item) || t("Product")} className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-center text-xs text-text-muted">{t("No image")}</span>
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                    <div>
                      {item.category && <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">{dataName({ name: item.category, ar_name: item.ar_category })}</p>}
                      <Link to={`/products/${item.id}`} className="line-clamp-2 font-bold leading-snug text-text-main hover:text-primary sm:text-lg">{productText(item)}</Link>
                      <p className="mt-2 text-sm text-text-muted"><ProductPrice price={item.price} discountedPrice={item.discounted_price} formatPrice={formatPrice} /> {t("each")}</p>
                    </div>

                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex items-center rounded-xl border border-border bg-background">
                          <button type="button" onClick={() => updateQuantity(item.id, quantity - 1)} aria-label={t("Remove one {name} from cart", { name: productText(item) })} className="flex size-10 items-center justify-center text-xl text-text-main hover:bg-surface-muted">−</button>
                          <span aria-live="polite" className="min-w-8 text-center text-sm font-semibold text-text-main">{quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, quantity + 1)} disabled={atLimit} aria-label={t("Add one {name} to cart", { name: productText(item) })} className="flex size-10 items-center justify-center text-xl text-text-main hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40">+</button>
                        </div>
                        <button type="button" onClick={() => removeFromCart(item.id)} className="text-xs font-semibold text-text-muted underline underline-offset-4 hover:text-primary">{t("Remove")}</button>
                      </div>
                      <p className="font-bold text-text-main sm:text-lg">{formatPrice(getProductPrice(item) * quantity)}</p>
                    </div>
                  </div>
                </article>
              );
            })}

            <Link to="/products" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:text-primary-hover">{t("Continue shopping")}</Link>
          </section>

          <aside aria-labelledby="order-summary" className="rounded-2xl border border-border bg-surface p-6 lg:sticky lg:top-24">
            <h2 id="order-summary" className="text-xl font-bold text-text-main">{t("Order summary")}</h2>
            <div className="mt-7 space-y-4 border-b border-border pb-6 text-sm">
              <div className="flex justify-between gap-4 text-text-muted">
                <span>{t("Total")}</span>
                <span className="font-semibold text-text-main">{formatPrice(cartFullTotal)}</span>
              </div>
              <div className="flex justify-between gap-4 text-text-muted">
                <span className="text-green-600">{t("Total discount")}</span>
                <span className="font-semibold text-green-600">{formatPrice(cartDiscountTotal)}</span>
              </div>
              <p className="text-xs leading-5 text-text-muted">{t("Delivery charges are calculated at checkout.")}</p>
            </div>
            <div className="flex items-center justify-between gap-4 py-6 font-bold text-text-main">
              <span className="text-lg">{t("After discount")}</span>
              <span className="text-xl">{formatPrice(cartTotal)}</span>
            </div>
            {isLoading ? (
              <button type="button" disabled className="flex min-h-14 w-full items-center justify-center rounded-xl bg-primary px-6 font-bold text-text-light opacity-60">{t("Checking account…")}</button>
            ) : (
              <Link to={user ? "/checkout" : "/login"} state={user ? undefined : { from: "/checkout" }} className="flex min-h-14 w-full items-center justify-center rounded-xl bg-primary px-6 font-bold text-text-light transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25">
                {user ? t("Proceed to checkout") : t("Log in to checkout")}
              </Link>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

export default Cart;
