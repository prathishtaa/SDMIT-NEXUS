import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/navbar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { authService } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { MessageCircle, Megaphone, FileText, Send, FileCheck, BookOpen, Calendar } from "lucide-react"
import { format } from "date-fns"
import api from "@/services/api"

// --- Skeleton components ---
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

export default function StudentDashboard() {
  const [messages, setMessages] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [documents, setDocuments] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)

  const { toast } = useToast()
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  // --- Protect route ---
  useEffect(() => {
    if (!user || user.role !== "student") {
      navigate("/login")
    }
  }, [user, navigate])

  // --- Fetch data with error handling ---
  useEffect(() => {
  if (!user?.group_id) return;

  setLoading(true);

  const fetchData = async () => {
    try {
      const [msgRes, annRes, docRes] = await Promise.all([
        api.get(`/groups/${user.group_id}/doubts`), // GET doubts/messages
        api.get(`/groups/${user.group_id}/announcements`), // GET announcements/materials + events
        api.get(`/groups/${user.group_id}/documents`), // GET documents
      ]);

      // Map backend fields to frontend-friendly keys
      const messagesMapped = msgRes.data.map((msg) => ({
        id: msg.doubt_id,
        author: msg.sender_id, // or you can fetch student/lecturer name if available
        role: msg.sender_role,
        content: msg.message,
        timestamp: msg.created_at,
      }));

      const announcementsMapped = [
        ...annRes.data.materials.map((mat) => ({
          id: mat.material_id,
          title: mat.title,
          content: mat.file_path, // or description if you have
          type: "material",
          timestamp: mat.uploaded_at,
        })),
        ...annRes.data.events.map((ev) => ({
          id: ev.event_id,
          title: ev.title,
          content: ev.description,
          type: "event",
          timestamp: ev.date,
        })),
      ];

      const documentsMapped = docRes.data.map((doc) => ({
        id: doc.document_id,
        title: doc.title,
        uploadedBy: doc.uploaded_by,
        timestamp: doc.uploaded_at,
        signatures: doc.signatures.map((sig) => ({
          studentUSN: sig.student_id,
          studentName: sig.student_name, // assuming backend sends name
        })),
      }));

      setMessages(messagesMapped);
      setAnnouncements(announcementsMapped);
      setDocuments(documentsMapped);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [user?.group_id, toast]);


  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.group_id) return

    try {
      const res = await api.post(`/groups/${user.group_id}/messages`, {
        content: newMessage,
      })
      setMessages((prev) => [...prev, res.data])
      setNewMessage("")
      toast({ title: "Message Sent", description: "Your message has been posted." })
    } catch {
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" })
    }
  }

  const handleSignDocument = async (docId) => {
    if (!user?.usn) return
    try {
      const res = await api.post(`/documents/${docId}/sign`)
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === docId ? res.data : doc))
      )
      toast({ title: "Document Signed", description: "Your signature has been added." })
    } catch {
      toast({ title: "Error", description: "Failed to sign document.", variant: "destructive" })
    }
  }

  const materialAnnouncements = announcements.filter((ann) => ann.type === "material")
  const eventAnnouncements = announcements.filter((ann) => ann.type === "event")

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar showBack backTo="/login" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Student Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {user?.name} • {user?.branch} • Year {user?.year}
          </p>
        </div>

        <Tabs defaultValue="discussion" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discussion">
              <MessageCircle className="h-4 w-4 mr-2" /> Group Discussion
            </TabsTrigger>
            <TabsTrigger value="announcements">
              <Megaphone className="h-4 w-4 mr-2" /> Announcements
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" /> Document Signing
            </TabsTrigger>
          </TabsList>

          {/* --- Discussion --- */}
          <TabsContent value="discussion">
            <Card>
              <CardHeader>
                <CardTitle>Group Discussion</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 mb-4">
                  <div className="space-y-4">
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => <MessageSkeleton key={i} />)
                      : messages.map((message) => (
                          <div key={message.id} className="flex items-start space-x-3">
                            <div
                              className={`p-2 rounded-full ${
                                message.role === "lecturer"
                                  ? "bg-primary"
                                  : "bg-secondary"
                              }`}
                            >
                              <MessageCircle className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <p className="font-medium text-sm">{message.author}</p>
                                <Badge>{message.role}</Badge>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(message.timestamp), "MMM dd, HH:mm")}
                                </p>
                              </div>
                              <p className="text-sm">{message.content}</p>
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
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Announcements --- */}
          <TabsContent value="announcements">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <BookOpen className="h-5 w-5 mr-2 inline" /> Materials
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    {loading
                      ? Array.from({ length: 4 }).map((_, i) => <AnnouncementSkeleton key={i} />)
                      : materialAnnouncements.map((announcement) => (
                          <div key={announcement.id} className="p-4 border rounded-lg mb-3">
                            <h4 className="font-medium">{announcement.title}</h4>
                            <p className="text-sm">{announcement.content}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(announcement.timestamp), "MMM dd, yyyy HH:mm")}
                            </p>
                          </div>
                        ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    <Calendar className="h-5 w-5 mr-2 inline" /> Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    {loading
                      ? Array.from({ length: 4 }).map((_, i) => <AnnouncementSkeleton key={i} />)
                      : eventAnnouncements.map((announcement) => (
                          <div key={announcement.id} className="p-4 border rounded-lg mb-3">
                            <h4 className="font-medium">{announcement.title}</h4>
                            <p className="text-sm">{announcement.content}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(announcement.timestamp), "MMM dd, yyyy")}
                            </p>
                          </div>
                        ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* --- Documents --- */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Document Signing</CardTitle>
              </CardHeader>
              <CardContent>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => <DocumentSkeleton key={i} />)
                  : documents.map((document) => {
                      const hasSigned = document.signatures.some(
                        (sig) => sig.studentUSN === user?.usn
                      )

                      return (
                        <div key={document.id} className="p-4 border rounded-lg mb-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">{document.title}</h4>
                              <p className="text-xs text-muted-foreground">
                                Uploaded by {document.uploadedBy} •{" "}
                                {format(new Date(document.timestamp), "MMM dd, yyyy")}
                              </p>
                            </div>
                            {hasSigned ? (
                              <Badge variant="default">
                                <FileCheck className="h-3 w-3 mr-1" /> Signed
                              </Badge>
                            ) : (
                              <Button onClick={() => handleSignDocument(document.id)}>
                                <FileCheck className="h-4 w-4 mr-1" /> Sign
                              </Button>
                            )}
                          </div>

                          <Separator className="my-3" />
                          <p className="text-sm font-medium mb-2">
                            Signatures ({document.signatures.length})
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {document.signatures.map((signature, i) => (
                              <div key={i} className="text-xs p-2 bg-muted rounded">
                                <p className="font-medium">{signature.studentName}</p>
                                <p className="text-muted-foreground">{signature.studentUSN}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
