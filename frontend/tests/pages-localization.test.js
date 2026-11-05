import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { createServer } from "vite";

test("all pages render in both languages, including Arabic product content, cart and checkout", async () => {
  const product = {
    id: 1, name: "Test projector", ar_name: "جهاز العرض التجريبي",
    desc: "English product description", ar_desc: "وصف المنتج بالعربية",
    key_features: "English product features", ar_key_features: "مميزات المنتج بالعربية",
    price: "12.500", discounted_price: "10.000", stock: 5, quantity: 2,
  };
  const fallback = { id: 2, name: "Fallback controller", ar_name: null, price: "5.000", stock: 3, quantity: 1 };
  const savedStorage = globalThis.localStorage;
  const storage = new Map();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  } });
  globalThis.__localizationFixtures = { product, products: [product, fallback] };
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { middlewareMode: true, watch: null },
    plugins: [{
      name: "localization-test-data",
      enforce: "pre",
      load(id) {
        if (!id.replaceAll("\\", "/").endsWith("/CustomHooks/useFetch.js")) return;
        return `export default function useFetch(url) {
          const fixture = globalThis.__localizationFixtures;
          const path = new URL(url, "http://localhost").pathname;
          const data = path.endsWith("/categories") ? [{id: 1, name: "Projectors", ar_name: "أجهزة العرض"}]
            : path.endsWith("/products/1") ? fixture.product : fixture.products;
          return {data, loading: false, error: null};
        }`;
      },
    }],
  });
  try {
    const { LanguageProvider } = await server.ssrLoadModule("/src/contexts/LanguageContext.jsx");
    const { CartProvider } = await server.ssrLoadModule("/src/contexts/CartContext.jsx");
    const { AuthContext } = await server.ssrLoadModule("/src/contexts/AuthContext.jsx");
    const { default: Navbar } = await server.ssrLoadModule("/src/Components/Navbar.jsx");
    const { default: Footer } = await server.ssrLoadModule("/src/Components/Footer.jsx");
    const cases = [
      ["/", "Home", "Shop our products", "تسوق منتجاتنا"],
      ["/products", "Products", "Search", "بحث"],
      ["/products/1", "ProductDetails", "Product description", "وصف المنتج"],
      ["/cart", "Cart", "Shopping cart", "سلة التسوق"],
      ["/checkout", "Checkout", "Complete your order", "أكمل طلبك"],
      ["/login", "Login", "Welcome back", "مرحباً بعودتك"],
      ["/signup", "Signup", "Full name", "الاسم الكامل"],
      ["/profile", "Profile", "Account details", "تفاصيل الحساب"],
    ];
    for (const language of ["en", "ar"]) {
      storage.set("salebeast-language", language);
      storage.set("cart", JSON.stringify([product, fallback]));
      for (const [path, page, english, arabic] of cases) {
        const { default: Page } = await server.ssrLoadModule(`/src/pages/${page}.jsx`);
        const markup = renderToStaticMarkup(React.createElement(LanguageProvider, null,
          React.createElement(CartProvider, null,
            React.createElement(AuthContext.Provider, { value: { user: { id: 1, name: "أحمد", email: "test@example.com" }, isLoading: false } },
              React.createElement(MemoryRouter, { initialEntries: [path] },
                React.createElement(Navbar),
                React.createElement(Routes, null, React.createElement(Route, { path: page === "ProductDetails" ? "/products/:id" : path, element: React.createElement(Page) })),
                React.createElement(Footer))))));
        assert.ok(markup.includes(language === "ar" ? arabic : english), `${page} ${language}: interface`);
        assert.ok(markup.includes(language === "ar" ? "التبديل إلى الإنجليزية" : "Switch to Arabic"), `${page}: switch`);
        if (["Home", "Products", "ProductDetails", "Cart", "Checkout"].includes(page)) {
          assert.ok(markup.includes(language === "ar" ? product.ar_name : product.name), `${page}: product title`);
        }
        if (["Home", "Products", "Cart", "Checkout"].includes(page)) assert.ok(markup.includes(fallback.name), `${page}: English fallback`);
        if (page === "ProductDetails") {
          assert.ok(markup.includes(language === "ar" ? product.ar_desc : product.desc));
          assert.ok(markup.includes(language === "ar" ? product.ar_key_features : product.key_features));
        }
        assert.ok(!markup.includes("[object Object]"));
      }
    }
  } finally {
    await server.close();
    delete globalThis.__localizationFixtures;
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: savedStorage });
  }
});
