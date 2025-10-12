import { useEffect, useState,useRef} from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageCircle, Send, FileCheck, BookOpen, Calendar } from "lucide-react"
import api from "@/services/api"
import { format, isValid, parseISO } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { FaceMesh } from "@mediapipe/face_mesh"
import { Camera } from "@mediapipe/camera_utils"

// ---------------- Skeleton Components ----------------
function MessageSkeleton() {
  return (
    <div className="flex items-start space-x-3 animate-pulse">
      <div className="p-2 rounded-full bg-gray-300 w-8 h-8" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-300 rounded w-1/4"></div>
        <div className="h-3 bg-gray-300 rounded w-3/4"></div>
      </div>
    </div>
  )
}

function AnnouncementSkeleton() {
  return (
    <div className="p-4 border rounded-lg mb-3 animate-pulse">
      <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-300 rounded w-full mb-1"></div>
      <div className="h-3 bg-gray-300 rounded w-5/6"></div>
    </div>
  )
}

function DocumentSkeleton() {
  return (
    <div className="p-4 border rounded-lg mb-3 animate-pulse">
      <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
      <div className="h-3 bg-gray-300 rounded w-1/2 mb-1"></div>
      <div className="h-3 bg-gray-300 rounded w-1/4"></div>
    </div>
  )
}

// ---------------- Main Component ----------------
export default function StudentTabs({ activeTab, setActiveTab, user }) {
  const { toast } = useToast()

  // State
  const [messages, setMessages] = useState([])
  const [announcements, setAnnouncements] = useState({ materials: [], events: [] })
  const [documents, setDocuments] = useState([])
  const [modalDocId, setModalDocId] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [prompt, setPrompt] = useState("")
  const [status, setStatus] = useState("")


  // Loading states per tab
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false)
  const [loadingDocuments, setLoadingDocuments] = useState(false)

  const [newMessage, setNewMessage] = useState("")
  const [selectedLecturer, setSelectedLecturer] = useState("all")


  // Lazy fetch per tab
  useEffect(() => {
  if (!activeTab) return;

  let ws: WebSocket | null = null; // Track WS locally so cleanup works properly

  const fetchData = async () => {
    try {
      if (!user?.group_id) {
        console.warn("No group_id, skipping fetch");
        return;
      }

      // -------- DISCUSSION TAB --------
      if (activeTab === "discussion") {
        setLoadingMessages(true);

        // 1️⃣ Connect WebSocket
        ws = new WebSocket(
          `ws://127.0.0.1:8000/ws/groups/${user.group_id}/${encodeURIComponent(user.name)}`
        );
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("✅ Connected to WebSocket");
          ws?.send(JSON.stringify({ action: "fetch_history" }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "history") {
              setMessages(data.messages || []);
            } else if (data.type === "message") {
              setMessages((prev) => [...prev, data.message]);
            } else if (data.type === "delete") {
              setMessages((prev) => prev.filter((m) => m.id !== data.message_id));
            }
          } catch (err) {
            console.error("❌ WS parse error:", err);
          } finally {
            setLoadingMessages(false);
          }
        };

        ws.onclose = () => {
          console.warn("❌ WebSocket closed");
        };

      // -------- ANNOUNCEMENTS TAB --------
      } else if (activeTab === "announcements") {
        setLoadingAnnouncements(true);
        const res = await api.get(`/groups/${user.group_id}/announcements`);
        setAnnouncements(res.data || { materials: [], events: [] });
        setLoadingAnnouncements(false);

      // -------- DOCUMENTS TAB --------
      } else if (activeTab === "documents") {
        setLoadingDocuments(true);
        const res = await api.get(`/groups/documents`);
        setDocuments(
          (res.data.documents || []).map((doc) => ({
            ...doc,
            document_id: Number(doc.document_id),
            signatures: (doc.signatures || []).map((sig) => ({
              usn: sig.usn ?? sig.studentUSN,
              name: sig.name ?? sig.studentName,
              signed_at: sig.signed_at,
            })),
          }))
        );
        setLoadingDocuments(false);
      }
    } catch (err) {
      console.error("❌ Fetch error:", err);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      if (activeTab === "discussion") setLoadingMessages(false);
      if (activeTab === "announcements") setLoadingAnnouncements(false);
      if (activeTab === "documents") setLoadingDocuments(false);
    }
  };

  fetchData();

  // 🧹 Cleanup: close WebSocket when leaving discussion tab
  return () => {
    if (ws) {
      console.log("🔌 Closing WebSocket connection...");
      ws.close();
    }
  };
}, [activeTab, user.group_id, toast]);


  // ---------------- Handlers ----------------
  const handleSendMessage = (msg: string) => {
  if (!msg.trim()) return;
  if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
    toast({ title: "Not connected", description: "WebSocket not open yet.", variant: "destructive" });
    return;
  }

  const messageData = {
    action: "send_message",
    content: msg,
    sender_id: user.id,
    sender_name: user.name,
    role: "student",
    timestamp: new Date().toISOString(),
  };

  wsRef.current.send(JSON.stringify(messageData));
  setNewMessage("");
};

