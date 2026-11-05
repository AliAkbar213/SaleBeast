import { useLanguage } from "../contexts/LanguageContext";
import { useState } from "react";
import { Link } from "react-router";
import useFetch from "../CustomHooks/useFetch";
import { useCart } from "../contexts/CartContext";
import ProductPrice from "../Components/ProductPrice";
import WhatsAppIcon from "../Components/WhatsAppIcon";
import "./Home.css";

const isSoldOut = (product) => product.stock != null && Number(product.stock) <= 0;

function Arrow({ back = false }) {
  const { isArabic } = useLanguage();
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" style={back !== isArabic ? { transform: "rotate(180deg)" } : undefined}><path d="M4 12h16m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ProductImage({ product, featured = false }) {
  const { t, productText } = useLanguage();
  const [failed, setFailed] = useState(false);
  return product.image && !failed ? (
    <img src={product.image} alt={productText(product)} onError={() => setFailed(true)} loading={featured ? "eager" : "lazy"} fetchPriority={featured ? "high" : "auto"} />
  ) : <span className="store-image-placeholder">{t("Image unavailable")}</span>;
}

function CartButton({ product }) {
  const { t, productText } = useLanguage();
  const { addToCart, getItemQuantity, updateQuantity } = useCart();
  const quantity = getItemQuantity(product.id);
  const atLimit = product.stock != null && quantity >= Number(product.stock);
  if (isSoldOut(product)) return <button className="store-add" disabled>{t("Out of stock")}</button>;
  if (quantity > 0) return (
    <div className="store-quantity">
      <button type="button" aria-label={t("Remove one {name}", { name: productText(product) })} onClick={() => updateQuantity(product.id, quantity - 1)}>−</button>
      <span aria-live="polite">{t("{count} in cart", { count: quantity })}</span>
      <button type="button" aria-label={t("Add one {name}", { name: productText(product) })} disabled={atLimit} onClick={() => addToCart(product)}>+</button>
    </div>
  );
  return <button type="button" className="store-add" onClick={() => addToCart(product)} aria-label={t("Add {name} to cart", { name: productText(product) })}>{t("Add to cart")} <span aria-hidden="true">+</span></button>;
}

function FeaturedCarousel({ products }) {
  const { t, productText, formatPrice, isArabic } = useLanguage();
  const [selected, setSelected] = useState(0);
  const index = selected % products.length;
  const product = products[index];
  const changeSlide = (direction) => setSelected((current) => (current + direction + products.length) % products.length);
  return (
    <section className="store-feature" aria-label={t("Featured products")} aria-roledescription="carousel" onKeyDown={(event) => {
      if (event.target.tagName === "INPUT") return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        changeSlide((event.key === "ArrowRight" ? 1 : -1) * (isArabic ? -1 : 1));
      }
    }}>
      <div className="store-slide" role="group" aria-roledescription="slide" aria-label={t("{index} of {count}: {name}", { index: index + 1, count: products.length, name: productText(product) })}>
        <div className="store-feature-copy" aria-live="polite" aria-atomic="true">
          <p className="store-kicker"><span /> {t("Featured product")}</p>
          <h1>{productText(product)}</h1>
          <p className="store-feature-price"><ProductPrice price={product.price} discountedPrice={product.discounted_price} formatPrice={formatPrice} /></p>
          <p className={`store-stock ${isSoldOut(product) ? "sold-out" : ""}`}>{isSoldOut(product) ? t("Currently out of stock") : product.stock != null ? t("In stock") : t("View availability")}</p>
          <Link className="store-shop-button" to={`/products/${product.id}`}>{t("View product")} <Arrow /></Link>
        </div>
        <Link className="store-feature-image" to={`/products/${product.id}`} aria-label={t("View {name}", { name: productText(product) })}>
          <ProductImage key={product.id} product={product} featured />
        </Link>
      </div>
      <div className="store-carousel-bar">
        <span className="store-slide-count">{String(index + 1).padStart(2, "0")} <span>/ {String(products.length).padStart(2, "0")}</span></span>
        <div className="store-dots" aria-label={t("Choose a featured product")}>
          {products.map((item, itemIndex) => <button key={item.id} type="button" aria-label={t("Show {name}", { name: productText(item) })} aria-current={index === itemIndex ? "true" : undefined} onClick={() => setSelected(itemIndex)}><span /></button>)}
        </div>
        <div className="store-arrows">
          <button type="button" aria-label={t("Previous featured product")} disabled={products.length < 2} onClick={() => changeSlide(-1)}><Arrow back /></button>
          <button type="button" aria-label={t("Next featured product")} disabled={products.length < 2} onClick={() => changeSlide(1)}><Arrow /></button>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { t, productText, dataName, formatPrice } = useLanguage();
  const api = import.meta.env.VITE_API_URL || "";
  const { data, loading, error } = useFetch(`${api}/api/products?page=1`);
  const { data: categoryData } = useFetch(`${api}/api/products/categories`);
  const products = Array.isArray(data) ? data : [];
  const categories = Array.isArray(categoryData) ? categoryData : [];
  const featured = [...products].sort((a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b))).slice(0, 5);
  const failed = error || (!loading && !Array.isArray(data));

  return (
    <div className="store-home">
      <main className="page-container">
        <div className="store-toolbar">
          <Link className="store-all-link" to="/products">{t("Shop all products")} <Arrow /></Link>
          <form action="/products" className="store-search" role="search">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
            <input name="q" type="search" aria-label={t("Search products")} placeholder={t("Search products…")} />
            <button type="submit">{t("Search")}</button>
          </form>
        </div>

        {loading ? <div className="store-loading-feature" role="status">{t("Loading featured products…")}</div> : failed ? (
          <section className="store-message" role="alert"><h1>{t("Products couldn’t be loaded")}</h1><p>{t("Please try again in a moment.")}</p><button className="store-shop-button" onClick={() => window.location.reload()}>{t("Try again")} <Arrow /></button></section>
        ) : featured.length ? <FeaturedCarousel products={featured} /> : (
          <section className="store-message"><h1>{t("The shelves are getting ready.")}</h1><p>{t("Check back soon for products.")}</p><Link className="store-shop-button" to="/products">{t("Browse the store")} <Arrow /></Link></section>
        )}

        {categories.length > 0 && <nav className="store-categories" aria-label={t("Shop by category")}>
          <span>{t("Shop by category")}</span>
          <div>{categories.map((category) => <Link key={category.id} to={`/products?category=${category.id}`}>{dataName(category)}<Arrow /></Link>)}</div>
        </nav>}

        {!failed && <section className="store-products" aria-labelledby="store-products-title">
          <div className="store-section-heading"><div><p className="store-kicker">{t("The collection")}</p><h2 id="store-products-title">{t("Shop our products")}</h2></div><Link to="/products">{t("View all")} <Arrow /></Link></div>
          {loading ? <div className="store-product-grid" role="status" aria-label={t("Loading products")}>{Array.from({ length: 4 }, (_, index) => <div className="store-skeleton" key={index} />)}</div> : (
            <div className="store-product-grid">{products.slice(0, 8).map((product) => (
              <article className="store-product-card" key={product.id}>
                <Link className="store-card-image" to={`/products/${product.id}`}>
                  {isSoldOut(product) && <span className="store-sold-out">{t("Out of stock")}</span>}
                  <ProductImage product={product} />
                </Link>
                <div className="store-card-details">
                  <h3><Link to={`/products/${product.id}`}>{productText(product)}</Link></h3>
                  <p className="store-card-price"><ProductPrice price={product.price} discountedPrice={product.discounted_price} formatPrice={formatPrice} /></p>
                  <CartButton product={product} />
                </div>
              </article>
            ))}</div>
          )}
        </section>}
      </main>
      <a className="store-whatsapp" href="https://wa.me/96599830926" target="_blank" rel="noopener noreferrer" aria-label={t("Chat with us on WhatsApp (opens in a new tab)")} title={t("Chat with us on WhatsApp")}>
        <WhatsAppIcon />
      </a>
    </div>
  );
}
