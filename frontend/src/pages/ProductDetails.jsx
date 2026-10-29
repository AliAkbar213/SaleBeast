import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import useFetch from "../CustomHooks/useFetch";
import { useCart } from "../contexts/CartContext";
import ProductMarkdown from "../Components/ProductMarkdown";
import ProductPrice from "../Components/ProductPrice";

function ProductDetails() {
  const { id } = useParams();
  const { addToCart, updateQuantity, getItemQuantity } = useCart();
  const [imageOpen, setImageOpen] = useState(false);
  const [imageMagnified, setImageMagnified] = useState(false);
  const [reminders, setReminders] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("salebeast-stock-reminders") || "[]");
      return Array.isArray(saved) ? saved.filter((savedId) => typeof savedId === "string") : [];
    } catch {
      return [];
    }
  });

  const url = `${import.meta.env.VITE_API_URL}/api/products/${id}`;
  const { data: product, loading, error } = useFetch(url);

  useEffect(() => {
    if (!imageOpen) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setImageOpen(false);
        setImageMagnified(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [imageOpen]);

  if (loading) {
    return <main className="mx-auto max-w-7xl px-4 py-16 text-text-muted sm:px-6">Loading product...</main>;
  }

  if (error) {
    return <main className="mx-auto max-w-7xl px-4 py-16 text-text-muted sm:px-6">Failed to load product.</main>;
  }

  if (!product) {
    return <main className="mx-auto max-w-7xl px-4 py-16 text-text-muted sm:px-6">Product not found.</main>;
  }

  const imageUrl = product.image;
  const quantity = getItemQuantity(product.id);
  const unavailable = Number(product.stock) === 0;
  const reminderSaved = reminders.includes(String(product.id));
  const requestReminder = () => {
    const next = [...new Set([...reminders, String(product.id)])];
    try {
      localStorage.setItem("salebeast-stock-reminders", JSON.stringify(next));
    } catch {
      // Keep the reminder active for this session if storage is unavailable.
    }
    setReminders(next);
  };
  const closeImage = () => {
    setImageOpen(false);
    setImageMagnified(false);
  };

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-2 text-sm text-text-muted">
        <Link to="/products" className="hover:text-primary">Products</Link>
        <span aria-hidden="true">/</span>
        <span className="truncate text-text-main">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => imageUrl && setImageOpen(true)}
            disabled={!imageUrl}
            aria-label={imageUrl ? `Enlarge image of ${product.name}` : "No product image available"}
            className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl border border-border bg-surface p-8 text-text-muted sm:p-12"
          >
            {imageUrl ? (
              <>
                <img src={imageUrl} alt={product.name} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                <span className="absolute bottom-5 right-5 rounded-full border border-border bg-surface/95 px-4 py-2 text-xs font-semibold text-text-main shadow-sm">
                  Click to zoom
                </span>
              </>
            ) : (
              <span>Image unavailable</span>
            )}
          </button>
          {imageUrl && <p className="mt-3 text-center text-xs text-text-muted">Click the image for a closer look</p>}
        </div>

        <section className="flex min-w-0 flex-col justify-center" aria-labelledby="product-title">
          {product.category && (
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">{product.category}</p>
          )}
          <h1 id="product-title" className="text-3xl font-bold leading-tight tracking-tight text-text-main sm:text-4xl lg:text-5xl">
            {product.name}
          </h1>
          <p className="mt-5 text-3xl font-bold text-text-main">
            <ProductPrice price={product.price} discountedPrice={product.discounted_price} />
          </p>

          {product.key_features?.trim() && (
            <div className="mt-8 border-t border-border pt-7">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-text-main">Key features</h2>
              <ProductMarkdown>{product.key_features}</ProductMarkdown>
            </div>
          )}

          <div className="mt-8 border-t border-border pt-8">
            {unavailable ? (
              <div>
                <p className="mb-4 text-sm text-text-muted">Currently unavailable</p>
                <button
                  type="button"
                  onClick={requestReminder}
                  disabled={reminderSaved}
                  className={`flex min-h-14 w-full items-center justify-center rounded-xl px-6 text-base font-bold transition-colors ${reminderSaved ? "cursor-default border border-green-300 bg-green-100 text-green-800" : "bg-primary text-text-light hover:bg-primary-hover active:bg-primary-active"}`}
                >
                  {reminderSaved ? "✓ Reminder set" : "Notify me when available"}
                </button>
              </div>
            ) : quantity > 0 ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="inline-flex items-center rounded-xl border border-border bg-surface">
                  <button type="button" onClick={() => updateQuantity(product.id, quantity - 1)} aria-label="Remove one from cart" className="flex size-12 items-center justify-center text-xl text-text-main hover:bg-surface-muted">−</button>
                  <span aria-live="polite" className="min-w-10 text-center font-semibold text-text-main">{quantity}</span>
                  <button type="button" onClick={() => addToCart(product)} aria-label="Add one to cart" className="flex size-12 items-center justify-center text-xl text-text-main hover:bg-surface-muted">+</button>
                </div>
                <span className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-primary-soft px-6 font-semibold text-primary">
                  Added to cart
                </span>
              </div>
            ) : (
              <button type="button" onClick={() => addToCart(product)} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-primary px-6 text-base font-bold text-text-light transition-colors hover:bg-primary-hover active:bg-primary-active">
                <span aria-hidden="true" className="text-xl">+</span> Add to cart
              </button>
            )}
            {quantity > 0 && <p className="mt-3 text-sm text-text-muted">{quantity} in your cart</p>}
          </div>
        </section>
      </div>

      {(product.desc || product.description)?.trim() && (
        <section className="mt-12 min-w-0 border-t border-border pt-8 sm:mt-16" aria-labelledby="product-description-title">
          <h2 id="product-description-title" className="mb-6 text-xl font-bold text-text-main">Product description</h2>
          <ProductMarkdown>{product.desc || product.description}</ProductMarkdown>
        </section>
      )}

      {imageOpen && imageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Enlarged image of ${product.name}`}
          onClick={closeImage}
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/90 p-4 sm:p-8"
        >
          <button type="button" onClick={closeImage} aria-label="Close enlarged image" className="absolute right-4 top-4 z-10 flex size-11 items-center justify-center rounded-full bg-surface text-2xl text-text-main hover:bg-surface-muted sm:right-8 sm:top-8">×</button>
          <div onClick={(event) => event.stopPropagation()} className="flex h-full w-full max-w-5xl items-center justify-center overflow-hidden">
            <button
              type="button"
              onClick={() => setImageMagnified((value) => !value)}
              aria-label={imageMagnified ? "Zoom out product image" : "Zoom in product image"}
              className="flex max-h-full max-w-full items-center justify-center"
            >
              <img
                src={imageUrl}
                alt={product.name}
                className={`max-h-[calc(100vh-4rem)] max-w-full object-contain transition-transform duration-200 ${imageMagnified ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"}`}
              />
            </button>
          </div>
          <p className="pointer-events-none absolute bottom-5 text-center text-xs text-text-light/80">Click the image to zoom further · Press Esc to close</p>
        </div>
      )}
    </main>
  );
}

export default ProductDetails;
