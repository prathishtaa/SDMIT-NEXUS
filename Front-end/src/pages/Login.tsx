import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { useNavigate } from "react-router-dom"
import { authService } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Mail, Lock } from "lucide-react"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [detectedRole, setDetectedRole] = useState<'student' | 'lecturer' | 'admin' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    if (email) {
      const role = authService.detectRole(email)
      setDetectedRole(role)
    } else {
      setDetectedRole(null)
    }
  }, [email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const success = await authService.login(email, password)
      
      if (success) {
        const user = authService.getCurrentUser()
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${user?.name}!`,
        })

        // Route based on actual role detected
        switch (user?.role) {
          case 'student':
            navigate('/student-dashboard')
            break
          case 'lecturer':
            navigate('/lecturer-groups')
            break
          case 'admin':
            navigate('/admin-panel')
            break
          default:
            navigate('/student-dashboard')
        }
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid credentials. Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleDisplayInfo = () => {
    switch (detectedRole) {
      case 'student':
        return { text: "Detected as Student", color: "text-primary" }
      case 'lecturer':
        return { text: "Detected as Lecturer", color: "text-green-600" }
      case 'admin':
        return { text: "Detected as Admin", color: "text-orange-600" }
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar showBack backTo="/" />
      
      <main className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-medium">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Welcome Back
            </CardTitle>
            <CardDescription>
              Sign in to your SDMIT Nexus account
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                {getRoleDisplayInfo() && (
                  <p className={`text-xs font-medium ${getRoleDisplayInfo()?.color}`}>
                    {getRoleDisplayInfo()?.text}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  @sdmit.in for students, @gmail.com for lecturers, @admin.sdmit.in for admin
                </p>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              {/* Forgot Password Link */}
              <div className="text-right">
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm text-primary"
                  onClick={() => navigate('/forgot-password')}
                >
                Forgot Password?
              </Button>
              </div>

              {/* Demo Credentials Info */}
              <div className="p-3 bg-primary-light rounded-lg">
                <p className="text-xs text-primary font-medium">Demo Credentials:</p>
                <p className="text-xs text-primary">Admin: admin@admin.sdmit.in / admin123</p>
                <p className="text-xs text-primary">Use any email + 6+ char password for Student/Lecturer</p>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full bg-gradient-primary hover:opacity-90" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              {/* Sign Up Link */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto font-medium text-primary"
                    onClick={() => navigate('/signup')}
                  >
                    Sign up
                  </Button>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}