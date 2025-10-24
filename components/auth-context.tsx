"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface User {
  id: string
  username: string
  name: string
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => boolean
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const users: { [key: string]: { password: string; name: string } } = {
  vale: { password: "ipro1234", name: "Vale" },
  riki: { password: "ipro1234", name: "Riki" },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const login = (username: string, password: string): boolean => {
    console.log("[v0] Login attempt - username:", username, "password:", password)
    console.log("[v0] Available users:", Object.keys(users))

    const userData = users[username.toLowerCase()]
    console.log("[v0] User data found:", userData)

    if (userData && userData.password === password) {
      console.log("[v0] Login successful!")
      const newUser: User = {
        id: username.toLowerCase(),
        username: username.toLowerCase(),
        name: userData.name,
      }
      setUser(newUser)
      localStorage.setItem("currentUser", JSON.stringify(newUser))
      return true
    }
    console.log("[v0] Login failed - credentials don't match")
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("currentUser")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
