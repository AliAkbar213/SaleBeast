import { createContext, useEffect, useState } from "react";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext()

export function AuthProvider({ children }) {

  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const url = import.meta.env.VITE_API_URL

  const updateUser = (newUser) => {
    console.log(newUser);

    setUser(newUser)
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${url}/api/user/profile`, { credentials: "include" })
        if (!res.ok) return
        const data = await res.json()
        updateUser(data)
      } catch {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  },[url])

  return (
    <AuthContext.Provider value={{ user, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
