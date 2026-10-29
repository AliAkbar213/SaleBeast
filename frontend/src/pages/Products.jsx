import { Link, useSearchParams } from "react-router";
import { useEffect, useState } from "react";
import useFetch from "../CustomHooks/useFetch"
import { useCart } from "../contexts/CartContext"
import ProductPrice from "../Components/ProductPrice"

function Products() {
  const { addToCart, updateQuantity, getItemQuantity, cartCount } = useCart()

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [reminders, setReminders] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("salebeast-stock-reminders") || "[]");
      return Array.isArray(saved)
        ? Object.fromEntries(saved.filter(id => typeof id === "string").map(id => [id, "saved"]))
        : {};
    } catch {
      return {};
    }
  });

  const requestReminder = (id) => {
    const next = { ...reminders, [String(id)]: "saved" };
    try {
      localStorage.setItem("salebeast-stock-reminders", JSON.stringify(Object.keys(next)));
      setReminders(Object.fromEntries(Object.keys(next).map(key => [key, "saved"])));
    } catch {
      setReminders({ ...reminders, [String(id)]: "session" });
    }
  };

  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const page = parseInt(searchParams.get("page"), 10) || 1;

  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }
  if (category) {
    params.set("category", category);
  }

  params.set("page", page);

  const { data, loading, error } = useFetch(import.meta.env.VITE_API_URL + `/api/products?${params.toString()}`)
  const { data: categories, loading: categoriesLoading } = useFetch(import.meta.env.VITE_API_URL + "/api/products/categories");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();

    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      setSearchParams({
        q: trimmedSearch,
        ...(category && { category }),
        page: "1"
      });
    } else {
      setSearchParams({
        ...(category && { category }),
        page: "1"
      });
    }
  };

  const goToNextPage = () => {
    setSearchParams(prev => {
      prev.set("page", page + 1);
      return prev;
    });
  };

  const goToPreviousPage = () => {
    if (page === 1) return;

    setSearchParams(prev => {
      prev.set("page", page - 1);
      return prev;
    });
  };

  return (
    <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl bg-background px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <h1 className="mb-6 text-center text-3xl font-bold tracking-tight text-text-main sm:text-4xl">
        {query ? `Showing results for: ${query}` : "Products"}
      </h1>
      <form
        onSubmit={handleSearch}
        className="mx-auto mb-6 flex w-full max-w-xl gap-2"
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="min-w-0 flex-1 w-full rounded-xl border border-border bg-surface px-4 py-3 text-base font-normal text-text-main outline-none transition-colors duration-200 ease-out placeholder:text-text-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/10 sm:text-sm"
        />

        <button
          type="submit"
          className="shrink-0 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-text-light transition-colors duration-200 ease-out hover:bg-primary-hover active:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        >
          Search
        </button>
      </form>

      {categoriesLoading && (
        <div className="hide-scrollbar mx-auto mb-8 flex max-w-5xl gap-2 overflow-x-auto px-1 py-1 md:flex-wrap md:justify-center md:overflow-x-visible">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-surface"
            />
          ))}
        </div>
      )}

      {categories && !categoriesLoading && (
        <div className="hide-scrollbar mx-auto mb-8 flex max-w-5xl gap-2 overflow-x-auto px-1 py-1 md:flex-wrap md:justify-center md:overflow-x-visible">
          {/* All products */}
          <button
            onClick={() => setSearchParams({ page: "1" })}
            className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${!category
              ? "border-primary bg-primary text-text-light"
              : "border-border bg-surface text-text-main hover:border-primary/40 hover:bg-surface-hover"
              }`}
          >
            All
          </button>

          {/* Categories */}
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                setSearchParams({
                  category: String(cat.id),
                  page: "1",
                })
              }
              className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${category === String(cat.id)
                ? "border-primary bg-primary text-text-light"
                : "border-border bg-surface text-text-main hover:border-primary/40 hover:bg-surface-hover"
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse overflow-hidden rounded-2xl border border-border-subtle bg-surface"
            >
              <div className="aspect-square bg-secondary sm:aspect-4/3" />
              <div className="space-y-3 p-4">
                <div className="h-4 rounded-full bg-background/80" />
                <div className="h-4 rounded-full bg-background/60" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
          {typeof error === 'string' ? error : 'Failed to load products.'}
        </p>
      )}

      {data && (
        data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-semibold text-text-main">
              No more products
            </p>
            <p className="mt-1 text-sm text-text-muted">
              There are no products to display on this page.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {/* Show "Previous Page" if they've paginated past the available products */}
              {page > 1 && (
                <button
                  onClick={goToPreviousPage}
                  className="rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-text-main transition-colors duration-200 ease-out hover:border-primary/40 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                >
                  Go to Previous Page
                </button>
              )}

              {/* Show "Clear Search" if a search or category filter resulted in 0 items */}
              {(query || category) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setSearchParams({ page: "1" });
                  }}
                  className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-text-light transition-colors duration-200 ease-out hover:bg-primary-hover active:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                >
                  Clear Search & Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {data.map((item) => {
                const quantity = getItemQuantity(item.id)
                const outOfStock = item.stock === 0 || item.stock === "0"
                const reminder = reminders[String(item.id)]

                return (
                  <article
                    key={item.id}
                    className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border transition-colors duration-200 ease-out ${outOfStock ? "border-border bg-surface-muted" : "border-border-subtle bg-surface hover:border-border"}`}
                  >
                    <Link to={`/products/${item.id}`}>
                      <div className="relative aspect-square w-full overflow-hidden p-3 sm:aspect-4/3 sm:p-4">{item.image && <img
                        src={item.image}
                        alt={item.name || "Product image"}
                        className={`h-full w-full object-contain transition-transform duration-200 ease-out ${outOfStock ? "opacity-45 grayscale" : "group-hover:scale-[1.02]"}`}
                      />}
                      </div>
                    </Link>

                    <div className="flex flex-1 flex-col justify-between gap-3 px-4 pt-4 pb-2">
                      <p className={`line-clamp-2 text-sm font-medium leading-snug sm:text-base ${outOfStock ? "text-text-muted" : "text-text-main"}`}>
                        {item.name}
                      </p>

                      <div>
                        <p className={`text-sm font-semibold sm:text-base ${outOfStock ? "text-text-muted" : "text-text-main"}`}>
                          <ProductPrice price={item.price} discountedPrice={item.discounted_price} />
                        </p>
                        {outOfStock && (
                          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-700">
                            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 shrink-0 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
                              <path d="m4 4 8 8M12 4l-8 8" />
                            </svg>
                            Out of stock
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex min-h-20 items-center justify-end px-1 pb-3 sm:px-4 sm:pb-4">
                      {outOfStock ? (
                        <div className="w-full px-3 pt-2 sm:px-0">
                          <button
                            type="button"
                            disabled={Boolean(reminder)}
                            onClick={() => requestReminder(item.id)}
                            aria-label={reminder ? `Interest saved for ${item.name || "item"}` : `Notify me when ${item.name || "item"} is available`}
                            className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors sm:text-sm ${reminder ? "border-green-300 bg-green-100 text-green-800" : "border-primary bg-primary text-white hover:border-primary-hover hover:bg-primary-hover"}`}
                          >
                            {reminder ? "✓ Reminder set" : "Notify me"}
                          </button>
                          {/* Temporary test button */}
                          <button
                            type="button"
                            onClick={() => {
                              localStorage.removeItem("salebeast-stock-reminders");
                              setReminders({});
                            }}
                            className="mb-4 rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                          >
                            Reset Reminders State (Dev Only)
                          </button>
                        </div>
                      ) : quantity > 0 ? (
                        <div className="flex items-center rounded-full border border-border-subtle bg-secondary p-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, quantity - 1)}
                            aria-label={`Remove one ${item.name || "item"} from cart`}
                            className="flex h-11 w-11 items-center justify-center rounded-full text-base font-semibold text-text-main transition-colors duration-200 hover:bg-secondary-hover"
                          >
                            −
                          </button>
                          <span
                            key={quantity}
                            className="min-w-5 text-center text-sm font-semibold text-text-main"
                            aria-label={`${quantity} in cart`}
                          >
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            aria-label={`Add one ${item.name || "item"} to cart`}
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-base font-semibold text-text-light transition-colors duration-200 hover:bg-primary-hover active:bg-primary-active"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          aria-label={`Add ${item.name || "item"} to cart`}
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-xl font-medium text-text-light transition-colors duration-200 hover:bg-primary-hover active:bg-primary-active"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>

            <nav aria-label="Product pagination" className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {page != 1 && <button
                onClick={goToPreviousPage}
                className="rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-text-main transition-colors duration-200 ease-out hover:border-primary/40 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-border-subtle disabled:hover:text-text-main"
              >
                Previous Page
              </button>}
              <button
                onClick={goToNextPage}
                className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-text-light transition-colors duration-200 ease-out hover:bg-primary-hover active:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              >
                Next page
              </button>
            </nav>
          </>
        )
      )}

      <Link
        to="/cart"
        aria-label={`Open cart${cartCount ? `, ${cartCount} items` : ""}`}
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-text-light shadow-md transition-colors duration-200 hover:bg-primary-hover active:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:bottom-6 sm:right-6"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
        </svg>
        {cartCount > 0 && (
          <span
            key={cartCount}
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-surface px-1 text-[11px] font-semibold text-primary"
          >
            {cartCount}
          </span>
        )}
      </Link>
    </div>
  )
}

export default Products
