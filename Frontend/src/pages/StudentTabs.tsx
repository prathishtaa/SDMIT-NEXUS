import { useEffect, useState,useRef} from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileCheck, BookOpen, Calendar } from "lucide-react"
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [replyParentId, setReplyParentId] = useState<number | null>(null);
  const [openDropdowns, setOpenDropdowns] = useState<{ [id: string]: boolean }>({});
  const [messages, setMessages] = useState([])
  const [announcements, setAnnouncements] = useState({ materials: [], events: [] })
  const [documents, setDocuments] = useState([])
  const [modalDocId, setModalDocId] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [prompt, setPrompt] = useState("")
  const [status, setStatus] = useState("")
  
  const messagesEndRef = useRef(null);
  const scrollViewportRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);

  // Loading states per tab
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false)
  const [loadingDocuments, setLoadingDocuments] = useState(false)

  const [newMessage, setNewMessage] = useState("")
  const [selectedLecturer, setSelectedLecturer] = useState("all")


  // Lazy fetch per tab
  // ---------------- Fetch Messages + WebSocket ----------------
useEffect(() => {
  if (!user?.group_id) return;

  const token = localStorage.getItem("auth_token");
  const ws = new WebSocket(`ws://localhost:8000/chats/ws/group/${user.group_id}?token=${token}`);
  wsRef.current = ws;


  setLoadingMessages(true);

  // ✅ Fetch existing messages once
  api
    .get(`/groups/messages?group_id=${user.group_id}`)
    .then((res) => {
      const fetchedMessages = (res.data || []).map((msg: any) => ({
        id: msg.doubt_id,
        content: msg.message,
        author: msg.sender_id === user.id ? user.name : msg.sender_name,
        role: msg.sender_role,
        timestamp: msg.created_at,
        reply_to: msg.reply_to,
      }));
      setMessages(fetchedMessages);
    })
    .catch((err) => {
      console.error("❌ Fetch messages error:", err);
      toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
    })
    .finally(() => setLoadingMessages(false));

  // ✅ Handle WebSocket messages
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "message") {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === data.doubt_id);
        if (exists) return prev; // 🧹 Prevent duplicates
        return [
          ...prev,
          {
            id: data.doubt_id,
            content: data.message,
            author: data.sender_id === user.id ? user.name : data.sender_name || "Other",
            role: data.sender_role,
            timestamp: data.created_at,
            reply_to: data.reply_to,
          },
        ];
      });
    } else if (data.type === "delete") {
    setMessages((prev) => {
      const deletedMsg = prev.find((m) => m.id === data.doubt_id);
      if (!deletedMsg) return prev;

      // Remove the original message
      const filtered = prev.filter((m) => m.id !== data.doubt_id);

      // Insert a system message at the same index
      const index = prev.findIndex((m) => m.id === data.doubt_id);
      const systemMsg = {
        id: `sys-${Date.now()}`,
        author: deletedMsg.author,
        content: "deleted a message",
        role: "system",
        timestamp: new Date(),
      };
      filtered.splice(index, 0, systemMsg);

      return filtered;
    });
    } else if (data.type === "status") {
      toast({ title: data.message });
    }
  };

  ws.onopen = () => console.log("✅ WebSocket connected");
  ws.onclose = () => console.warn("❌ WebSocket closed");

  // 🧹 Cleanup
  return () => {
    console.log("🔌 Closing WebSocket...");
    ws.close();
    wsRef.current = null;
  };
}, [user.group_id, user.id, user.name, toast]);

useEffect(() => {
  if (isAtBottom) {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  } else {
    setShowNewMessageButton(true);
  }
}, [messages]);


// Announcements fetch
useEffect(() => {
  if (activeTab !== "announcements" || !user?.group_id) return;
  setLoadingAnnouncements(true);
  api
    .get(`/groups/${user.group_id}/announcements`)
    .then((res) => setAnnouncements(res.data || { materials: [], events: [] }))
    .catch(() => toast({ title: "Error", description: "Failed to load announcements", variant: "destructive" }))
    .finally(() => setLoadingAnnouncements(false));
}, [activeTab, user?.group_id, toast]);

