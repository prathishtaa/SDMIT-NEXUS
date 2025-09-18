import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageCircle, Send, FileCheck, BookOpen, Calendar } from "lucide-react"
import api from "@/services/api"
import { format, isValid, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast"

// Skeletons
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

export default function StudentTabs({ activeTab, setActiveTab, user }) {
  const { toast } = useToast()
  const [messages, setMessages] = useState([])
  const [announcements, setAnnouncements] = useState<{ materials: any[]; events: any[] }>({
    materials: [],
    events: [],
  });
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [selectedLecturer, setSelectedLecturer] = useState<string>("all")

  // Lazy fetch per tab
  useEffect(() => {
    if (!activeTab) return

    const fetchData = async () => {
      setLoading(true)
      try {
        if (activeTab === "discussion") {
          const res = await api.get(`/groups/${user.group_id}/doubts`)
          setMessages(res.data)
        } else if (activeTab === "announcements") {
          const res = await api.get(`/groups/${user.group_id}/announcements`)
          setAnnouncements(res.data)
        } else if (activeTab === "documents") {
          const res = await api.get(`/groups/${user.group_id}/documents`)
          setDocuments(res.data)
        }
      } catch {
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeTab, user.group_id, toast])
  // Send message
  const handleSendMessage = async (msg) => {
    if (!msg.trim()) return
    try {
      const res = await api.post(`/groups/${user.group_id}/messages`, { content: msg })
      setMessages((prev) => [...prev, res.data])
      toast({ title: "Message Sent", description: "Your message has been posted." })
    } catch {
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" })
    }
  }

  // Sign document
  const handleSignDocument = async (docId) => {
    try {
      const res = await api.post(`/documents/${docId}/sign`)
      setDocuments((prev) => prev.map((doc) => (doc.id === docId ? res.data : doc)))
      toast({ title: "Document Signed", description: "Your signature has been added." })
    } catch {
      toast({ title: "Error", description: "Failed to sign document.", variant: "destructive" })
    }
  }
  const materialAnnouncements = announcements.materials;
  const eventAnnouncements = announcements.events;
  const lecturerOptions = Array.from(
    new Set([
      ...materialAnnouncements.map(m => m.lecturer_name),
      ...eventAnnouncements.map(e => e.lecturer_name)
    ].filter(Boolean))
  )

  // Filter announcements by lecturer
  const filteredMaterials = selectedLecturer === "all"
    ? materialAnnouncements
    : materialAnnouncements.filter(m => m.lecturer_name === selectedLecturer)

  const filteredEvents = selectedLecturer === "all"
    ? eventAnnouncements
    : eventAnnouncements.filter(e => e.lecturer_name === selectedLecturer)

  function normalizeTimestamp(ts?: string | null): string | null {
    if (!ts) return null;
    const s = String(ts).trim();
    return s.replace(/(\.\d{3})\d+/, '$1');
  }

  function formatTimestamp(ts?: string | null) {
    const norm = normalizeTimestamp(ts);
    if (!norm) return "No date available";
    const d = parseISO(norm);
    if (!isValid(d)) {
      console.warn("Invalid timestamp encountered:", ts);
      return "Invalid date";
    }
    return format(d, "MMM dd, yyyy HH:mm");
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Button variant="outline" className="mb-6" onClick={() => setActiveTab(null)}>
        ← Back to Dashboard
      </Button>

      {/* Discussion */}
      {activeTab === "discussion" && (
        <Card>
          <CardHeader>
            <CardTitle>Group Discussion</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 mb-4">
              <div className="space-y-4">
                {loading
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
                {loading
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
                {loading
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

      {/* Documents */}
      {activeTab === "documents" && (
        <Card>
          <CardHeader>
            <CardTitle>Document Signing</CardTitle>
          </CardHeader>
          <CardContent>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <DocumentSkeleton key={i} />)
              : documents.map((doc) => {
                  const hasSigned = doc.signatures.some((sig) => sig.studentUSN === user?.usn)
                  return (
                    <div key={doc.id} className="p-4 border rounded-lg mb-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{doc.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            Uploaded by {doc.uploadedBy} •{" "}
                            {format(new Date(doc.timestamp), "MMM dd, yyyy")}
                          </p>
                        </div>
                        {hasSigned ? (
                          <Badge variant="default">
                            <FileCheck className="h-3 w-3 mr-1" /> Signed
                          </Badge>
                        ) : (
                          <Button onClick={() => handleSignDocument(doc.id)}>
                            <FileCheck className="h-4 w-4 mr-1" /> Sign
                          </Button>
                        )}
                      </div>
                      <Separator className="my-3" />
                      <p className="text-sm font-medium mb-2">
                        Signatures ({doc.signatures.length})
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {doc.signatures.map((sig, i) => (
                          <div key={i} className="text-xs p-2 bg-muted rounded">
                            <p className="font-medium">{sig.studentName}</p>
                            <p className="text-muted-foreground">{sig.studentUSN}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
