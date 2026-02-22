"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { UserProfile } from "./types"
import { DUMMY_PROFILES } from "./dummy-profiles"

const AUTH_STORAGE_KEY = "pt_current_user"

interface AuthContextType {
  user: UserProfile | null
  login: (email: string) => boolean
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function loadUserFromStorage(): UserProfile | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) return null
    const userId = JSON.parse(stored)
    return DUMMY_PROFILES.find((p) => p.id === userId) || null
  } catch {
    return null
  }
}

function saveUserToStorage(userId: string | null) {
  if (typeof window === "undefined") return
  try {
    if (userId) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userId))
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  } catch {
    // Ignore storage errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    // Load user from localStorage on mount
    const savedUser = loadUserFromStorage()
    if (savedUser) {
      setUser(savedUser)
    }
  }, [])

  const login = (email: string): boolean => {
    const foundUser = DUMMY_PROFILES.find((p) => p.email.toLowerCase() === email.toLowerCase())
    if (foundUser) {
      setUser(foundUser)
      saveUserToStorage(foundUser.id)
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    saveUserToStorage(null)
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
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

