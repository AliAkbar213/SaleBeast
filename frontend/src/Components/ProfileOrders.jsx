import { useEffect, useState } from "react"
import { Link } from "react-router"
import { useLanguage } from "../contexts/LanguageContext"

export default function ProfileOrders() {
  const { t, language, formatPrice } = useLanguage()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadOrders() {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/order`, {
          credentials: "include",
          signal: controller.signal,
        })
        if (response.status === 401) throw new Error("Please log in again to view your orders.")
        if (!response.ok) throw new Error("Unable to load your orders. Please try again.")
        const data = await response.json()
        if (!Array.isArray(data)) throw new Error("Invalid orders response")
        if (!controller.signal.aborted) setOrders(data)
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError.message === "Please log in again to view your orders."
            ? loadError.message : "Unable to load your orders. Please try again.")
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadOrders()
    return () => controller.abort()
  }, [attempt])

  const retry = () => {
    setError("")
    setIsLoading(true)
    setAttempt((value) => value + 1)
  }

  const formatDate = (value) => {
    const date = value ? new Date(value) : null
    return date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat(language === "ar" ? "ar-KW" : "en-KW", { dateStyle: "medium" }).format(date)
      : t("Not provided")
  }

  return (
    <section aria-labelledby="profile-orders-title" aria-busy={isLoading} className="mt-6 border border-border bg-surface p-6 shadow-sm sm:p-8">
      <p className="eyebrow mb-2">{t("Order history")}</p>
      <h2 id="profile-orders-title" className="text-2xl font-black tracking-[-0.03em] text-text-main">{t("Your orders")}</h2>
      <p className="mt-2 text-sm text-text-muted">{t("View all orders placed with your account, newest first.")}</p>

      {isLoading ? (
        <p role="status" className="mt-6 text-sm text-text-muted">{t("Loading your orders…")}</p>
      ) : error ? (
        <div role="alert" className="mt-6">
          <p className="text-sm text-red-600">{t(error)}</p>
          {error === "Please log in again to view your orders." ? (
            <Link to="/Login" className="mt-3 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover">{t("Log in")}</Link>
          ) : (
            <button type="button" onClick={retry} className="mt-3 rounded-md border border-border-strong px-4 py-2 text-sm font-bold text-text-main hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25">{t("Try again")}</button>
          )}
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-6 border border-dashed border-border p-6 text-center">
          <p className="font-bold text-text-main">{t("No orders yet")}</p>
          <p className="mt-2 text-sm text-text-muted">{t("Your orders will appear here after checkout.")}</p>
          <Link to="/products" className="mt-4 inline-flex rounded-md bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-hover">{t("Continue shopping")}</Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4">
          {orders.map((order) => (
            <li key={order.id} className="border border-border p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-bold text-text-main">{t("Order #{id}", { id: order.id })}</h3>
                <span className="rounded-md bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">{order.status?.trim() ? t(order.status) : t("Status not available")}</span>
              </div>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                <div><dt className="text-text-muted">{t("Order date")}</dt><dd className="mt-1 font-medium text-text-main">{formatDate(order.created_at)}</dd></div>
                <div><dt className="text-text-muted">{t("Delivery charge")}</dt><dd className="mt-1 font-medium text-text-main">{formatPrice(order.delivery_charge)}</dd></div>
                <div><dt className="text-text-muted">{t("Total")}</dt><dd className="mt-1 font-bold text-text-main">{order.total == null ? t("Not provided") : formatPrice(order.total)}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
