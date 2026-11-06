import { createContext, useContext, useEffect, useState } from "react"
import { getProductPrice } from "../utils/productPrice"
import { addCartItem, limitCartQuantity, setCartItemQuantity } from "../utils/cartStock"

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem("cart")
    if (!saved) return []
    return JSON.parse(saved).flatMap((item) => {
      const quantity = limitCartQuantity(item, item.quantity)
      return quantity ? [{ ...item, quantity }] : []
    })
  })

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems))
  }, [cartItems])

  // Refresh saved stock and translations using the existing read-only product API.
  const cartIds = JSON.stringify(cartItems.map((item) => item.id));
  useEffect(() => {
    const ids = JSON.parse(cartIds);
    if (!ids.length) return;
    const controller = new AbortController();
    const api = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    Promise.all(ids.map(async (id) => {
      try {
        const response = await fetch(`${api}/api/products/${encodeURIComponent(id)}`, {
          credentials: "include", signal: controller.signal,
        });
        if (response.status === 404) return { id, stock: 0 };
        if (!response.ok) return null;
        const product = await response.json();
        return { id, stock: product.stock, ar_name: product.ar_name ?? null };
      } catch { return null; }
    })).then((products) => {
      if (controller.signal.aborted) return;
      const refreshed = new Map(products.filter(Boolean).map((product) => [product.id, product]));
      if (refreshed.size) setCartItems((items) => items.flatMap((item) => {
        if (!refreshed.has(item.id)) return [item];
        const updated = { ...item, ...refreshed.get(item.id) };
        const quantity = limitCartQuantity(updated, item.quantity);
        return quantity ? [{ ...updated, quantity }] : [];
      }));
    });
    return () => controller.abort();
  }, [cartIds]);

  const addToCart = (product) => {
    setCartItems((prev) => addCartItem(prev, product))
  }

  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id, quantity) => {
    setCartItems((prev) => setCartItemQuantity(prev, id, quantity))
  }

  const clearCart = () => setCartItems([])

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + Math.round(getProductPrice(item) * 1000) * item.quantity,
    0
  ) / 1000

  const cartFullTotal = cartItems.reduce(
    (sum, item) => sum + Math.round(Number(item.price) * 1000) * item.quantity,
    0
  ) / 1000
  const cartDiscountTotal = (Math.round(cartFullTotal * 1000) - Math.round(cartTotal * 1000)) / 1000

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
        cartFullTotal,
        cartDiscountTotal,
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
