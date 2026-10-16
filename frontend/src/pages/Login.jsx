import { useContext } from "react"
import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { z } from "zod"
import { AuthContext } from "../contexts/AuthContext"

const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address")
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
})

const initialForm = {
  email: "",
  password: "",
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

function Login() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { updateUser } = useContext(AuthContext)
  const navigate = useNavigate()

  const url = import.meta.env.VITE_API_URL + "/api/user/login"

  const fillDummyData = () => {
    setForm({
      email: "testuser@gmail.com",
      password: "Password123",
    })
    setErrors({})
  }

  const validate = (values) => {
    const result = loginSchema.safeParse(values)
    const nextErrors = {}

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0]
        if (field && !nextErrors[field]) nextErrors[field] = issue.message
      })
    }

    return nextErrors
  }

  const validateField = (field, values) => {
    const result = loginSchema.shape[field].safeParse(values[field])
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
  }

  const handleBlur = ({ target: { name } }) => setFieldError(name, form)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    const nextErrors = validate(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form)
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.err == "user does not exist") {
          setErrors((prev) => ({ ...prev, email: "User does not exist" }))
        } else if (data.err == "password incorrect") {
          setErrors((prev) => ({ ...prev, password: "Password is incorrect" }))
        } else {
          setErrors((prev) => ({ ...prev, general: data.err || "Something went wrong" }))
        }
        console.log(data);
      } else {
        console.log(data);
        updateUser(data)
        navigate('/profile')
      }
    } catch {
      setErrors((prev) => ({ ...prev, general: "Unable to log in right now. Please try again." }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClassName = (field) =>
    `w-full rounded-md border bg-background px-4 py-3.5 text-base text-text-main outline-none transition duration-200 placeholder:text-text-muted/60 focus:bg-white focus:ring-2 sm:text-sm ${errors[field]
      ? "border-red-500 focus:border-red-500 focus:ring-red-500/10"
      : "border-border focus:border-primary focus:ring-primary/10"
    }`

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-brand-dark text-text-light">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.05] bg-[linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] bg-size-[56px_56px]" />
      <div className="page-container relative grid min-h-[calc(100vh-4rem)] items-stretch lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden flex-col justify-between border-r border-white/10 py-16 pr-12 lg:flex">
          <div>
            <p className="flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-orange-400"><span className="h-px w-8 bg-primary" />Member access</p>
            <h1 className="mt-8 max-w-md font-display text-5xl font-black leading-[1.02] tracking-[-0.055em]">Your setup is waiting.</h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-stone-400">Sign in to get back to the gear, accessories, and upgrades you have been eyeing.</p>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone-500">SaleBeast / Secure account</div>
        </section>

        <section className="flex items-center justify-center py-10 sm:py-16 lg:justify-end lg:pl-14">
          <div className="w-full max-w-lg border border-white/10 bg-white p-6 text-text-main shadow-2xl shadow-black/30 sm:p-10">
            <div className="mb-8">
              <p className="eyebrow mb-3">Welcome back</p>
              <h2 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">Log in to SaleBeast.</h2>
              <p className="mt-3 text-sm leading-6 text-text-muted">Enter your details to continue shopping.</p>
            </div>

            <button
              type="button"
              onClick={fillDummyData}
              disabled={isSubmitting}
              className="mb-6 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border-strong bg-surface-muted/50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <span aria-hidden="true">⚡</span> Auto-fill test account
            </button>

            <form className="space-y-5" noValidate onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <div>
            <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-text-main">
              Email address
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              className={inputClassName("email")}
            />
            {errors.email && <p id="login-email-error" className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label htmlFor="login-password" className="block text-sm font-medium text-text-main">
                Password
              </label>
              <a href="#forgot-password" className="text-xs font-bold text-primary underline-offset-4 hover:underline">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "login-password-error" : undefined}
                className={`${inputClassName("password")} pr-12`}
              />
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={isSubmitting}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-md text-text-muted transition-colors duration-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon isVisible={showPassword} />
              </button>
            </div>
            {errors.password && <p id="login-password-error" className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-primary px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover active:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Logging in…" : "Log in"}
              </button>
            </form>

            <p className="mt-7 border-t border-border pt-6 text-center text-sm text-text-muted">
              New to SaleBeast?{" "}
              <Link to="/Signup" className="font-bold text-primary underline-offset-4 hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default Login
