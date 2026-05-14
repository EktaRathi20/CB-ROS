import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// Fixed demo accounts. The same password unlocks all of them so judges can
// pick any role to explore. There is no real auth — this is mock-only.
export const DEMO_PASSWORD = 'cbros2026'

export const mockUsers = [
  {
    id: 'ri',
    name: 'Dr. R. Iyer',
    role: 'Senior Scientist',
    org: 'IISc Catalysis Lab',
    email: 'r.iyer@cb-ros.dev',
    initials: 'RI',
    tone: 'emerald'
  },
  {
    id: 'as',
    name: 'Dr. A. Sharma',
    role: 'Bio-process Lead',
    org: 'GPS Renewables',
    email: 'a.sharma@cb-ros.dev',
    initials: 'AS',
    tone: 'amber'
  },
  {
    id: 'demo',
    name: 'Demo User',
    role: 'Researcher',
    org: 'Sandbox',
    email: 'demo@cb-ros.dev',
    initials: 'DU',
    tone: 'cyan'
  }
]

const STORAGE_KEY = 'cbros_auth_user'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore storage failures (private mode etc.)
    }
  }, [user])

  const signInAs = useCallback((u) => setUser(u), [])

  // Email + password mock check. Returns the user record on success.
  const signInWithCredentials = useCallback((email, password) => {
    const found = mockUsers.find((u) => u.email.toLowerCase() === (email || '').trim().toLowerCase())
    if (!found) throw new Error('No account found for that email.')
    if (password !== DEMO_PASSWORD) throw new Error('Incorrect password.')
    setUser(found)
    return found
  }, [])

  const signOut = useCallback(() => setUser(null), [])

  const value = useMemo(
    () => ({ user, signInAs, signInWithCredentials, signOut }),
    [user, signInAs, signInWithCredentials, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
