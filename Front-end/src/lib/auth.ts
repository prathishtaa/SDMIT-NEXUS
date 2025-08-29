export interface User {
  email: string
  name: string
  role: 'student' | 'lecturer' | 'admin'
  usn?: string
  year?: number
  branch?: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

class AuthService {
  private static instance: AuthService
  private authState: AuthState = {
    user: null,
    isAuthenticated: false
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  detectRole(email: string): 'student' | 'lecturer' | 'admin' {
    if (email.endsWith('@admin.sdmit.in')) return 'admin'
    if (email.endsWith('@sdmit.in')) return 'student'
    if (email.endsWith('@gmail.com')) return 'lecturer'
    return 'student' // default
  }

  parseUSN(usn: string) {
    const year = parseInt(usn.substring(4, 6)) 
    const branchCode = usn.substring(6, 8) 
    
    const branchMap: Record<string, string> = {
      'AD': 'Artificial Intelligence & Data Science',
      'CS': 'Computer Science',
      'IS': 'Information Science',
      'CV': 'Civil',
      'EC': 'Electronics & Communication',
      'EE': 'Electrical & Electronics'
    }

    // Calculate current year (2025 - (2000 + 22) = 3rd year, but assuming 4th year for 22)
    const currentYear = year === 22 ? 4 : 
                       year === 23 ? 3 : 
                       year === 24 ? 2 : 1

    return {
      year: currentYear,
      branch: branchMap[branchCode] || 'Unknown'
    }
  }

  login(email: string, password: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const role = this.detectRole(email)
        
        // Admin check
        if (email.endsWith('@admin.sdmit.in') && password === 'admin123') {
          this.authState = {
            user: { email, name: 'Admin', role: 'admin' },
            isAuthenticated: true
          }
          resolve(true)
          return
        }

        // Simple validation for demo
        if (password.length >= 6) {
          // Try to get stored user data from localStorage
          const storedUserData = localStorage.getItem(`user_${email}`)
          let userName = email.split('@')[0] // fallback to email prefix
          
          if (storedUserData) {
            try {
              const parsedData = JSON.parse(storedUserData)
              userName = parsedData.name || userName
            } catch (error) {
              console.error('Error parsing stored user data:', error)
            }
          }
          
          let userData: User = { email, name: userName, role }
          
          // If student, parse USN data (assuming USN is in localStorage from signup)
          if (role === 'student') {
            const usn = localStorage.getItem(`usn_${email}`)
            if (usn) {
              const { year, branch } = this.parseUSN(usn)
              userData = { ...userData, usn, year, branch }
            }
          }

          this.authState = {
            user: userData,
            isAuthenticated: true
          }
          resolve(true)
        } else {
          resolve(false)
        }
      }, 500)
    })
  }

  register(name: string, email: string, password: string, usn: string,year: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Store USN for later use
        localStorage.setItem(`usn_${email}`, usn)
        localStorage.setItem(`user_${email}`, JSON.stringify({ name, email, usn }))
        resolve(true)
      }, 500)
    })
  }

  logout(): void {
    this.authState = {
      user: null,
      isAuthenticated: false
    }
  }

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