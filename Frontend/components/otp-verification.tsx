import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Mail, ArrowLeft } from "lucide-react"
import api from "@/services/api"

interface OTPVerificationProps {
  email: string
  onVerified: () => void
  onBack: () => void
}

export default function OTPVerification({ email, onVerified, onBack }: OTPVerificationProps) {
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const { toast } = useToast()

const handleVerifyOTP = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)

  try {
    await api.post("/auth/verify-otp", { email, otp })

    toast({
      title: "OTP Verified",
      description: "Your email has been verified successfully."
    })
    onVerified() // go to details step in signup
  } catch (error: any) {
    toast({
      title: "Verification Failed",
      description: error.response?.data?.message || "Invalid OTP. Try again.",
      variant: "destructive",
    })
  } finally {
    setIsLoading(false)
  }
}

const handleResendOTP = async () => {
  setIsResending(true)

  try {
    await api.post("/auth/resend-otp", { email })

    toast({
      title: "OTP Resent",
      description: "A new OTP has been sent to your email."
    })
  } catch (error: any) {
    toast({
      title: "Failed to Resend OTP",
      description: error.response?.data?.message || "Please try again later.",
      variant: "destructive",
    })
  } finally {
    setIsResending(false)
  }
}


  return (
    <Card className="w-full max-w-md shadow-medium">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Verify Email
        </CardTitle>
        <CardDescription>
          Enter the OTP sent to {email}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleVerifyOTP} className="space-y-6">
          {/* OTP Field */}
          <div className="space-y-2">
            <Label htmlFor="otp">One-Time Password</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="pl-10 text-center text-lg tracking-widest"
                maxLength={6}
                required
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <Button 
              type="submit" 
              className="w-full bg-gradient-primary hover:opacity-90" 
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify OTP'
              )}
            </Button>

            <Button 
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResendOTP}
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : (
                'Resend OTP'
              )}
            </Button>

            <Button 
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Email
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}