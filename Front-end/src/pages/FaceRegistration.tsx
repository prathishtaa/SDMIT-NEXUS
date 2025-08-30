import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/navbar"
import { useNavigate, useLocation } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { Camera, Check, Loader2, RotateCcw } from "lucide-react"
import api from "@/services/api"

interface CaptureData {
  prompt: string
  imageData: string | null
  captured: boolean
}

export default function FaceRegistration() {
  const [isCapturing, setIsCapturing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const [prompts, setPrompts] = useState<string[]>([])
  const [captures, setCaptures] = useState<CaptureData[]>([])
  const [allCaptured, setAllCaptured] = useState(false)
  const [faceInCircle, setFaceInCircle] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mpCameraRef = useRef<any>(null)

  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const userData = location.state?.userData

  const availablePrompts = ["Smile", "Turn Left", "Turn Right"]

  // pick 3 random prompts
  useEffect(() => {
    const shuffled = [...availablePrompts].sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, 3)
    setPrompts(selected)
    setCaptures(selected.map(p => ({ prompt: p, imageData: null, captured: false })))
  }, [])

  // init mediapipe FaceMesh
  useEffect(() => {
    let faceMesh: any
    let mpCamera: any

    const loadScripts = async () => {
      await new Promise<void>((resolve) => {
        const s = document.createElement("script")
        s.src = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"
        s.onload = () => resolve()
        document.body.appendChild(s)
      })

      await new Promise<void>((resolve) => {
        const s = document.createElement("script")
        s.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
        s.onload = () => resolve()
        document.body.appendChild(s)
      })

      if ((window as any).FaceMesh && (window as any).Camera && videoRef.current) {
        faceMesh = new (window as any).FaceMesh({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        })
        faceMesh.setOptions({
          maxNumFaces: 2,
          refineLandmarks: true,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        })

        faceMesh.onResults((results: any) => {
          (window as any).lastLandmarks = results.multiFaceLandmarks || []
          const video = videoRef.current!
          const vw = video.videoWidth
          const vh = video.videoHeight
          if (!vw || !vh) {
            setFaceInCircle(false)
            return
          }

          const numFaces = results.multiFaceLandmarks?.length || 0

          if (numFaces === 1) {
            const lms = results.multiFaceLandmarks[0]
            const LEFT_EYE = lms[33]
            const RIGHT_EYE = lms[263]
            const cx = ((LEFT_EYE.x + RIGHT_EYE.x) / 2) * vw
            const cy = ((LEFT_EYE.y + RIGHT_EYE.y) / 2) * vh
            const scaleX = 300 / vw
            const scaleY = 300 / vh
            const distance = Math.hypot(cx * scaleX - 150, cy * scaleY - 150)
            setFaceInCircle(distance < 150 * 0.6)
          } else {
            setFaceInCircle(false)
          }
        })

        mpCamera = new (window as any).Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && videoRef.current.videoWidth > 0) {
              await faceMesh.send({ image: videoRef.current })
            }
          },
          width: 300,
          height: 300,
        })
        mpCamera.start()
        mpCameraRef.current = mpCamera
      }
    }

    loadScripts()
    return () => {
      if (mpCameraRef.current) mpCameraRef.current.stop()
    }
  }, [])

  // redirect if no signup data
  useEffect(() => {
    if (!userData) {
      toast({
        title: "Access Denied",
        description: "Please complete the signup form first.",
        variant: "destructive",
      })
      navigate("/signup")
    }
  }, [userData, navigate, toast])

  const startCamera = async () => {
    if (allCaptured) return
    if (videoRef.current && videoRef.current.srcObject) {
      setIsCapturing(true)
      return
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      })
      if (videoRef.current) videoRef.current.srcObject = mediaStream
      setIsCapturing(true)
    } catch {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    if (mpCameraRef.current) {
      mpCameraRef.current.stop()
      mpCameraRef.current = null
    }
    setIsCapturing(false)
  }

  const capturePhoto = () => {
    const faces: any[] = (window as any).lastLandmarks || []

    if (!faces.length) {
      toast({
        title: "Face Not Detected",
        description: "🙂 Please move your face fully inside the circle and ensure good lighting.",
        variant: "destructive",
      })
      return
    }

    if (faces.length > 1) {
      toast({
        title: "Multiple Faces Detected 👥",
        description: "Please ensure only your face is visible in the frame.",
        variant: "destructive",
      })
      return
    }

    if (!faceInCircle) {
      toast({
        title: "Face Not Centered",
        description: "🙂 Please move your face fully inside the circle before capturing.",
        variant: "destructive",
      })
      return
    }

    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")!
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = canvas.toDataURL("image/jpeg", 0.9)
    const updated = [...captures]
    updated[currentPromptIndex] = { ...updated[currentPromptIndex], imageData, captured: true }
    setCaptures(updated)

    toast({
      title: "Capture Success ✅",
      description: `${prompts[currentPromptIndex]} captured successfully!`,
    })

    if (currentPromptIndex < captures.length - 1 && !updated[currentPromptIndex + 1].captured) {
      setCurrentPromptIndex(currentPromptIndex + 1)
    } else if (updated.every(c => c.captured)) {
      stopCamera()
      setAllCaptured(true)
    }
  }

  const retakeCapture = (index: number) => {
    const updated = [...captures]
    updated[index] = { ...updated[index], imageData: null, captured: false }
    setCaptures(updated)
    const firstUncapturedIndex = updated.findIndex(c => !c.captured)
    setCurrentPromptIndex(firstUncapturedIndex >= 0 ? firstUncapturedIndex : 0)
    setAllCaptured(false)
    if (!isCapturing) startCamera()
  }
  async function importServerPublicKey(pem: string) {
  const binaryDer = Uint8Array.from(
    atob(pem.replace(/-----\w+ PUBLIC KEY-----/g, "").replace(/\s+/g, "")),
    c => c.charCodeAt(0)
  );
  return crypto.subtle.importKey(
    "spki",
    binaryDer.buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );
}

