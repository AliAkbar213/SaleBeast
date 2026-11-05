import { useLanguage } from "../contexts/LanguageContext";
import { useState, useContext } from "react"
import { AuthContext } from "../contexts/AuthContext"
import { Link, useLocation, useNavigate } from "react-router"
import { z } from "zod"

const signupSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name is Required")
    .regex(/^[\p{L}\p{M}\p{N}\s]+$/u, "Name cannot contain special characters"),
  mobile: z
    .string({ required_error: "Phone number is required" })
    .trim()
    .regex(/^\d{8}$/, "Please enter a valid mobile number"),
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address")
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Must include at least one uppercase letter")
    .regex(/[0-9]/, "Must include at least one number"),
})

const initialForm = {
  name: "",
  mobile: "",
  email: "",
  password: "",
  confirmPassword: "",
}

function EyeIcon({ isVisible }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {!isVisible && <path d="M4 4l16 16" />}
    </svg>
  )
}

function Signup() {
  const { t, errorText } = useLanguage();

  const fillDummyData = () => {
    setForm({
      name: "John Doe",
      mobile: "12345678", // Fits your 8-digit Zod regex
      email: "testuser@gmail.com",
      password: "Password123", // Meets your min 8 chars + upper + number
      confirmPassword: "Password123",
    })
    setErrors({}) // Clear any existing errors
  }

  const { updateUser } = useContext(AuthContext)

  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const navigate = useNavigate()
  const { state } = useLocation()

  const url = import.meta.env.VITE_API_URL + "/api/user/signup"

  const validate = (values) => {
    const result = signupSchema.safeParse(values)
    const nextErrors = {}

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0]
        if (field && !nextErrors[field]) nextErrors[field] = issue.message
      })
    }

    if (!values.confirmPassword) {
      nextErrors.confirmPassword = "Password confirmation is required"
    } else if (values.confirmPassword !== values.password) {
      nextErrors.confirmPassword = "Passwords do not match"
    }

    return nextErrors
  }

  const validateField = (field, values) => {
    if (field === "confirmPassword") {
      if (!values.confirmPassword) return "Password confirmation is required"
      return values.confirmPassword === values.password ? "" : "Passwords do not match"
    }

    const result = signupSchema.shape[field].safeParse(values[field])
    return result.success ? "" : result.error.issues[0].message
  }

  const setFieldError = (field, values) => {
    const message = validateField(field, values)

    setErrors((currentErrors) => {
      if (!message) {
        const nextErrors = { ...currentErrors }
        delete nextErrors[field]
        return nextErrors
      }

      return { ...currentErrors, [field]: message }
    })
  }

  const clearFieldError = (field) => {
    setErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors

      const nextErrors = { ...currentErrors }
      delete nextErrors[field]
      return nextErrors
    })
  }

  const handleChange = ({ target: { name, value } }) => {
    const nextForm = { ...form, [name]: value }
    setForm(nextForm)
    clearFieldError(name)

    if (name === "password") clearFieldError("confirmPassword")
  }

  const handleBlur = ({ target: { name } }) => setFieldError(name, form)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    const toSend = { ...form }
    delete toSend.confirmPassword

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(toSend)
    })

    const data = await res.json()

    if (!res.ok) {
      setErrors((prev) => ({
        ...prev,
        general: data.err,
      }));
    } else {
      console.log(data);
      updateUser(data)
      navigate(state?.from === "/checkout" ? "/checkout" : "/profile", { replace: true })
    }

  }

  const inputClassName = (field) =>
    `w-full rounded-md border bg-background px-4 py-3 text-base text-text-main outline-none transition duration-200 placeholder:text-text-muted/60 focus:bg-white focus:ring-2 sm:text-sm ${errors[field]
      ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
      : "border-border focus:border-primary focus:ring-primary/10"
    }`

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div aria-hidden="true" className="absolute -right-28 -top-28 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-40 -left-20 size-96 rounded-full bg-stone-300/40 blur-3xl" />
      <section className="relative grid w-full max-w-5xl overflow-hidden border border-border bg-surface shadow-xl shadow-stone-300/30 lg:grid-cols-[0.72fr_1.28fr]">
        <aside className="relative overflow-hidden bg-brand-dark p-7 text-text-light sm:p-10 lg:p-12">
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] bg-size-[48px_48px]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-orange-400">{t("Join the crew")}</p>
              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tighter">{t("Build a better setup.")}</h1>
              <p className="mt-5 text-sm leading-6 text-stone-400">{t("Create your SaleBeast account and keep your shopping experience in one place.")}</p>
            </div>
            <div className="space-y-3 border-t border-white/10 pt-6 text-xs font-medium text-stone-400">
              <p className="flex items-center gap-3"><span className="size-1.5 bg-primary" />{t("Quick and simple registration")}</p>
              <p className="flex items-center gap-3"><span className="size-1.5 bg-primary" />{t("Secure member access")}</p>
            </div>
          </div>
        </aside>

        <div className="p-6 sm:p-10 lg:p-12">
          <div className="mb-7">
            <p className="eyebrow mb-3">{t("New account")}</p>
            <h2 className="text-3xl font-black tracking-[-0.04em]">{t("Create your profile.")}</h2>
          </div>
        <button
          type="button"
          onClick={fillDummyData}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border-strong bg-surface-muted/50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-muted transition-colors hover:border-primary hover:text-primary"
        >
          <span aria-hidden="true">⚡</span> {t("Auto-fill test account")}
        </button>

        {errors.general && (
          <div className="mb-5 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {errorText(errors.general)}
          </div>
        )}

        <form className="grid gap-5 sm:grid-cols-2" noValidate onSubmit={handleSubmit}>
          <div className="sm:col-span-2">
            <label htmlFor="signup-name" className="mb-2 block text-sm font-medium text-text-main">
              {t("Full name")}
            </label>
            <input id="signup-name" name="name" type="text" autoComplete="name" placeholder={t("Full name")} value={form.name} onChange={handleChange} onBlur={handleBlur} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "signup-name-error" : undefined} className={inputClassName("name")} />
            {errors.name && <p id="signup-name-error" className="mt-1 text-sm text-red-600">{errorText(errors.name)}</p>}
          </div>

          <div>
            <label htmlFor="signup-mobile" className="mb-2 block text-sm font-medium text-text-main">
              {t("Mobile number")}
            </label>
            <input id="signup-mobile" name="mobile" type="tel" dir="ltr" inputMode="numeric" autoComplete="tel" placeholder={t("8-digit mobile number")} value={form.mobile} onChange={handleChange} onBlur={handleBlur} aria-invalid={Boolean(errors.mobile)} aria-describedby={errors.mobile ? "signup-mobile-error" : undefined} className={inputClassName("mobile")} />
            {errors.mobile && <p id="signup-mobile-error" className="mt-1 text-sm text-red-600">{errorText(errors.mobile)}</p>}
          </div>

          <div>
            <label htmlFor="signup-email" className="mb-2 block text-sm font-medium text-text-main">
              {t("Email address")}
            </label>
            <input id="signup-email" name="email" type="email" dir="ltr" autoComplete="email" placeholder={t("Enter your email")} value={form.email} onChange={handleChange} onBlur={handleBlur} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "signup-email-error" : undefined} className={inputClassName("email")} />
            {errors.email && <p id="signup-email-error" className="mt-1 text-sm text-red-600">{errorText(errors.email)}</p>}
          </div>

          <div>
            <label htmlFor="signup-password" className="mb-2 block text-sm font-medium text-text-main">
              {t("Password")}
            </label>
            <div className="relative">
              <input id="signup-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder={t("At least 8 characters")} value={form.password} onChange={handleChange} onBlur={handleBlur} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "signup-password-error" : undefined} className={`${inputClassName("password")} pe-12`} />
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-md text-text-muted transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25" aria-label={showPassword ? t("Hide password") : t("Show password")}>
                <EyeIcon isVisible={showPassword} />
              </button>
            </div>
            {errors.password && <p id="signup-password-error" className="mt-1 text-sm text-red-600">{errorText(errors.password)}</p>}
          </div>

          <div>
            <label htmlFor="signup-confirm-password" className="mb-2 block text-sm font-medium text-text-main">
              {t("Confirm password")}
            </label>
            <div className="relative">
              <input id="signup-confirm-password" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" placeholder={t("Re-enter your password")} value={form.confirmPassword} onChange={handleChange} onBlur={handleBlur} aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? "signup-confirm-password-error" : undefined} className={`${inputClassName("confirmPassword")} pe-12`} />
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setShowConfirmPassword((visible) => !visible)} className="absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-md text-text-muted transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25" aria-label={showConfirmPassword ? t("Hide password confirmation") : t("Show password confirmation")}>
                <EyeIcon isVisible={showConfirmPassword} />
              </button>
            </div>
            {errors.confirmPassword && <p id="signup-confirm-password-error" className="mt-1 text-sm text-red-600">{errorText(errors.confirmPassword)}</p>}
          </div>

          <button type="submit" className="w-full rounded-md bg-primary px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover active:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:col-span-2">
            {t("Create account")}
          </button>
        </form>

        <p className="mt-7 border-t border-border pt-6 text-center text-sm text-text-muted">
          {t("Already have an account?")}{" "}
          <Link to="/Login" state={state?.from === "/checkout" ? { from: "/checkout" } : undefined} className="font-bold text-primary underline-offset-4 hover:underline">
            {t("Log in")}
          </Link>
        </p>
        </div>
      </section>
    </main>
  )
}

export default Signup
