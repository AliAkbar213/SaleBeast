const pool = require("../../dbConnection")
const bcrypt = require("bcrypt")
const { z } = require("zod")

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
    .regex(/[A-Z]/, "must contain at least one capital letter")
    .regex(/[0-9]/, "must contain at least one number"),
})

const saveSession = (req, res, sessionUser) => {
  req.session.user = sessionUser

  req.session.save((err) => {
    if (err) {
      return res.status(500).json({ err: "Session save failed" })
    }

    res.json(sessionUser)
  })
}

const loginUser = async (req, res) => {
  const validation = loginSchema.safeParse(req.body)

  if (!validation.success) {
    const errorMsg = validation.error.issues[0].message
    return res.status(400).json({ err: errorMsg })
  }

  const { email, password } = validation.data

  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = $1",
      [email]
    )

    const user = rows[0]

    if (!user) {
      return res.status(400).json({ err: "user does not exist" })
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash)

    if (!passwordMatch) {
      return res.status(400).json({ err: "password incorrect" })
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
    }

    saveSession(req, res, sessionUser)
  } catch (err) {
    res.status(400).json({ err: err.message })
  }
}

const signupUser = async (req, res) => {
  const validation = signupSchema.safeParse(req.body)
  if (!validation.success) {
    const errorMsg = validation.error.issues[0].message
    return res.status(400).json({ err: errorMsg })
  }

  const { name, mobile, email, password } = validation.data


  try {
    const { rows: existingUsers } = await pool.query(
      "SELECT email FROM users WHERE email = $1 OR mobile = $2",
      [email, mobile]
    )

    if (existingUsers.length > 0) {
      return res.status(400).json({ err: "Email or mobile number already in use" })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const { rows } = await pool.query(
      "INSERT INTO users (name, mobile, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, parseInt(mobile), email, password_hash]
    )

    const id = rows[0].id

    const sessionUser = { id, name, email }

    saveSession(req, res, sessionUser)
  } catch (err) {
    res.status(400).json({ err: err.message })
  }
}

const getUser = (req, res) => {
  if (!req.session.user) {
    return res.status(400).json({ err: "no session detected" })
  }

  res.status(200).json(req.session.user)
}

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.json({ err: "could not log out at the moment" })
    }

    res.clearCookie("connect.sid")
    res.json({ mssg: "logout successful" })
  })
}

module.exports = {
  loginUser,
  signupUser,
  getUser,
  logout,
}