async function generateAESKey() {
  return await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

async function encryptBlob(blob: Blob, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await blob.arrayBuffer();
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { encrypted: new Blob([encrypted]), iv };
}

  const handleRegister = async () => {
    if (!allCaptured) {
      toast({
        title: "Error",
        description: "Please capture all required photos before registering.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
  try {
    const formData = new FormData();

    // 1. Get server public key (fetch from backend /public-key route)
    const { data: pkRes } = await api.get("/face_reg/public-key");
    const serverPublicKey = await importServerPublicKey(pkRes.public_key);

    // 2. Generate AES key
    const aesKey = await generateAESKey();

    // 3. Encrypt images
    for (let i = 0; i < captures.length; i++) {
      if (captures[i].imageData) {
        const byteString = atob(captures[i].imageData.split(",")[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let j = 0; j < byteString.length; j++) ia[j] = byteString.charCodeAt(j);
        const blob = new Blob([ab], { type: "image/jpeg" });

        const { encrypted, iv } = await encryptBlob(blob, aesKey);
        formData.append(`img${i + 1}`, encrypted, `enc_capture${i + 1}.bin`);
        formData.append(`iv${i + 1}`, JSON.stringify(Array.from(iv)));
      }
    }

    // 4. Encrypt AES key with server public key
    const rawKey = await crypto.subtle.exportKey("raw", aesKey);
    const encryptedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, serverPublicKey, rawKey);
    formData.append("encryptedKey", new Blob([encryptedKey]));

    // 5. Add user data
    formData.append("name", userData.name);
    formData.append("email", userData.email);
    formData.append("password", userData.password);
    formData.append("usn", userData.usn);
    formData.append("branch", userData.branch);
    formData.append("year", userData.year);

    // 6. Send
    const res = await api.post("/face_reg/face-verify-register/", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });

      const data = res.data

      if (data.message === "confirmation done") {
        toast({
          title: "Registration Complete ✅",
          description: "Your account has been created successfully!",
        })
        navigate("/login")
      } else {
        toast({
          title: "Face Verification Failed ❌",
          description: "These images don't belong to the same person. Please retake.",
          variant: "destructive",
        })
        setAllCaptured(false)
        setCaptures(captures.map(c => ({ ...c, imageData: null, captured: false })))
        setCurrentPromptIndex(0)
        startCamera()
      }
    } catch (error: any) {
      let message = "Could not complete registration. Try again."

      if (error.response?.data?.detail) {
        const detail = error.response.data.detail
        if (Array.isArray(detail)) {
          message = detail.map((d: any) => d.msg).join(", ")
        } else if (typeof detail === "string") {
          message = detail
        }
      } else if (error.message) {
        message = error.message
      }

      toast({
        title: "Server Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!userData || prompts.length === 0) return null

  const currentCapture = captures[currentPromptIndex]
  const completedCount = captures.filter(c => c.captured).length

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
              Step 3 of 3 - Complete face verification ({completedCount}/3)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!allCaptured && (
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-lg font-semibold text-primary">{currentCapture?.prompt}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please {currentCapture?.prompt.toLowerCase()} when ready to capture
                </p>
              </div>
            )}

            <div className="flex justify-center">
              <div className="w-72 h-72 bg-muted rounded-full overflow-hidden border-4 border-primary/20 relative">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-2 border-dashed border-white/60 rounded-full pointer-events-none"></div>
                {allCaptured && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/10">
                    <Check className="h-16 w-16 text-primary mb-2" />
                    <p className="text-sm font-medium text-primary">All Captures Complete!</p>
                  </div>
                )}
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="grid grid-cols-3 gap-2">
              {captures.map((c, i) => (
                <div key={i} className="text-center">
                  <div className="w-20 h-20 mx-auto mb-2 bg-muted rounded-lg overflow-hidden border-2 border-muted-foreground/20">
                    {c.captured && c.imageData ? (
                      <img src={c.imageData} alt={`Capture ${i + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium">{c.prompt}</p>
                  {c.captured && (
                    <div className="flex items-center justify-center mt-1">
                      <Check className="h-3 w-3 text-green-500 mr-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                        onClick={() => retakeCapture(i)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" /> Retake
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {!isCapturing && !allCaptured && (
                <Button onClick={startCamera} className="w-full bg-gradient-primary hover:opacity-90">
                  <Camera className="mr-2 h-4 w-4" /> Start Camera
                </Button>
              )}
              {isCapturing && !allCaptured && (
                <Button onClick={capturePhoto} className="w-full bg-accent hover:bg-accent/90">
                  <Camera className="mr-2 h-4 w-4" /> Capture Photo ({currentPromptIndex + 1}/3)
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
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" /> Complete Registration
                    </>
                  )}
                </Button>
              )}
            </div>

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
