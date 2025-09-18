import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { Loader2, User, Mail, Lock, IdCard } from "lucide-react"
import OTPVerification from "@/components/otp-verification"
import api from "@/services/api"

type SignupStep = "email" | "otp" | "details"

const getBranchFromUSN = (usn: string): string => {
  if (!usn || usn.length < 7) return ""

  const branchCode = usn.substring(5, 7).toUpperCase()

  switch (branchCode) {
    case "AD": return "Artificial Intelligence and Data Science"
    case "CS": return "Computer Science"
    case "IS": return "Information Science"
    case "CV": return "Civil Engineering"
    case "EE": return "Electrical and Electronics"
    case "EC": return "Electronics and Communication"
    default: return "Unknown Branch"
  }
}

export default function SignUp() {
  const [currentStep, setCurrentStep] = useState<SignupStep>("email")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    usn: "",
    year: ""
  })
  const [branch, setBranch] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateEmail = () => {
    if (!formData.email.endsWith('@sdmit.in') ) {
      toast({
        title: "Invalid Email",
        description: "Please use your SDMIT email (@sdmit.in) to sign up.",
        variant: "destructive"
      })
      return false
    }
    return true
  }

  const validateDetailsForm = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Invalid Name",
        description: "Please enter your full name.",
        variant: "destructive"
      })
      return false
    }

    if (formData.password.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      })
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please ensure both passwords are identical.",
        variant: "destructive"
      })
      return false
    }

    if (formData.email.endsWith('@sdmit.in') && !/^4SU\d{2}[A-Z]{2}\d{3}$/.test(formData.usn)) {
      toast({
        title: "Invalid USN",
        description: "USN must follow format: 4SU22AD0**",
        variant: "destructive"
      })
      return false
    }

    return true
  }
  
const handleEmailSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!validateEmail()) return

  setIsLoading(true)
  try {
    // call backend to send OTP
    await api.post("/auth/send-otp", { email: formData.email })

    toast({
      title: "OTP Sent",
      description: "Please check your email for the verification code."
    })
    setCurrentStep("otp")
  } catch (error: any) {
    toast({
      title: "Failed to Send OTP",
      description: error.response?.data?.message || "Something went wrong.",
      variant: "destructive",
    })
  } finally {
    setIsLoading(false)
  }
}
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateDetailsForm()) return

    setIsLoading(true)

    try {
      
      const detectedBranch = getBranchFromUSN(formData.usn)
      setBranch(detectedBranch)

      toast({
        title: "Account Info Collected",
        description: "Proceeding to face registration...",
      })

      navigate("/face-registration", {
        state: {
          userData: {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            usn: formData.usn,
            branch: detectedBranch,
            year: formData.year
          },
        },
      })
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (currentStep === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Navbar showBack backTo="/" />
        
        <main className="container mx-auto px-4 py-16 flex items-center justify-center">
          <OTPVerification 
            email={formData.email}
            onVerified={() => setCurrentStep('details')}
            onBack={() => setCurrentStep('email')}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar showBack backTo="/" />
      
      <main className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-medium">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {currentStep === 'email' ? 'Create Account' : 'Complete Registration'}
            </CardTitle>
            <CardDescription>
              {currentStep === 'email' 
                ? 'Join SDMIT Nexus - Students & Admin Only' 
                : 'Enter your details to complete registration'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {currentStep === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="yourusn@sdmit.in"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use your SDMIT email (@sdmit.in)
                  </p>
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
                      Sending OTP...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>

                {/* Login Link */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Button
                      variant="link"
                      className="p-0 h-auto font-medium text-primary"
                      onClick={() => navigate('/login')}
                    >
                      Sign in
                    </Button>
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleDetailsSubmit} className="space-y-6">
                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters
                  </p>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                {/* USN Field (only for students) */}
{formData.email.endsWith('@sdmit.in') && (
  <div className="space-y-2">
    <Label htmlFor="usn">USN</Label>
    <div className="relative">
      <IdCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input
        id="usn"
        type="text"
        placeholder="4SU**{branch}***"
        value={formData.usn}
        onChange={(e) => {
          handleInputChange('usn', e.target.value)
          setBranch(getBranchFromUSN(e.target.value))
        }}
        className="pl-10"
        required
      />
    </div>
    {branch && (
      <p className="text-xs text-muted-foreground">
        Detected Branch: {branch}
      </p>
    )}
  </div>
)}
<div className="space-y-2">
  <Label htmlFor="year">Year</Label>
  <div className="relative">
    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id="year"
          variant="outline"
          className="pl-10 w-full justify-start"
        >
          {formData.year || "Select Year"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-full">
        {["1st Year", "2nd Year", "3rd Year", "4th Year"].map((year) => (
          <DropdownMenuItem
            key={year}
            onClick={() => handleInputChange("year", year)}
          >
            {year}

          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  <p className="text-xs text-muted-foreground">
    Please select your current year of study
  </p>
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
                      Creating Account...
                    </>
                  ) : (
                    'Continue to Face Registration'
                  )}
                </Button>

                {/* Back Button */}
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setCurrentStep('otp')}
                >
                  Back to OTP Verification
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}