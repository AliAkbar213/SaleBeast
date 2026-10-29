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
    </div>
  );
}
