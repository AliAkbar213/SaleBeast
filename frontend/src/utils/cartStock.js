export function getAvailableStock(product) {
  const stock = Number(product.stock)
  return Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0
}

export function limitCartQuantity(product, quantity) {
  const requested = Number(quantity)
  return Number.isFinite(requested)
    ? Math.min(getAvailableStock(product), Math.max(0, Math.floor(requested)))
    : 0
}

export function addCartItem(items, product) {
  const existing = items.find((item) => item.id === product.id)
  const quantity = limitCartQuantity(product, Number(existing?.quantity || 0) + 1)
  if (!quantity) return items.filter((item) => item.id !== product.id)
  if (!existing) return [...items, { ...product, quantity }]
  return items.map((item) => item.id === product.id
    ? { ...item, ...product, quantity }
    : item)
}

export function setCartItemQuantity(items, id, requested) {
  return items.flatMap((item) => {
    if (item.id !== id) return [item]
    const quantity = limitCartQuantity(item, requested)
    return quantity ? [{ ...item, quantity }] : []
  })
}
