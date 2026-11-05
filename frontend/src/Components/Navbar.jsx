import { useLanguage } from "../contexts/LanguageContext";
import { Link, NavLink } from "react-router"
import { useCart } from "../contexts/CartContext"
import { useContext, useEffect, useState } from "react"
import { AuthContext } from "../contexts/AuthContext"

function HomeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  )
}

function ProductsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
      />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
      />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.118a7.5 7.5 0 0 1 15 0A9.002 9.002 0 0 1 12 21a9.002 9.002 0 0 1-7.5-.882Z"
      />
    </svg>
  )
}

function NavItem({ to, label, icon: Icon, badge }) {
  return (
    <NavLink to={to} aria-label={label} className="relative rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      {({ isActive }) => (
        <span
          className={`flex h-11 w-10 items-center justify-center gap-2.5 rounded-md border text-sm font-medium transition-colors duration-200 ease-out sm:w-auto sm:px-3 lg:px-4 ${isActive
            ? "border-primary/40 bg-primary/15 text-orange-400"
            : "border-transparent text-stone-300 hover:border-white/15 hover:bg-white/5 hover:text-white"
            }`}
        >
          <Icon />
          <span
            className={`hidden whitespace-nowrap sm:inline ${isActive
              ? "text-orange-400"
              : "text-inherit"
              }`}
          >
            {label}
          </span>
          {badge}
        </span>
      )}
    </NavLink>
  )
}

function Navbar() {
  const { t, language, setLanguage, isArabic } = useLanguage();
  const { cartCount } = useCart()
  const { user } = useContext(AuthContext)

  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY <= 10) {
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  return (
    <nav
      aria-label={t("Main navigation")}
      className={`fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/10 bg-brand-dark/95 text-text-light backdrop-blur-xl transition-transform duration-200 ease-out motion-reduce:transition-none ${isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
    >
      <div className="page-container flex h-full items-center justify-between gap-2 sm:gap-3 lg:gap-6">
        <Link to="/" dir="ltr" className="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:gap-3.5" aria-label="SaleBeast">
          <img src="/salebeast-mark.png" alt="" className="size-7 rounded-md object-cover sm:size-9" />
          <span className="hidden text-sm font-bold tracking-tight min-[420px]:inline lg:text-xl">SALE<span className="text-orange-400">BEAST</span></span>
        </Link>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 lg:gap-3 xl:gap-5">
          <NavItem to="/" label={t("Home")} icon={HomeIcon} />
          <NavItem to="/products" label={t("Products")} icon={ProductsIcon} />
          <NavItem
            to="/cart"
            label={t("Cart")}
            icon={CartIcon}
            badge={
              cartCount > 0 && (
                <span
                  key={cartCount}
                  className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-brand-dark bg-primary px-1 text-[10px] font-bold text-white"
                >
                  {cartCount}
                </span>
              )
            }
          />
          <NavItem to={user ? "/profile" : "/login"} label={t("Profile")} icon={ProfileIcon} />
          <button
            type="button"
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            aria-label={t(isArabic ? "Switch to English" : "Switch to Arabic")}
            lang={isArabic ? "en" : "ar"}
            className="min-h-11 shrink-0 rounded-md border border-white/20 px-2 text-xs font-semibold text-white transition-colors hover:bg-white/10 sm:px-3 sm:text-sm"
          >
            {isArabic ? "EN" : "العربية"}
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
