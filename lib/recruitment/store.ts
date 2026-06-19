'use client'
import { create } from 'zustand'

/**
 * In-memory only — no localStorage persistence. Auth identity lives in the
 * `user_id` cookie smart_hr_web's sid login sets; this store exists only
 * because some copied recruitment components still call `.logout()` on it.
 */
interface AuthState {
  user: string | null
  isAuthenticated: boolean
  login: (user: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}))
