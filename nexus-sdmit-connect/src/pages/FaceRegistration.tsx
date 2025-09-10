import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { useNavigate, useLocation } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { Camera, Check, Loader2, RotateCcw } from "lucide-react"

interface CaptureData {
  prompt: string
  imageData: string | null
  captured: boolean
}

export default function FaceRegistration() {
  const [isCapturing, setIsCapturing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const [prompts, setPrompts] = useState<string[]>([])
  const [captures, setCaptures] = useState<CaptureData[]>([])
  const [allCaptured, setAllCaptured] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const userData = location.state?.userData
  const availablePrompts = ["Smile", "Turn Left", "Turn Right", "Blink Twice", "Look Up"]

  // Initialize random prompts on component mount
  useEffect(() => {
    const shuffled = [...availablePrompts].sort(() => 0.5 - Math.random())
    const selectedPrompts = shuffled.slice(0, 3)
    setPrompts(selectedPrompts)
    setCaptures(
      selectedPrompts.map(prompt => ({
        prompt,
        imageData: null,
        captured: false
      }))
    )
  }, [])

  useEffect(() => {
    if (!userData) {
      toast({
        title: "Access Denied",
        description: "Please complete the signup form first.",
        variant: "destructive"
      })
      navigate('/signup')
    }
  }, [userData, navigate, toast])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 300, height: 300 } 
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setIsCapturing(true)
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      })
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsCapturing(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && currentPromptIndex < captures.length) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')
      
      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)
        
        const imageData = canvas.toDataURL('image/jpeg')
        
        // Update captures array
        const updatedCaptures = [...captures]
        updatedCaptures[currentPromptIndex] = {
          ...updatedCaptures[currentPromptIndex],
          imageData,
          captured: true
        }
        setCaptures(updatedCaptures)
        
        toast({
          title: `Capture ${currentPromptIndex + 1} Success ✅`,
          description: `${prompts[currentPromptIndex]} captured successfully!`,
        })
        
        // Check if all captures are done
        if (currentPromptIndex === captures.length - 1) {
          stopCamera()
          setAllCaptured(true)
        } else {
          // Move to next prompt
          setCurrentPromptIndex(currentPromptIndex + 1)
        }
      }
    }
  }

  const retakeCapture = (index: number) => {
    const updatedCaptures = [...captures]
    updatedCaptures[index] = {
      ...updatedCaptures[index],
      imageData: null,
      captured: false
    }
    setCaptures(updatedCaptures)
    setCurrentPromptIndex(index)
    setAllCaptured(false)
    
    if (!isCapturing) {
      startCamera()
    }
  }

  const handleRegister = async () => {
    setIsProcessing(true)
    
    // Simulate processing time
    setTimeout(() => {
      toast({
        title: "Registration Complete",
        description: "Your account has been created successfully!",
      })
      navigate('/login')
    }, 2000)
  }

  if (!userData || prompts.length === 0) {
    return null
  }

  const currentCapture = captures[currentPromptIndex]
  const completedCapturesCount = captures.filter(c => c.captured).length

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar showBack backTo="/signup" />
      
      <main className="container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-medium">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Face Registration
            </CardTitle>
            <CardDescription>
              Step 3 of 3 - Complete face verification ({completedCapturesCount}/3)
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Current Prompt Display */}
            {!allCaptured && (
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-lg font-semibold text-primary">
                  {currentCapture?.prompt}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please {currentCapture?.prompt.toLowerCase()} when ready to capture
                </p>
              </div>
            )}

            {/* Video Container */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-72 h-72 bg-muted rounded-full overflow-hidden border-4 border-primary/20">
                  {isCapturing ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : allCaptured ? (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <div className="text-center">
                        <Check className="h-16 w-16 text-primary mx-auto mb-2" />
                        <p className="text-sm font-medium text-primary">All Captures Complete!</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Camera preview</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Capture Thumbnails */}
            <div className="grid grid-cols-3 gap-2">
              {captures.map((capture, index) => (
                <div key={index} className="text-center">
                  <div className="w-20 h-20 mx-auto mb-2 bg-muted rounded-lg overflow-hidden border-2 border-muted-foreground/20">
                    {capture.captured && capture.imageData ? (
                      <img 
                        src={capture.imageData} 
                        alt={`Capture ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium">{capture.prompt}</p>
                  {capture.captured ? (
                    <div className="flex items-center justify-center mt-1">
                      <Check className="h-3 w-3 text-green-500 mr-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                        onClick={() => retakeCapture(index)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Retake
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">Pending</p>
                  )}
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {!isCapturing && !allCaptured && (
                <Button 
                  onClick={startCamera} 
                  className="w-full bg-gradient-primary hover:opacity-90"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Start Camera
                </Button>
              )}

              {isCapturing && !allCaptured && (
                <Button 
                  onClick={capturePhoto} 
                  className="w-full bg-accent hover:bg-accent/90"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Capture Photo ({currentPromptIndex + 1}/3)
                </Button>
              )}

              {allCaptured && (
                <Button 
                  onClick={handleRegister} 
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Complete Registration
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* User Info */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">Registering: {userData.name}</p>
              <p className="text-xs text-muted-foreground">USN: {userData.usn}</p>
              <p className="text-xs text-muted-foreground">Email: {userData.email}</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}