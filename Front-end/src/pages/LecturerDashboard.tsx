import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Navbar } from "@/components/navbar"
import { authService } from "@/lib/auth"
import { dataManager, type Message, type Announcement, type Document } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"
import { MessageCircle, Megaphone, FileText, Send, Plus, Eye, Upload, Trash2 } from "lucide-react"
import { format } from "date-fns"

interface SelectedGroup {
  branch: string
  year: number
}

export default function LecturerDashboard() {
  const [selectedGroups, setSelectedGroups] = useState<SelectedGroup[]>([])
  const [messages] = useState<Message[]>(dataManager.getMessages())
  const [announcements] = useState<Announcement[]>(dataManager.getAnnouncements())
  const [documents] = useState<Document[]>(dataManager.getDocuments())
  const [newMessage, setNewMessage] = useState("")
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false)
  const [showDocumentDialog, setShowDocumentDialog] = useState(false)
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    type: 'material',
    targetYear: '',
    targetBranch: ''
  })
  const [newDocument, setNewDocument] = useState({
    title: '',
    file: null as File | null
  })
  const { toast } = useToast()
  
  const user = authService.getCurrentUser()

  useEffect(() => {
    const groups = localStorage.getItem('lecturer_groups')
    if (groups) {
      setSelectedGroups(JSON.parse(groups))
    }
  }, [])

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      dataManager.addMessage({
        author: user?.name || 'Lecturer',
        content: newMessage,
        role: 'lecturer'
      })
      setNewMessage("")
      toast({
        title: "Message Sent",
        description: "Your message has been posted to the group.",
      })
    }
  }

  const handleDeleteMessage = (messageId: string) => {
    dataManager.deleteMessage(messageId)
    toast({
      title: "Message Deleted",
      description: "The message has been removed.",
    })
  }

  const handleCreateAnnouncement = () => {
    if (newAnnouncement.title && newAnnouncement.content) {
      dataManager.addAnnouncement({
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        type: newAnnouncement.type as 'material' | 'event',
        author: user?.name || 'Lecturer',
        targetYear: newAnnouncement.targetYear ? parseInt(newAnnouncement.targetYear) : undefined,
        targetBranch: newAnnouncement.targetBranch || undefined
      })
      
      setNewAnnouncement({
        title: '',
        content: '',
        type: 'material',
        targetYear: '',
        targetBranch: ''
      })
      setShowAnnouncementDialog(false)
      
      toast({
        title: "Announcement Posted",
        description: "Your announcement has been published.",
      })
    }
  }

  const handleUploadDocument = () => {
    if (newDocument.title) {
      dataManager.addDocument({
        title: newDocument.title,
        uploadedBy: user?.name || 'Lecturer'
      })
      
      setNewDocument({
        title: '',
        file: null
      })
      setShowDocumentDialog(false)
      
      toast({
        title: "Document Uploaded",
        description: "Document is now available for signing.",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar showBack backTo="/lecturer-groups" />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Lecturer Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {user?.name} • Managing {selectedGroups.length} group{selectedGroups.length > 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedGroups.map((group, index) => (
              <Badge key={index} variant="outline">
                {group.branch} - Year {group.year}
              </Badge>
            ))}
          </div>
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
                  Interact with your students and manage discussions
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
                          <MessageCircle className={`h-4 w-4 ${
                            message.role === 'lecturer' ? 'text-white' : 'text-secondary-foreground'
                          }`} />
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
                            {message.role === 'student' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMessage(message.id)}
                                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
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
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Announcements</h2>
                <div className="flex space-x-2">
                  <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-primary hover:opacity-90">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Post
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create Announcement</DialogTitle>
                        <DialogDescription>
                          Post materials or events for your students
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Title</Label>
                          <Input
                            id="title"
                            value={newAnnouncement.title}
                            onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                            placeholder="Enter announcement title"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="content">Content</Label>
                          <Textarea
                            id="content"
                            value={newAnnouncement.content}
                            onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                            placeholder="Enter announcement content"
                            rows={3}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={newAnnouncement.type} onValueChange={(value) => setNewAnnouncement({...newAnnouncement, type: value})}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="material">Material</SelectItem>
                                <SelectItem value="event">Event</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Target Year (Optional)</Label>
                            <Select value={newAnnouncement.targetYear} onValueChange={(value) => setNewAnnouncement({...newAnnouncement, targetYear: value})}>
                              <SelectTrigger>
                                <SelectValue placeholder="All years" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Year 1</SelectItem>
                                <SelectItem value="2">Year 2</SelectItem>
                                <SelectItem value="3">Year 3</SelectItem>
                                <SelectItem value="4">Year 4</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <Button onClick={handleCreateAnnouncement} className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Announcement
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    View All Posts
                  </Button>
                </div>
              </div>
              
              <div className="grid gap-4">
                {announcements
                  .filter(ann => ann.author === user?.name)
                  .map((announcement) => (
                    <Card key={announcement.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{announcement.title}</h4>
                            <p className="text-sm text-muted-foreground">{announcement.content}</p>
                          </div>
                          <Badge variant={announcement.type === 'material' ? 'default' : 'secondary'}>
                            {announcement.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Posted {format(announcement.timestamp, 'MMM dd, yyyy HH:mm')}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Document Signing</h2>
                <div className="flex space-x-2">
                  <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-primary hover:opacity-90">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                        <DialogDescription>
                          Upload a document for students to sign
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="docTitle">Document Title</Label>
                          <Input
                            id="docTitle"
                            value={newDocument.title}
                            onChange={(e) => setNewDocument({...newDocument, title: e.target.value})}
                            placeholder="Enter document title"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="file">Choose File</Label>
                          <Input
                            id="file"
                            type="file"
                            onChange={(e) => setNewDocument({...newDocument, file: e.target.files?.[0] || null})}
                            className="cursor-pointer"
                          />
                          <p className="text-xs text-muted-foreground">
                            Supported formats: PDF, DOC, DOCX
                          </p>
                        </div>
                        
                        <Button onClick={handleUploadDocument} className="w-full">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Document
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    View Signatures
                  </Button>
                </div>
              </div>
              
              <div className="grid gap-4">
                {documents
                  .filter(doc => doc.uploadedBy === user?.name)
                  .map((document) => (
                    <Card key={document.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{document.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {document.signatures.length} signature{document.signatures.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {format(document.timestamp, 'MMM dd, yyyy')}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Uploaded {format(document.timestamp, 'MMM dd, yyyy HH:mm')}
                          </p>
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}