useEffect(() => {
  if (!user?.group_id || activeTab !== "announcements") return;

  const evtSource = new EventSource(`http://localhost:8000/sse/events/announcements/${user.group_id}`);

  evtSource.onmessage = (event) => {
    const data= JSON.parse(event.data);
    console.log("SSE message received:", event.data);
    if (data.type === "delete_announcement") {
      const annId = data.announcement_id; // "material-31" or "event-12"

setAnnouncements(prev => {
  const updated = { ...prev };
  if (annId.startsWith("material-")) {
    updated.materials = prev.materials.filter(ann => ann.id !== annId);
  } else if (annId.startsWith("event-")) {
    updated.events = prev.events.filter(ann => ann.id !== annId);
  }
  return updated;
});
toast({
      title: "Announcement Deleted",
      description: `An announcement has been removed.`,
      variant: "destructive",
    });
return
    }


    const normalized = {
  id: data.id ?? data.announcementId,
  title: data.title,
  content: data.content,
  uploaded_at: data.timestamp, // fallback
  created_at: data.timestamp, // keep for events
  file_url: data.file_url ?? data.fileUrl,
  lecturer_name: data.author,
  type: data.type ?? "material",
};

  let isNew = false;
    setAnnouncements((prev) => {
    const updated = { ...prev };

    if (normalized.type === "material") {
      const exists = prev.materials.some((m) => m.id === normalized.id);
      if (!exists) updated.materials = [...prev.materials, normalized];
      // Sort newest first
      updated.materials.sort(
        (a, b) => new Date(b.uploaded_at || b.created_at).getTime() - new Date(a.uploaded_at || a.created_at).getTime()
      );
    }

    if (normalized.type === "event") {
      const exists = prev.events.some((e) => e.id === normalized.id);
      if (!exists) updated.events = [...prev.events, normalized];
      // Sort by event date if available
      updated.events.sort(
        (a, b) => new Date(b.uploaded_at || b.created_at).getTime() - new Date(a.uploaded_at || a.created_at).getTime()
      );
    }

    return updated;
  });
  if (isNew) {
    toast({
      title: "New Announcement",
      description: `${normalized.title} — posted by ${normalized.lecturer_name}`,
    });
  }
};

  evtSource.onerror = (err) => {
    console.error("SSE error:", err);
    evtSource.close();
  };

  return () => evtSource.close();
}, [user?.group_id, activeTab]);


// Documents fetch
useEffect(() => {
  if (activeTab !== "documents" || !user?.group_id) return;
  setLoadingDocuments(true);
  api
    .get(`/groups/documents`)
    .then((res) =>
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
      )
    )
    .catch(() =>
      toast({ title: "Error", description: "Failed to load documents", variant: "destructive" })
    )
    .finally(() => setLoadingDocuments(false));
}, [activeTab, user?.group_id, toast]);

useEffect(() => {
  if (!user?.group_id || activeTab !== "documents") return;

  const evtSource = new EventSource(
    `http://localhost:8000/sse/events/documents/${user.group_id}`
  );

  evtSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // ----------------- Delete Document -----------------
    if (data.type === "delete_document") {
      setDocuments((prev) =>
        prev.filter((d) => d.document_id !== Number(data.document_id))
      );
      toast({
      title: "Document Deleted",
      description: `Document has been removed.`,
      variant: "destructive",
    });
      return;

    }

    // ----------------- Normalize Document -----------------
    const normalized = {
      document_id: Number(data.id),
      title: data.title,
      uploaded_by: data.uploadedBy,
      uploaded_at: data.uploaded_at,
      deadline: data.deadline,
      file_url:data.fileUrl,
      signatures: (data.signatures || []).map((sig) => ({
            usn: sig.usn ?? sig.studentUSN,
            name: sig.name ?? sig.studentName,
            signed_at: sig.signed_at,
          })),
    };
    

    // ----------------- Merge / Add Document -----------------
    setDocuments((prev) => {
      const exists = prev.some(
        (d) => d.document_id === normalized.document_id
      );

      const newDocs = exists
        ? prev.map((d) =>
            d.document_id === normalized.document_id
              ? {
                  ...d, // keep existing fields
                  title: normalized.title ?? d.title,
                  uploaded_by: normalized.uploaded_by ?? d.uploaded_by,
                  uploaded_at: normalized.uploaded_at ?? d.uploaded_at,
                  deadline: normalized.deadline ?? d.deadline,
                  file_url: normalized.file_url ?? d.file_url,
                  signatures: (normalized.signatures || []).map((sig) => ({
            usn: sig.usn ?? sig.studentUSN,
            name: sig.name ?? sig.studentName,
            signed_at: sig.signed_at,
          })),
                }
              : d
          )
        : [...prev, normalized];

      // ----------------- Sort: Unsigned first, then by deadline -----------------
      return newDocs.sort((a, b) => {
        const aSigned = a.signatures?.some(
          (sig) => sig.usn === user.usn
        );
        const bSigned = b.signatures?.some(
          (sig) => sig.usn === user.usn
        );
        if (aSigned !== bSigned) return aSigned ? 1 : -1;

        const aDeadline = a.deadline
          ? new Date(a.deadline).getTime()
          : Infinity;
        const bDeadline = b.deadline
          ? new Date(b.deadline).getTime()
          : Infinity;
        return aDeadline - bDeadline;
      });
    });
  };

  evtSource.onerror = (err) => {
    console.error("SSE error:", err);
    evtSource.close();
  };

  return () => evtSource.close();
}, [user?.group_id, activeTab]);


  // ---------------- Handlers ----------------
  const handleSendMessage = (msg: string, parentId: number | null = null) => {
  if (!msg.trim()) return;
  if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
    toast({ title: "Not connected", description: "WebSocket not open yet.", variant: "destructive" });
    return;
  }

  wsRef.current.send(JSON.stringify({
    action: "send",
    message: msg,
    parent_id: parentId
  }));

  setNewMessage("");
};

