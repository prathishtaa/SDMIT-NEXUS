import api from "@/services/api"

export interface User {
  email: string
  name: string
  role: "student" | "lecturer" | "admin"
  usn?: string
  year?: string
  branch?: string
  group_id?: number
  groups?: number[]   // for lecturer
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  token: string | null
}

class AuthService {
  private static instance: AuthService
  private authState: AuthState = {
    user: null,
    isAuthenticated: false,
    token: null,
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /** 🔐 Login with backend */
  async login(email: string, password: string): Promise<boolean> {
    try {
      const res = await api.post("login/auth-login", { email, password })

      const { token, user } = res.data

      // Save in localStorage for persistence
      localStorage.setItem("auth_token", token)
      localStorage.setItem("user_data", JSON.stringify(user))

      this.authState = {
        user,
        isAuthenticated: true,
        token,
      }

      return true
    } catch (err) {
      console.error("Login failed", err)
      return false
    }
  }

  /** 🚪 Logout */
  logout(): void {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")

    this.authState = {
      user: null,
      isAuthenticated: false,
      token: null,
    }
  }

  /** 🔄 Restore auth state from localStorage on app reload */
  restoreAuth(): void {
    const token = localStorage.getItem("auth_token")
    const userData = localStorage.getItem("user_data")

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        this.authState = {
          user: parsedUser,
          isAuthenticated: true,
          token,
        }
      } catch (err) {
        console.error("Failed to parse stored user data", err)
      }
    }
  }

  /** ✅ Getters */
  getAuthState(): AuthState {
    return this.authState
  }

  isAuthenticated(): boolean {
    return this.authState.isAuthenticated
  }

  getCurrentUser(): User | null {
    return this.authState.user
  }
}

export const authService = AuthService.getInstance()
