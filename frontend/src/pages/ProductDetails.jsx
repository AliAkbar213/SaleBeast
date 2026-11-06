import { useLanguage } from "../contexts/LanguageContext";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import useFetch from "../CustomHooks/useFetch";
import { useCart } from "../contexts/CartContext";
import ProductMarkdown from "../Components/ProductMarkdown";
import ProductPrice from "../Components/ProductPrice";
import { getAvailableStock } from "../utils/cartStock";

const apiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function resolveGalleryImage(path) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path)) return path;

  const relativePath = path.replace(/^\.?\//, "");
  const imagePath = relativePath.startsWith("images/") ? relativePath : `images/${relativePath}`;
  return `${apiUrl}/${imagePath}`;
}

function ProductDetails() {
  const { t, productText, dataName } = useLanguage();
  const { id } = useParams();
  const { addToCart, updateQuantity, getItemQuantity } = useCart();
  const [imageOpen, setImageOpen] = useState(false);
  const [imageMagnified, setImageMagnified] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const swipeStart = useRef(null);
  const suppressImageClick = useRef(false);
  const [reminders, setReminders] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("salebeast-stock-reminders") || "[]");
      return Array.isArray(saved) ? saved.filter((savedId) => typeof savedId === "string") : [];
    } catch {
      return [];
    }
  });

  const url = `${apiUrl}/api/products/${id}`;
  const { data: product, loading, error } = useFetch(url);

  const extraImages = (Array.isArray(product?.images) ? product.images : [])
    .filter((path) => typeof path === "string" && path.trim())
    .map((path) => resolveGalleryImage(path.trim()));
  const imageUrls = [...new Set([product?.image, ...extraImages].filter(Boolean))];
  const videoUrl = typeof product?.video === "string" ? product.video.trim() : "";
  const galleryItems = imageUrls.map((src) => ({ type: "image", src }));
  if (videoUrl) galleryItems.unshift({ type: "video", src: videoUrl });
  const activeMedia = galleryItems.find((item) => selectedMedia?.productId === product?.id &&
    item.type === selectedMedia.type && item.src === selectedMedia.src) || galleryItems[0];
  const imageUrl = activeMedia?.type === "image" ? activeMedia.src : null;

  const browseMedia = (direction) => {
    const nextIndex = (galleryItems.indexOf(activeMedia) + direction + galleryItems.length) % galleryItems.length;
    setSelectedMedia({ productId: product.id, ...galleryItems[nextIndex] });
    setImageMagnified(false);
  };

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
    return <main className="mx-auto max-w-7xl px-4 py-16 text-text-muted sm:px-6">{t("Loading product...")}</main>;
  }

  if (error) {
    return <main className="mx-auto max-w-7xl px-4 py-16 text-text-muted sm:px-6">{t("Failed to load product.")}</main>;
  }

  if (!product) {
    return <main className="mx-auto max-w-7xl px-4 py-16 text-text-muted sm:px-6">{t("Product not found.")}</main>;
  }

  const quantity = getItemQuantity(product.id);
  const stock = getAvailableStock(product);
  const unavailable = stock === 0;
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
  const swipeHandlers = galleryItems.length > 1 ? {
    onPointerDown(event) {
      suppressImageClick.current = false;
      // Leave the video's control bar available for seeking and playback.
      if (event.target instanceof HTMLVideoElement &&
        event.clientY >= event.target.getBoundingClientRect().bottom - 48) {
        swipeStart.current = null;
        return;
      }
      swipeStart.current = event.pointerType === "touch" && event.isPrimary
        ? { id: event.pointerId, x: event.clientX, y: event.clientY }
        : null;
    },
    onPointerCancel() {
      swipeStart.current = null;
    },
    onPointerUp(event) {
      const start = swipeStart.current;
      swipeStart.current = null;
      if (start?.id !== event.pointerId) return;

      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;

      suppressImageClick.current = true;
      browseMedia(dx < 0 ? 1 : -1);
    },
    onClickCapture(event) {
      if (!suppressImageClick.current || event.detail === 0) return;
      suppressImageClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  } : {};

  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <nav aria-label={t("Breadcrumb")} className="mb-7 flex flex-wrap items-center gap-2 text-sm text-text-muted">
        <Link to="/products" className="hover:text-primary">{t("Products")}</Link>
        <span aria-hidden="true">/</span>
        <span className="truncate text-text-main">{productText(product)}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="min-w-0">
          <div className="relative">
            {activeMedia?.type === "video" ? (
              <div {...swipeHandlers} className="flex aspect-square w-full touch-pan-y touch-pinch-zoom items-center justify-center overflow-hidden rounded-3xl border border-border bg-black">
                <video key={activeMedia.src} src={activeMedia.src} controls playsInline preload="metadata" aria-label={t("Video of {name}", { name: productText(product) })} className="h-full w-full object-contain">
                  {t("Your browser does not support video playback.")} <a href={activeMedia.src}>{t("Open product video")}</a>.
                </video>
              </div>
            ) : (
              <button
                type="button"
                {...swipeHandlers}
                onClick={() => imageUrl && setImageOpen(true)}
                disabled={!imageUrl}
                aria-label={imageUrl ? t("Enlarge image of {name}", { name: productText(product) }) : t("No product image available")}
                className="group relative flex aspect-square w-full touch-pan-y touch-pinch-zoom items-center justify-center overflow-hidden rounded-3xl border border-border bg-surface p-8 text-text-muted sm:p-12"
              >
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt={productText(product)} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                    <span className="absolute bottom-5 end-5 rounded-full border border-border bg-surface/95 px-4 py-2 text-xs font-semibold text-text-main shadow-sm">
                      {t("Click to zoom")}
                    </span>
                  </>
                ) : (
                  <span>{t("Image unavailable")}</span>
                )}
              </button>
            )}
          </div>
          {galleryItems.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2" aria-label={t("Product images and video")}>
              {galleryItems.map((item, index) => (
                <button
                  key={`${item.type}:${item.src}`}
                  type="button"
                  onClick={() => {
                    setSelectedMedia({ productId: product.id, ...item });
                    setImageMagnified(false);
                  }}
                  aria-label={item.type === "video" ? t("View video of {name}", { name: productText(product) }) : t("View image {index} of {name}", { index: index + 1, name: productText(product) })}
                  aria-pressed={activeMedia === item}
                  className={`flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-surface p-2 ${activeMedia === item ? "border-primary ring-2 ring-primary" : "border-border"}`}
                >
                  {item.type === "video" ? (
                    <span className="flex flex-col items-center gap-1 text-sm text-text-main"><span aria-hidden="true">▶</span>{t("Video")}</span>
                  ) : (
                    <img src={item.src} alt={t("{name}, image {index}", { name: productText(product), index: index + 1 })} className="h-full w-full object-contain" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="flex min-w-0 flex-col justify-center" aria-labelledby="product-title">
          {product.category && (
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">{dataName({ name: product.category, ar_name: product.ar_category })}</p>
          )}
          <h1 id="product-title" className="text-3xl font-bold leading-tight tracking-tight text-text-main sm:text-4xl lg:text-5xl">
            {productText(product)}
          </h1>
          <p className="mt-5 text-3xl font-bold text-text-main">
            <ProductPrice price={product.price} discountedPrice={product.discounted_price} />
          </p>

          {productText(product, "key_features")?.trim() && (
            <div className="mt-8 border-t border-border pt-7">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-text-main">{t("Key features")}</h2>
              <ProductMarkdown>{productText(product, "key_features")}</ProductMarkdown>
            </div>
          )}

          <div className="mt-8 border-t border-border pt-8">
            {unavailable ? (
              <div>
                <p className="mb-4 text-sm text-text-muted">{t("Currently unavailable")}</p>
                <button
                  type="button"
                  onClick={requestReminder}
                  disabled={reminderSaved}
                  className={`flex min-h-14 w-full items-center justify-center rounded-xl px-6 text-base font-bold transition-colors ${reminderSaved ? "cursor-default border border-green-300 bg-green-100 text-green-800" : "bg-primary text-text-light hover:bg-primary-hover active:bg-primary-active"}`}
                >
                  {reminderSaved ? t("✓ Reminder set") : t("Notify me when available")}
                </button>
              </div>
            ) : quantity > 0 ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="inline-flex items-center rounded-xl border border-border bg-surface">
                  <button type="button" onClick={() => updateQuantity(product.id, quantity - 1)} aria-label={t("Remove one from cart")} className="flex size-12 items-center justify-center text-xl text-text-main hover:bg-surface-muted">−</button>
                  <span aria-live="polite" className="min-w-10 text-center font-semibold text-text-main">{quantity}</span>
                  <button type="button" onClick={() => addToCart(product)} disabled={quantity >= stock} aria-label={t("Add one to cart")} className="flex size-12 items-center justify-center text-xl text-text-main hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40">+</button>
                </div>
                <span className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl bg-primary-soft px-6 font-semibold text-primary">
                  {t("Added to cart")}
                </span>
              </div>
            ) : (
              <button type="button" onClick={() => addToCart(product)} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-primary px-6 text-base font-bold text-text-light transition-colors hover:bg-primary-hover active:bg-primary-active">
                <span aria-hidden="true" className="text-xl">+</span> {t("Add to cart")}
              </button>
            )}
            {quantity > 0 && <p className="mt-3 text-sm text-text-muted">{t("{count} in your cart", { count: quantity })}</p>}
          </div>
        </section>
      </div>

      {productText(product, "desc")?.trim() && (
        <section className="mt-12 min-w-0 border-t border-border pt-8 sm:mt-16" aria-labelledby="product-description-title">
          <h2 id="product-description-title" className="mb-6 text-xl font-bold text-text-main">{t("Product description")}</h2>
          <ProductMarkdown>{productText(product, "desc")}</ProductMarkdown>
        </section>
      )}

      {imageOpen && activeMedia && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(activeMedia.type === "video" ? "Enlarged video of {name}" : "Enlarged image of {name}", { name: productText(product) })}
          onClick={closeImage}
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/90 p-4 sm:p-8"
        >
          <button type="button" onClick={closeImage} aria-label={t("Close enlarged image")} className="absolute end-4 top-4 z-10 flex size-11 items-center justify-center rounded-full bg-surface text-2xl text-text-main hover:bg-surface-muted sm:end-8 sm:top-8">×</button>
          <div onClick={(event) => event.stopPropagation()} className="flex h-full w-full max-w-5xl items-center justify-center overflow-hidden">
            {activeMedia.type === "video" ? (
              <div {...swipeHandlers} className="flex h-full w-full touch-pan-y touch-pinch-zoom items-center justify-center">
                <video key={activeMedia.src} src={activeMedia.src} controls playsInline preload="metadata" aria-label={t("Video of {name}", { name: productText(product) })} className="max-h-full w-full object-contain">
                  {t("Your browser does not support video playback.")} <a href={activeMedia.src}>{t("Open product video")}</a>.
                </video>
              </div>
            ) : (
              <button
                type="button"
                {...swipeHandlers}
                onClick={() => setImageMagnified((value) => !value)}
                aria-label={imageMagnified ? t("Zoom out product image") : t("Zoom in product image")}
                className="flex max-h-full max-w-full touch-pan-y touch-pinch-zoom items-center justify-center"
              >
                <img
                  src={imageUrl}
                  alt={productText(product)}
                  className={`max-h-[calc(100vh-4rem)] max-w-full object-contain transition-transform duration-200 ${imageMagnified ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"}`}
                />
              </button>
            )}
          </div>
          {imageUrl && <p className="pointer-events-none absolute bottom-5 text-center text-xs text-text-light/80">{t("Click the image to zoom further · Press Esc to close")}</p>}
        </div>
      )}
    </main>
  );
}

export default ProductDetails;

