import { useState } from "react";
import { Link } from "react-router";
import useFetch from "../CustomHooks/useFetch";
import { useCart } from "../contexts/CartContext";
import ProductPrice from "../Components/ProductPrice";
import "./Home.css";

const priceLabel = (price) => `${Number(price).toFixed(3)} KD`;
const isSoldOut = (product) => product.stock != null && Number(product.stock) <= 0;

function Arrow({ back = false }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" style={back ? { transform: "rotate(180deg)" } : undefined}><path d="M4 12h16m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ProductImage({ product, featured = false }) {
  const [failed, setFailed] = useState(false);
  return product.image && !failed ? (
    <img src={product.image} alt={product.name} onError={() => setFailed(true)} loading={featured ? "eager" : "lazy"} fetchPriority={featured ? "high" : "auto"} />
  ) : <span className="store-image-placeholder">Image unavailable</span>;
}

function CartButton({ product }) {
  const { addToCart, getItemQuantity, updateQuantity } = useCart();
  const quantity = getItemQuantity(product.id);
  const atLimit = product.stock != null && quantity >= Number(product.stock);
  if (isSoldOut(product)) return <button className="store-add" disabled>Out of stock</button>;
  if (quantity > 0) return (
    <div className="store-quantity">
      <button type="button" aria-label={`Remove one ${product.name}`} onClick={() => updateQuantity(product.id, quantity - 1)}>−</button>
      <span aria-live="polite">{quantity} in cart</span>
      <button type="button" aria-label={`Add one ${product.name}`} disabled={atLimit} onClick={() => addToCart(product)}>+</button>
    </div>
  );
  return <button type="button" className="store-add" onClick={() => addToCart(product)} aria-label={`Add ${product.name} to cart`}>Add to cart <span aria-hidden="true">+</span></button>;
}

function FeaturedCarousel({ products }) {
  const [selected, setSelected] = useState(0);
  const index = selected % products.length;
  const product = products[index];
  const changeSlide = (direction) => setSelected((current) => (current + direction + products.length) % products.length);
  return (
    <section className="store-feature" aria-label="Featured products" aria-roledescription="carousel" onKeyDown={(event) => {
      if (event.target.tagName === "INPUT") return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        changeSlide(event.key === "ArrowRight" ? 1 : -1);
      }
    }}>
      <div className="store-slide" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${products.length}: ${product.name}`}>
        <div className="store-feature-copy" aria-live="polite" aria-atomic="true">
          <p className="store-kicker"><span /> Featured product</p>
          <h1>{product.name}</h1>
          <p className="store-feature-price"><ProductPrice price={product.price} discountedPrice={product.discounted_price} formatPrice={priceLabel} /></p>
          <p className={`store-stock ${isSoldOut(product) ? "sold-out" : ""}`}>{isSoldOut(product) ? "Currently out of stock" : product.stock != null ? "In stock" : "View availability"}</p>
          <Link className="store-shop-button" to={`/products/${product.id}`}>View product <Arrow /></Link>
        </div>
        <Link className="store-feature-image" to={`/products/${product.id}`} aria-label={`View ${product.name}`}>
          <ProductImage key={product.id} product={product} featured />
        </Link>
      </div>
      <div className="store-carousel-bar">
        <span className="store-slide-count">{String(index + 1).padStart(2, "0")} <span>/ {String(products.length).padStart(2, "0")}</span></span>
        <div className="store-dots" aria-label="Choose a featured product">
          {products.map((item, itemIndex) => <button key={item.id} type="button" aria-label={`Show ${item.name}`} aria-current={index === itemIndex ? "true" : undefined} onClick={() => setSelected(itemIndex)}><span /></button>)}
        </div>
        <div className="store-arrows">
          <button type="button" aria-label="Previous featured product" disabled={products.length < 2} onClick={() => changeSlide(-1)}><Arrow back /></button>
          <button type="button" aria-label="Next featured product" disabled={products.length < 2} onClick={() => changeSlide(1)}><Arrow /></button>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
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
          <Link className="store-all-link" to="/products">Shop all products <Arrow /></Link>
          <form action="/products" className="store-search" role="search">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
            <input name="q" type="search" aria-label="Search products" placeholder="Search products…" />
            <button type="submit">Search</button>
          </form>
        </div>

        {loading ? <div className="store-loading-feature" role="status">Loading featured products…</div> : failed ? (
          <section className="store-message" role="alert"><h1>Products couldn’t be loaded</h1><p>Please try again in a moment.</p><button className="store-shop-button" onClick={() => window.location.reload()}>Try again <Arrow /></button></section>
        ) : featured.length ? <FeaturedCarousel products={featured} /> : (
          <section className="store-message"><h1>The shelves are getting ready.</h1><p>Check back soon for products.</p><Link className="store-shop-button" to="/products">Browse the store <Arrow /></Link></section>
        )}

        {categories.length > 0 && <nav className="store-categories" aria-label="Shop by category">
          <span>Shop by category</span>
          <div>{categories.map((category) => <Link key={category.id} to={`/products?category=${category.id}`}>{category.name}<Arrow /></Link>)}</div>
        </nav>}

        {!failed && <section className="store-products" aria-labelledby="store-products-title">
          <div className="store-section-heading"><div><p className="store-kicker">The collection</p><h2 id="store-products-title">Shop our products</h2></div><Link to="/products">View all <Arrow /></Link></div>
          {loading ? <div className="store-product-grid" role="status" aria-label="Loading products">{Array.from({ length: 4 }, (_, index) => <div className="store-skeleton" key={index} />)}</div> : (
            <div className="store-product-grid">{products.slice(0, 8).map((product) => (
              <article className="store-product-card" key={product.id}>
                <Link className="store-card-image" to={`/products/${product.id}`}>
                  {isSoldOut(product) && <span className="store-sold-out">Out of stock</span>}
                  <ProductImage product={product} />
                </Link>
                <div className="store-card-details">
                  <h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3>
                  <p className="store-card-price"><ProductPrice price={product.price} discountedPrice={product.discounted_price} formatPrice={priceLabel} /></p>
                  <CartButton product={product} />
                </div>
              </article>
            ))}</div>
          )}
        </section>}
      </main>
      <footer className="store-footer"><div className="page-container"><Link to="/" className="store-footer-brand">SALE<span>BEAST</span></Link><p>© {new Date().getFullYear()} SaleBeast</p><Link to="/cart">View your cart <Arrow /></Link></div></footer>
      <a className="store-whatsapp" href="https://wa.me/96599830926" target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp (opens in a new tab)" title="Chat with us on WhatsApp">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
          <path d="M20.52 3.48A11.86 11.86 0 0 0 12.05 0C5.47 0 .12 5.35.12 11.93c0 2.1.55 4.16 1.6 5.97L.02 24l6.25-1.64a11.9 11.9 0 0 0 5.77 1.47h.01c6.58 0 11.93-5.35 11.94-11.93a11.86 11.86 0 0 0-3.47-8.42ZM12.05 21.82a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.71.97.99-3.62-.24-.37a9.88 9.88 0 0 1-1.51-5.28c0-5.47 4.45-9.92 9.93-9.92a9.86 9.86 0 0 1 7.02 2.91 9.86 9.86 0 0 1 2.9 7.02c0 5.48-4.45 9.93-9.98 9.88Zm5.44-7.43c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.77-1.65-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.62.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.13-.28-.2-.58-.35Z" />
        </svg>
      </a>
    </div>
  );
}
