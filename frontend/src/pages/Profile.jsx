import { useLanguage } from "../contexts/LanguageContext";
import { useContext, useState } from "react"
import { Link } from "react-router"
import { AuthContext } from "../contexts/AuthContext"
import ProfileOrders from "../Components/ProfileOrders"

function Icon({ children, className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      {children}
    </svg>
  )
}

function Profile() {
  const { t, errorText } = useLanguage();
  const { user, updateUser } = useContext(AuthContext)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [error, setError] = useState("")

  const handleLogout = async () => {
    setIsLoggingOut(true)
    setError("")
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user/logout`, { credentials: "include" })
      if (!response.ok) throw new Error("Unable to sign out right now.")
      updateUser(null)
    } catch (logoutError) {
      setError(logoutError.message || "Unable to sign out right now.")
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (!user) {
    return (
      <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-brand-dark px-4 py-10 text-text-light sm:px-6 sm:py-16 lg:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.05] bg-[linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] bg-size-[56px_56px]" />
        <section className="relative w-full max-w-xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-orange-400">
            <Icon className="h-8 w-8"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.118a7.5 7.5 0 0 1 15 0A9.002 9.002 0 0 1 12 21a9.002 9.002 0 0 1-7.5-.882Z" /></Icon>
          </div>
          <p className="mt-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-orange-400">{t("Member area")}</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">{t("Your SaleBeast profile.")}</h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-stone-400">{t("Log in to view your account details and keep your setup moving forward.")}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/Login" className="rounded-md bg-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover active:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25">{t("Log in")}</Link>
            <Link to="/Signup" className="rounded-md border border-white/20 px-6 py-3 text-sm font-bold text-white transition-colors hover:border-white/40 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">{t("Create account")}</Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <header className="relative overflow-hidden bg-brand-dark text-text-light">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.05] bg-[linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] bg-size-[56px_56px]" />
        <div className="page-container relative py-12 sm:py-16">
          <p className="flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-orange-400"><span className="h-px w-8 bg-primary" />{t("My account")}</p>
          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tighter sm:text-5xl">{t("Your profile.")}</h1>
              <p className="mt-3 text-sm text-stone-400 sm:text-base">{t("Your SaleBeast account details, all in one place.")}</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-orange-400"><span className="size-1.5 bg-primary" />{t("Session active")}</span>
          </div>
        </div>
        </header>

      <div className="page-container py-10 sm:py-14">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,.8fr)]">
          <section className="overflow-hidden border border-border bg-surface shadow-sm">

            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div><p className="eyebrow mb-2">{t("Identity")}</p><h2 className="text-2xl font-black tracking-[-0.03em] text-text-main">{t("Account details")}</h2><p className="mt-2 text-sm text-text-muted">{t("Your registered account information.")}</p></div>
              </div>

              <dl className="mt-7 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
                <DetailRow label={t("Full name")} value={user.name || t("Not provided")}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.118a7.5 7.5 0 0 1 15 0A9.002 9.002 0 0 1 12 21a9.002 9.002 0 0 1-7.5-.882Z" /></DetailRow>
                <DetailRow label={t("Email address")} value={user.email || t("Not provided")}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0l-7.5-4.615A2.25 2.25 0 0 1 2.25 6.993V6.75" /></DetailRow>
              </dl>
            </div>
          </section>

          <section className="border border-border bg-surface p-6 shadow-sm sm:p-8">
            <span className="mb-5 flex size-11 items-center justify-center rounded-md bg-primary-soft text-primary"><Icon><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75m-.75 0h10.5A2.25 2.25 0 0 1 19.5 12.75v6A2.25 2.25 0 0 1 17.25 21H6.75A2.25 2.25 0 0 1 4.5 18.75v-6a2.25 2.25 0 0 1 2.25-2.25Z" /></Icon></span>
            <h2 className="text-lg font-black text-text-main">{t("Signed in securely")}</h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">{t("Sign out on shared devices to keep your account private.")}</p>
            {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{errorText(error)}</p>}
            <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="mt-6 w-full rounded-md border border-border-strong bg-surface px-6 py-3 text-sm font-bold text-text-main transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60">{isLoggingOut ? t("Signing out…") : t("Sign out")}</button>
          </section>
        </div>
        <ProfileOrders key={user.id} />
      </div>
    </main>
  )
}

function DetailRow({ label, value, children }) {
  return (
    <div className="flex min-w-0 items-center gap-4 bg-surface p-5 sm:p-6">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary"><Icon>{children}</Icon></span>
      <div className="min-w-0"><dt className="text-sm font-medium text-text-muted">{label}</dt><dd className="mt-1 wrap-break-word text-sm font-medium text-text-main sm:text-base">{value}</dd></div>
    </div>
  )
}

export default Profile