const handleDeleteMessage = (id: number) => {
  if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

  wsRef.current.send(JSON.stringify({
    action: "delete",
    doubt_id: id
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
      doc.document_id === Number(modalDocId)
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
const handleScroll = (e) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  const atBottom = scrollHeight - scrollTop - clientHeight < 50;

  setIsAtBottom(atBottom);

  // Hide "new message" button when at bottom
  if (atBottom) setShowNewMessageButton(false);
};

  // ---------------- Render ----------------
  return (
    <div className="container mx-auto px-4 py-6">
      <Button
        variant="outline"
        className="mb-6"
        onClick={() => {
          try {
            const lastVisitedKey = `gd:lastVisited:${user.id}:${user.group_id}`;
            localStorage.setItem(lastVisitedKey, new Date().toISOString());
          } catch (e) {}
          setActiveTab(null)
        }}
      >
        ← Back to Dashboard
      </Button>

      {/* ------------------Discussion---------------------------*/}
      {activeTab === "discussion" && (
  <Card className="shadow-lg border border-gray-200">
    <CardHeader>
      <CardTitle className="text-lg font-semibold">Group Discussion</CardTitle>
    </CardHeader>

    <CardContent>
      <ScrollArea ref={scrollViewportRef} className="h-96 mb-4 pr-2" onScrollCapture={handleScroll}>
        <div className="flex flex-col space-y-3">
          {loadingMessages
            ? Array.from({ length: 5 }).map((_, i) => <MessageSkeleton key={i} />)
            : messages.map((msg) => {
                const isSender = msg.author === user.name;
                const repliedMessage = msg.reply_to
                  ? messages.find((m) => m.id === msg.reply_to)
                  : null;

                // 🌟 Define role-based colors
                const roleStyles = {
                  lecturer: "bg-yellow-100 border-l-4 border-yellow-400",
                  student: "bg-blue-100 border-l-4 border-blue-400",
                };

                const bubbleClass =
  isSender
    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-none"
    : msg.role === "lecturer"
    ? "bg-yellow-100 text-gray-900 rounded-bl-none"
    : msg.role === "student"
    ? "bg-blue-100 text-gray-900 rounded-bl-none"
    : msg.role === "system"
    ? "bg-gray-200 text-gray-600 italic text-center rounded-lg"
    : "bg-gray-100 text-gray-900 rounded-bl-none";

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isSender ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`relative max-w-xs px-4 py-3 rounded-2xl break-words shadow-sm hover:shadow-md transition-all ${bubbleClass}`}
                    >
                      {msg.role !== "system" && (
  <div className="absolute top-1 right-2">
    <button
      className={`${
        isSender ? "text-white/80 hover:text-white" : "text-gray-700 hover:text-gray-900"
      } text-xl font-bold`}
      onClick={() =>
        setOpenDropdowns((prev) => ({
          ...prev,
          [msg.id]: !prev[msg.id],
        }))
      }
    >
      ⋮
    </button>
    {openDropdowns[msg.id] && (
      <div className="absolute right-0 mt-2 w-28 bg-gray-800 text-white border border-gray-700 rounded-md shadow-xl z-20">
        <button
          className="block w-full text-left px-4 py-2 hover:bg-gray-700"
          onClick={() => {
            setReplyParentId(msg.id);
            setOpenDropdowns({});
          }}
        >
          Reply
        </button>
        {isSender && (
          <button
            className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-red-400"
            onClick={() => {
              setConfirmDeleteId(msg.id);
              setOpenDropdowns({});
            }}
          >
            Delete
          </button>
        )}
      </div>
    )}
  </div>
)}
                      {/* Replied message preview */}
                      {repliedMessage && (
                        <div className="border-l-2 border-gray-400 pl-3 mb-2 text-xs bg-gray-200/60 rounded-md px-2 py-1">
                          <p className="font-semibold mb-1 text-gray-700">
                            {repliedMessage.author}
                          </p>
                          <p className="font-bold text-gray-600 line-clamp-2">
                            {repliedMessage.content.length > 80
                              ? repliedMessage.content.slice(0, 80) + "..."
                              : repliedMessage.content}
                          </p>
                        </div>
                      )}

                      {/* Author label (only for others) */}
                      {!isSender && (
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-sm font-semibold">
                            {msg.author}
                          </span>
                          <span className="text-xs text-gray-600">
                            {msg.role === "lecturer" ? "👩‍🏫" : "🎓"}
                          </span>
                        </div>
                      )}

                      {/* Message Content */}
                      <p className="text-sm">{msg.content}</p>

                      {/* Timestamp */}
                      <p
                        className={`text-xs mt-1 opacity-50 ${
                          isSender ? "text-white/70" : "text-gray-500"
                        }`}
                      >
                        {format(new Date(msg.timestamp), "MMM dd, HH:mm")}
                      </p>
                    </div>
                  </div>
                );
              })}
        <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {showNewMessageButton && (
  <div className="flex justify-center mb-2">
    <button
      onClick={() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setShowNewMessageButton(false);
      }}
      className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm shadow-md hover:bg-blue-700"
    >
      ⬇️ New Messages
    </button>
  </div>
)}

      {/* Reply Section */}
      {replyParentId &&
        (() => {
          const replied = messages.find((m) => m.id === replyParentId);
          if (!replied) return null;
          return (
            <div className="flex items-center justify-between bg-white border-l-4 border-blue-600 px-3 py-2 rounded-t-lg shadow-sm">
              <div className="flex flex-col overflow-hidden">
                <span className="text-blue-700 font-semibold text-sm">
                  {replied.author}
                </span>
                <span className="text-gray-700 text-xs truncate max-w-xs">
                  {replied.content}
                </span>
              </div>
              <button
                className="text-blue-600 hover:text-blue-800 ml-4 text-lg font-bold"
                onClick={() => setReplyParentId(null)}
              >
                ✕
              </button>
            </div>
          );
        })()}

      {/* Message Input */}
      <div className="flex space-x-2 mt-2">
        <Input
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newMessage.trim()) {
              handleSendMessage(newMessage, replyParentId);
              setNewMessage("");
              setReplyParentId(null);
            }
          }}
        />
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => {
            if (newMessage.trim()) {
              handleSendMessage(newMessage, replyParentId);
              setNewMessage("");
              setReplyParentId(null);
            }
          }}
        >
          Send
        </Button>
      </div>
    </CardContent>
  </Card>
)}
{/* ---------------- Delete Confirmation ---------------- */}
{confirmDeleteId && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
    <div className="bg-white rounded-xl shadow-xl p-6 w-80 text-center space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Delete Message?</h2>
      <p className="text-sm text-gray-600">
        Are you sure you want to delete this message? This action cannot be undone.
      </p>
      <div className="flex justify-center space-x-3 pt-2">
        <Button
          variant="outline"
          onClick={() => setConfirmDeleteId(null)}
          className="px-4 py-2 rounded-lg"
        >
          Cancel
        </Button>

        <Button
          onClick={() => {
            handleDeleteMessage(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
        >
          Delete
        </Button>
      </div>
    </div>
  </div>
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
  {formatTimestamp(ann.uploaded_at || ann.created_at)} • {ann.lecturer_name}
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