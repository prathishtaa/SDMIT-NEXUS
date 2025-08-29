import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/navbar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { authService } from "@/lib/auth"
import { dataManager, type Message, type Announcement, type Document } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"
import { MessageCircle, Megaphone, FileText, Send, Trash2, FileCheck, Heart, MessageSquare, Calendar, BookOpen } from "lucide-react"
import { format } from "date-fns"

export default function StudentDashboard() {
  const [messages] = useState<Message[]>(dataManager.getMessages())
  const [announcements] = useState<Announcement[]>(dataManager.getAnnouncements())
  const [documents] = useState<Document[]>(dataManager.getDocuments())
  const [newMessage, setNewMessage] = useState("")
  const { toast } = useToast()
  
  const user = authService.getCurrentUser()
  const currentYear = user?.year || 4
  const currentBranch = user?.branch || "Artificial Intelligence & Data Science"

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      dataManager.addMessage({
        author: user?.name || 'Student',
        content: newMessage,
        role: 'student'
      })
      setNewMessage("")
      toast({
        title: "Message Sent",
        description: "Your message has been posted to the group.",
      })
    }
  }

  const handleSignDocument = (docId: string) => {
    if (user?.usn) {
      dataManager.signDocument(docId, {
        studentName: user.name,
        studentUSN: user.usn,
        timestamp: new Date()
      })
      toast({
        title: "Document Signed",
        description: "Your signature has been added to the document.",
      })
    }
  }

  const filteredAnnouncements = announcements.filter(ann => 
    !ann.targetYear || ann.targetYear === currentYear || 
    !ann.targetBranch || ann.targetBranch === currentBranch
  )

  const materialAnnouncements = filteredAnnouncements.filter(ann => ann.type === 'material')
  const eventAnnouncements = filteredAnnouncements.filter(ann => ann.type === 'event')

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar showBack backTo="/login" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Student Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {user?.name} • {currentBranch} • Year {currentYear}
          </p>
        </div>

        <Tabs defaultValue="discussion" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discussion" className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>Group Discussion</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center space-x-2">
              <Megaphone className="h-4 w-4" />
              <span>Announcements</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Document Signing</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discussion">
            <Card>
              <CardHeader>
                <CardTitle>Group Discussion</CardTitle>
                <CardDescription>
                  Chat with your classmates and lecturers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 mb-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${
                          message.role === 'lecturer' ? 'bg-primary' : 'bg-secondary'
                        }`}>
                          {message.role === 'lecturer' ? (
                            <MessageCircle className="h-4 w-4 text-white" />
                          ) : (
                            <MessageCircle className="h-4 w-4 text-secondary-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-sm">{message.author}</p>
                            <Badge variant={message.role === 'lecturer' ? 'default' : 'secondary'}>
                              {message.role}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {format(message.timestamp, 'MMM dd, HH:mm')}
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
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Materials */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5" />
                    <span>Materials</span>
                  </CardTitle>
                  <CardDescription>Notes, assignments, and study materials</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {materialAnnouncements.map((announcement) => (
                        <div key={announcement.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">{announcement.title}</h4>
                            <Badge variant="outline">{announcement.author}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{announcement.content}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(announcement.timestamp, 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Events */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Events</span>
                  </CardTitle>
                  <CardDescription>College events and activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {eventAnnouncements.map((announcement) => (
                        <div key={announcement.id} className="border rounded-lg overflow-hidden">
                          {announcement.imageUrl && (
                            <div className="h-32 bg-gradient-primary"></div>
                          )}
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium">{announcement.title}</h4>
                              <Badge variant="outline">{announcement.author}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{announcement.content}</p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                {format(announcement.timestamp, 'MMM dd, yyyy')}
                              </p>
                              <div className="flex items-center space-x-4">
                                <Button variant="ghost" size="sm">
                                  <Heart className="h-4 w-4 mr-1" />
                                  24
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <MessageSquare className="h-4 w-4 mr-1" />
                                  {announcement.comments?.length || 0}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Document Signing</CardTitle>
                <CardDescription>
                  Sign important documents and forms (Read-only access)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {documents.map((document) => {
                    const hasSigned = document.signatures.some(sig => sig.studentUSN === user?.usn)
                    
                    return (
                      <div key={document.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{document.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Uploaded by {document.uploadedBy} • {format(document.timestamp, 'MMM dd, yyyy')}
                            </p>
                          </div>
                          {hasSigned ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <FileCheck className="h-3 w-3 mr-1" />
                              Signed
                            </Badge>
                          ) : (
                            <Button 
                              size="sm" 
                              onClick={() => handleSignDocument(document.id)}
                              className="bg-gradient-primary hover:opacity-90"
                            >
                              <FileCheck className="h-4 w-4 mr-1" />
                              Sign
                            </Button>
                          )}
                        </div>
                        
                        <Separator className="my-3" />
                        
                        <div>
                          <p className="text-sm font-medium mb-2">
                            Signatures ({document.signatures.length})
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {document.signatures.map((signature, index) => (
                              <div key={index} className="text-xs p-2 bg-muted rounded">
                                <p className="font-medium">{signature.studentName}</p>
                                <p className="text-muted-foreground">{signature.studentUSN}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}