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


  // Loading states per tab
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false)
  const [loadingDocuments, setLoadingDocuments] = useState(false)

  const [newMessage, setNewMessage] = useState("")
  const [selectedLecturer, setSelectedLecturer] = useState("all")

  // Lazy fetch per tab
  useEffect(() => {
    if (!activeTab) return

    const fetchData = async () => {
  try {
    if (!user.group_id) {
      console.warn("No group_id, skipping fetch")
      return
    }

    if (activeTab === "discussion") {
      setLoadingMessages(true)
      const res = await api.get(`/groups/${user.group_id}/doubts`)
      console.log("Discussion data:", res.data)
      setMessages(res.data || [])
    } else if (activeTab === "announcements") {
      setLoadingAnnouncements(true)
      const res = await api.get(`/groups/${user.group_id}/announcements`)
      setAnnouncements(res.data || { materials: [], events: [] })
    } else if (activeTab === "documents") {
      setLoadingDocuments(true)
      const res = await api.get(`/groups/documents`)
      setDocuments(res.data.documents)
    }
  } catch (err) {
    console.error(err)
    toast({ title: "Error", description: "Failed to load data", variant: "destructive" })
  } finally {
    setLoadingMessages(false)
    setLoadingAnnouncements(false)
    setLoadingDocuments(false)
  }
}


    fetchData()
  }, [activeTab, user.group_id, toast])

  // ---------------- Handlers ----------------
  const handleSendMessage = async (msg: string) => {
    if (!msg.trim()) return
    try {
      const res = await api.post(`/groups/${user.group_id}/messages`, { content: msg })
      setMessages((prev) => [...prev, res.data])
      toast({ title: "Message Sent", description: "Your message has been posted." })
    } catch {
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" })
    }
  }

  const handleSignDocument = async (docId: string) => {
    try {
      const res = await api.post(`/documents/${docId}/sign`)
      setDocuments((prev) => prev.map((doc) => (doc.id === docId ? res.data : doc)))
      toast({ title: "Document Signed", description: "Your signature has been added." })
    } catch {
      toast({ title: "Error", description: "Failed to sign document.", variant: "destructive" })
    }
  }

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
          // Sort by deadline ascending; null deadlines go last
          .sort((a, b) => {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          })
          .map((doc) => {
            const now = new Date();
            const deadline = doc.deadline ? new Date(doc.deadline) : null;
            const isExpired = deadline ? deadline < now : false;

            const hasSigned = doc.signatures?.some(
              (sig) => sig.studentUSN === user?.usn
            );

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
                      onClick={() => setModalDocId(doc.document_id)} // open webcam modal
                    >
                      <FileCheck className="h-4 w-4 mr-1" /> Sign
                    </Button>
                  )}
                </div>
              </div>
            );
          })
      )}

      {/* Webcam Modal inline */}
      {modalDocId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md text-center space-y-4">
            <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg" />
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setModalDocId(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!videoRef.current || !canvasRef.current) return;
                  const video = videoRef.current;
                  const canvas = canvasRef.current;
                  const ctx = canvas.getContext("2d")!;
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const photo = canvas.toDataURL("image/jpeg");

                  try {
                    const res = await api.post(`/documents/${modalDocId}/sign`, { photo });
                    setDocuments((prev) =>
                      prev.map((doc) =>
                        doc.document_id === modalDocId ? res.data : doc
                      )
                    );
                    toast({ title: "Document Signed", description: "Your signature has been added." });
                  } catch {
                    toast({ title: "Error", description: "Failed to sign document.", variant: "destructive" });
                  } finally {
                    setModalDocId(null);
                  }
                }}
              >
                Capture & Sign
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