const handleDeleteMessage = (id: number) => {
  if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

  wsRef.current.send(JSON.stringify({
    action: "delete_message",
    message_id: id,
  }));
};


  // ---------------- Liveness detection ----------------
  useEffect(() => {
  if (!modalDocId || !videoRef.current || !canvasRef.current) return

  const video = videoRef.current
  const canvas = canvasRef.current
  const ctx = canvas.getContext("2d")!

  let camera: Camera | null = null
  let timeoutId: NodeJS.Timeout
  let success = false
  let capturedFrames: string[] = []

  // Timeout if no liveness completed within 15s
  timeoutId = setTimeout(() => {
    toast({
      title: "Liveness Failed",
      description: "No face detected in time. Please try again.",
      variant: "destructive",
    })
    setModalDocId(null)
  }, 15000)

  // Random prompt
  const prompts = [
  "Please give us a quick blink 👀",
  "Show us your best smile 😄",
  "Turn your head a little to the left 👈",
  "Turn your head to the right 👉",
  "Open your mouth like you’re saying 'Ahh' 😮",
  "Tilt your head up slightly 🙆‍♂️",
  "Tilt your head down gently 🙇‍♀️"
]

  const currentPrompt = prompts[Math.floor(Math.random() * prompts.length)]
  setPrompt("Do this: " + currentPrompt)
  setStatus("")

  const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
  })
  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
  async function getBrightness(imgData: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = imgData;
    img.onload = () => {
      const tempCanvas = document.createElement("canvas");
      const ctx = tempCanvas.getContext("2d")!;
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const data = ctx.getImageData(0, 0, img.width, img.height).data;
      let sum = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Standard luminance formula
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        sum += brightness;
      }

      resolve(sum / (data.length / 4)); // Average brightness
    };
  });
}

  async function markSuccess() {
  if (success) return;
  success = true;
  clearTimeout(timeoutId);

  setStatus("✅ Liveness check passed!");

  capturedFrames = []; // reset frames if needed
  let count = 0;

  const interval = setInterval(async () => {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photo = canvas.toDataURL("image/jpeg");
    capturedFrames.push(photo);
    count++;

    if (count === 5) {
      clearInterval(interval);

      try {
        // Compute brightness for all 5 frames
        const scores = await Promise.all(capturedFrames.map((img) => getBrightness(img)));

        // Pick the brightest frame
        const brightestIndex = scores.indexOf(Math.max(...scores));
        const bestFrame = capturedFrames[brightestIndex];

        // Convert base64 to Blob
        const img = await fetch(bestFrame);
        const bestFrameFile = await img.blob();
        const formData = new FormData();
        formData.append("images", bestFrameFile); // bestFrameFile is a Blob/File
        const res= await api.post(`/sign-document/${modalDocId}/sign`, formData, {
           headers: { "Content-Type": "multipart/form-data" }
        });
        if (!res.data || !res.data.document_id) {
          throw new Error("Invalid response from server");
        }
        if (res.data?.signed) {
  // update document state immediately
  setDocuments((prev) =>
    prev.map((doc) =>
      doc.document_id === Number(modalDocId)// use same type as backend returns
        ? {
            ...doc,
            signatures: [
              ...(doc.signatures || []),
              {
                usn: user.usn,
                name: user.name,
                signed_at: new Date().toISOString(),
              },
            ],
          }
        : doc
    )
  )

  toast({ title: "Document Signed", description: "Your signature has been added." })
}
      } catch (err) {
        console.error("Sign error:", err);
        toast({
          title: "Error",
          description: "Failed to sign document.",
          variant: "destructive",
        });
      } finally {
        setModalDocId(null);
      }
    }
  }, 400);
}
  function checkLiveness(landmarks: any) {
    if (success) return

    // Blink
    if (currentPrompt.includes("blink")) {
      const leftOpenness = Math.abs(landmarks[159].y - landmarks[145].y)
      const rightOpenness = Math.abs(landmarks[386].y - landmarks[374].y)
      if (leftOpenness < 0.01 && rightOpenness < 0.01) markSuccess()
    }

    // Smile
    if (currentPrompt.includes("smile")) {
      const leftMouth = landmarks[61]
      const rightMouth = landmarks[291]
      const topLip = landmarks[13]
      const bottomLip = landmarks[14]
      const mouthWidth = Math.abs(rightMouth.x - leftMouth.x)
      const mouthHeight = Math.abs(topLip.y - bottomLip.y)
      const smileRatio = mouthWidth / mouthHeight
      if (smileRatio > 2.3 && mouthHeight > 0.03) markSuccess()
    }

    // Turn head left
    if (currentPrompt.includes("left")){
      const nose = landmarks[1]
      const faceCenterX = (landmarks[127].x + landmarks[356].x) / 2
      if (nose.x < faceCenterX - 0.05) markSuccess()
    }

    // Turn head right
    if (currentPrompt.includes("right")) {
      const nose = landmarks[1]
      const faceCenterX = (landmarks[127].x + landmarks[356].x) / 2
      if (nose.x > faceCenterX + 0.05) markSuccess()
    }

    // Open mouth
    if (currentPrompt.includes("mouth")) {
      const topLip = landmarks[13]
      const bottomLip = landmarks[14]
      const lipDist = Math.abs(topLip.y - bottomLip.y)
      if (lipDist > 0.08) markSuccess()
    }

  // Tilt head up
  if (currentPrompt.includes("up")) {
    const noseTip = landmarks[1]
    const forehead = landmarks[10]
    const chin = landmarks[152]
    const noseRatio = (noseTip.y - forehead.y) / (chin.y - forehead.y)
    if (noseRatio < 0.4) markSuccess()
  }

  // Tilt head down
  if (currentPrompt.includes("down")) {
    const noseTip = landmarks[1]
    const forehead = landmarks[10]
    const chin = landmarks[152]
    const noseRatio = (noseTip.y - forehead.y) / (chin.y - forehead.y)
    if (noseRatio > 0.6) markSuccess()
  }
  }

  faceMesh.onResults((results: any) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height)

    if (results.multiFaceLandmarks?.length > 0) {
      checkLiveness(results.multiFaceLandmarks[0])
    }
  })

  try {
    camera = new Camera(video, {
      onFrame: async () => {
        await faceMesh.send({ image: video })
      },
      width: 640,
      height: 480,
    })
    camera.start()
  } catch (err) {
    console.error("Camera error:", err)
    toast({
      title: "Camera Error",
      description: "Unable to access camera. Please allow permissions.",
      variant: "destructive",
    })
    setModalDocId(null)
  }

  return () => {
    if (camera) camera.stop()
    clearTimeout(timeoutId)
  }
}, [modalDocId, toast, setDocuments])

  // ---------------- Helpers ----------------
  const lecturerOptions = Array.from(
    new Set([
      ...announcements.materials.map((m) => m.lecturer_name),
      ...announcements.events.map((e) => e.lecturer_name),
    ].filter(Boolean))
  )

  const filteredMaterials =
    selectedLecturer === "all"
      ? announcements.materials
      : announcements.materials.filter((m) => m.lecturer_name === selectedLecturer)

  const filteredEvents =
    selectedLecturer === "all"
      ? announcements.events
      : announcements.events.filter((e) => e.lecturer_name === selectedLecturer)

  function normalizeTimestamp(ts?: string | null): string | null {
    if (!ts) return null
    const s = String(ts).trim()
    return s.replace(/(\.\d{3})\d+/, "$1")
  }

  function formatTimestamp(ts?: string | null) {
    const norm = normalizeTimestamp(ts)
    if (!norm) return "No date available"
    const d = parseISO(norm)
    if (!isValid(d)) {
      console.warn("Invalid timestamp encountered:", ts)
      return "Invalid date"
    }
    return format(d, "MMM dd, yyyy HH:mm")
  }

  // ---------------- Render ----------------
  return (
    <div className="container mx-auto px-4 py-6">
      <Button variant="outline" className="mb-6" onClick={() => setActiveTab(null)}>
        ← Back to Dashboard
      </Button>

      {/* ------------------- Discussion ------------------- */}
      {activeTab === "discussion" && (
        <Card>
          <CardHeader>
            <CardTitle>Group Discussion</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 mb-4">
              <div className="space-y-4">
                {loadingMessages
                  ? Array.from({ length: 5 }).map((_, i) => <MessageSkeleton key={i} />)
                  : messages.map((msg) => (
                      <div key={msg.id} className="flex items-start space-x-3">
                        <div
                          className={`p-2 rounded-full ${
                            msg.role === "lecturer" ? "bg-primary" : "bg-secondary"
                          }`}
                        >
                          <MessageCircle className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-sm">{msg.author}</p>
                            <Badge>{msg.role}</Badge>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(msg.timestamp), "MMM dd, HH:mm")}
                            </p>
                          </div>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))}
              </div>
            </ScrollArea>

            <div className="flex space-x-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newMessage.trim()) {
                    handleSendMessage(newMessage)
                    setNewMessage("")
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (newMessage.trim()) {
                    handleSendMessage(newMessage)
                    setNewMessage("")
                  }
                }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------- Announcements ------------------- */}
      {activeTab === "announcements" && (
        <div className="space-y-6">
          {/* Lecturer Filter */}
          <div className="flex items-center space-x-4">
            <p className="font-medium">Filter by Lecturer:</p>
            <Select value={selectedLecturer} onValueChange={setSelectedLecturer}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select Lecturer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lecturers</SelectItem>
                {lecturerOptions.map((name, idx) => (
                  <SelectItem key={idx} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Materials */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <BookOpen className="h-5 w-5 mr-2 inline" /> Materials
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAnnouncements
                  ? Array.from({ length: 4 }).map((_, i) => <AnnouncementSkeleton key={i} />)
                  : filteredMaterials.map((ann) => (
                      <div key={ann.id} className="p-4 border rounded-lg mb-3">
                        <h4 className="font-medium">{ann.title}</h4>
                        <p className="text-sm">{ann.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(ann.uploaded_at)} • {ann.lecturer_name}
                        </p>
                        {ann.file_url && (
                          <div className="flex space-x-2 mt-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={ann.file_url} target="_blank" rel="noopener noreferrer">
                                View Attachment
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
              </CardContent>
            </Card>

            {/* Events */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <Calendar className="h-5 w-5 mr-2 inline" /> Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAnnouncements
                  ? Array.from({ length: 4 }).map((_, i) => <AnnouncementSkeleton key={i} />)
                  : filteredEvents.map((ann) => (
                      <div key={ann.id} className="p-4 border rounded-lg mb-3">
                        <h4 className="font-medium">{ann.title}</h4>
                        <p className="text-sm">{ann.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(ann.created_at)} • {ann.lecturer_name}
                        </p>
                        {ann.file_url && (
                          <div className="flex space-x-2 mt-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={ann.file_url} target="_blank" rel="noopener noreferrer">
                                View Attachment
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ------------------- Documents ------------------- */}
      {activeTab === "documents" && (
  <Card>
    <CardHeader>
      <CardTitle>Document Signing</CardTitle>
    </CardHeader>
    <CardContent>
      {loadingDocuments ? (
        Array.from({ length: 3 }).map((_, i) => <DocumentSkeleton key={i} />)
      ) : (
        documents
    .slice() // copy array before sorting
    .sort((a, b) => {
      const aSigned = a.signatures?.some(sig => sig.usn === user?.usn)
      const bSigned = b.signatures?.some(sig => sig.usn === user?.usn)

      // 1️⃣ Unsigned first
      if (aSigned !== bSigned) return aSigned ? 1 : -1

      // 2️⃣ Nearest deadline next
      const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity
      const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity
      return aDeadline - bDeadline
    })
    .map((doc) => {
      const now = new Date()
      const deadline = doc.deadline ? new Date(doc.deadline) : null
      const isExpired = deadline ? deadline < now : false
      const hasSigned = doc.signatures?.some(sig => sig.usn === user?.usn)

            return (
              <div
                key={doc.document_id}
                className="p-4 border rounded-lg mb-3 flex justify-between items-start"
              >
                {/* Left side: Document info */}
                <div className="flex-1 pr-4">
                  <h4 className="font-medium">{doc.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    Uploaded by {doc.uploaded_by} • {doc.author_name} •{" "}
                    {doc.uploaded_at
                      ? format(new Date(doc.uploaded_at), "MMM dd, yyyy")
                      : "No date"}
                  </p>

                  {/* File attachment */}
                  {doc.file_url && (
                    <div className="flex space-x-2 mt-2">
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Attachment
                        </a>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end space-y-2 min-w-max">
                  {/* Deadline badge */}
                  {deadline ? (
                    <Badge
                      className={`${
                        isExpired
                          ? "bg-red-500 text-white"
                          : "bg-green-600 text-white"
                      }`}
                    >
                      {isExpired ? "Expired" : "Available"} •{" "}
                      {format(deadline, "MMM dd, yyyy HH:mm")}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">No Deadline</Badge>
                  )}

                  {/* Sign button or signed badge */}
                  {hasSigned ? (
                    <Badge variant="default">
                      <FileCheck className="h-3 w-3 mr-1" /> Signed
                    </Badge>
                  ) : (
                    <Button
                      disabled={isExpired}
                      onClick={() => setModalDocId(doc.document_id)}
                    >
                      <FileCheck className="h-4 w-4 mr-1" /> Sign
                    </Button>
                  )}
                </div>
              </div>
            )
          })
      )}

      {/* Webcam Modal with liveness */}
{modalDocId && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
    <div className="min-h-screen bg-gradient-subtle rounded-2xl shadow-xl p-8 w-full max-w-3xl text-center space-y-6">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="hidden"
      />
      
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="w-full max-h-[70vh] object-contain rounded-xl border"
      />
      
      <div className="font-bold text-xl">{prompt}</div>
      <div className="font-semibold text-green-600 text-lg">{status}</div>
      
      <div className="flex justify-center gap-4 pt-4">
        <Button
          variant="secondary"
          onClick={() => setModalDocId(null)}
        >
          Cancel
        </Button>
      </div>
    </div>
  </div>
)}
    </CardContent>
  </Card>
)}
    </div>
  )
}