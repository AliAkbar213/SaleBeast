import { createContext, useContext, useEffect, useState } from "react"
import { getProductPrice } from "../utils/productPrice"

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem("cart")
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems))
  }, [cartItems])

  // Older saved carts predate ar_name. Enrich them without changing prices or quantities.
  const untranslatedIds = JSON.stringify(cartItems
    .filter((item) => !Object.hasOwn(item, "ar_name"))
    .map((item) => item.id));
  useEffect(() => {
    const ids = JSON.parse(untranslatedIds);
    if (!ids.length) return;
    const controller = new AbortController();
    const api = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    Promise.all(ids.map(async (id) => {
      try {
        const response = await fetch(`${api}/api/products/${encodeURIComponent(id)}`, {
          credentials: "include", signal: controller.signal,
        });
        if (!response.ok) return null;
        const product = await response.json();
        return { id, ar_name: product.ar_name ?? null };
      } catch { return null; }
    })).then((products) => {
      if (controller.signal.aborted) return;
      const translations = new Map(products.filter(Boolean).map((product) => [product.id, product]));
      if (translations.size) setCartItems((items) => items.map((item) =>
        translations.has(item.id) ? { ...item, ar_name: translations.get(item.id).ar_name } : item));
    });
    return () => controller.abort();
  }, [untranslatedIds]);

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id)

      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, ...product, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id, quantity) => {
    if (quantity < 1) {
      removeFromCart(id)
      return
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    )
  }

  const clearCart = () => setCartItems([])

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + Math.round(getProductPrice(item) * 1000) * item.quantity,
    0
  ) / 1000

  const getItemQuantity = (id) => {
    const item = cartItems.find((cartItem) => cartItem.id === id)
    return item ? item.quantity : 0
  }

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }

  return context
}
