import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  MessageCircle,
  Megaphone,
  FileText,
  Send,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import { authService } from "@/lib/auth";
import {
  dataManager,
  type Message,
  type Announcement,
  type Document,
  type Signature,
} from "@/lib/data";

export default function LecturerDashboard() {
  const { groupId } = useParams<{ groupId: string }>();
  const user = authService.getCurrentUser();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  const [newMessage, setNewMessage] = useState("");
  const [newAnnTitle, setNewAnnTitle] = useState("");
  const [newAnnContent, setNewAnnContent] = useState("");
  const [newAnnType, setNewAnnType] = useState<"material" | "event">("material");
  const [newAnnFile, setNewAnnFile] = useState<File | null>(null);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [newDocDeadline, setNewDocDeadline] = useState("");
  const [isAnnDialogOpen, setIsAnnDialogOpen] = useState(false);
  const [isDocDialogOpen, setIsDocDialogOpen] = useState(false);

  // ---------------------- FETCH DATA ----------------------
  useEffect(() => {
  const fetchData = async () => {
    try {
      const [anns, docs] = await Promise.all([
        dataManager.getAnnouncements(Number(groupId)),
        dataManager.getDocuments(Number(groupId)),
      ]);
      setAnnouncements(anns);
      setDocuments(docs);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (groupId) fetchData();
}, [groupId]);



  // ---------------------- MESSAGES ----------------------
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const msgPayload: Omit<Message, "id" | "timestamp"> = {
      author: user?.name || "Lecturer",
      content: newMessage,
      role: "lecturer",
    };

    try {
      const saved = await dataManager.addMessage(msgPayload);
      setMessages((prev) => [...prev, saved]);
      setNewMessage("");
      toast({ title: "Message Sent", description: "Your message has been posted." });
    } catch {
      toast({ title: "Error", description: "Could not send message", variant: "destructive" });
    }
  };

  // ---------------------- ANNOUNCEMENTS ----------------------
  const handleAddAnnouncement = async () => {
    if (!newAnnTitle.trim() || !newAnnContent.trim() || !newAnnType) {
      toast({
        title: "Missing Fields",
        description: "Fill in title, content, and type.",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("group_id", String(groupId));
      formData.append("title", newAnnTitle);
      formData.append("content", newAnnContent);
      formData.append("type", newAnnType);
      if (newAnnFile) formData.append("file", newAnnFile);

      const newAnn = await dataManager.addAnnouncement(formData);
      // convert timestamp string to Date
      newAnn.timestamp = new Date(newAnn.timestamp) as any;

      setAnnouncements((prev) => [...prev, newAnn]);
      setNewAnnTitle("");
      setNewAnnContent("");
      setNewAnnFile(null);
      setIsAnnDialogOpen(false);

      toast({ title: "Announcement Added", description: "Your announcement has been posted." });
    } catch {
      toast({ title: "Error", description: "Could not post announcement", variant: "destructive" });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await dataManager.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Announcement Deleted" });
    } catch {
      toast({ title: "Error", description: "Could not delete announcement", variant: "destructive" });
    }
  };

  // ---------------------- DOCUMENTS ----------------------
  const handleUploadDocument = async () => {
    if (!newDocTitle.trim() || !newDocFile) {
      toast({ title: "Missing Fields", description: "Provide both title and file.", variant: "destructive" });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("group_id", String(groupId)); // integer as string is fine
      formData.append("title", newDocTitle);        // string
      formData.append("deadline", newDocDeadline);  // string in ISO format, e.g., "2025-09-20T23:59:00"
      formData.append("file", newDocFile);          // must be a File object

      const newDoc = await dataManager.addDocument(formData);
      setDocuments((prev) => [...prev, newDoc]);
      setNewDocTitle("");
      setNewDocFile(null);
      setNewDocDeadline("");
      setIsDocDialogOpen(false);
      toast({ title: "Document Uploaded", description: "Students can now sign this document." });
    } catch {
      toast({ title: "Error", description: "Could not upload document", variant: "destructive" });
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!id) {
    console.error("No ID provided to delete announcement");
    toast({
      title: "Error",
      description: "Invalid announcement ID",
      variant: "destructive",
    });
    return;
  }
    try {
      await dataManager.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast({ title: "Document Deleted" });
    } catch {
      toast({ title: "Error", description: "Could not delete document", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar showBack backTo="/login" />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Lecturer Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">Welcome back, {user?.name}</p>
        </div>

        <Tabs defaultValue="discussion" className="space-y-6">
          {/* ---------------- TABS LIST ---------------- */}
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discussion" className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" /> <span>Group Discussion</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center space-x-2">
              <Megaphone className="h-4 w-4" /> <span>Announcements</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" /> <span>Documents</span>
            </TabsTrigger>
          </TabsList>

          {/* ---------------- DISCUSSION ---------------- */}
          <TabsContent value="discussion">
            <Card>
              <CardHeader>
                <CardTitle>Group Discussion</CardTitle>
                <CardDescription>Chat with students</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 mb-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className="flex items-start space-x-3">
                        <div
                          className={`p-2 rounded-full ${
                            msg.role === "lecturer" ? "bg-primary" : "bg-secondary"
                          }`}
                        >
                          <MessageCircle
                            className={`h-4 w-4 ${
                              msg.role === "lecturer" ? "text-white" : "text-secondary-foreground"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-sm">{msg.author}</p>
                            <Badge variant={msg.role === "lecturer" ? "default" : "secondary"}>
                              {msg.role}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {format(msg.timestamp, "MMM dd, HH:mm")}
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
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- ANNOUNCEMENTS ---------------- */}
          <TabsContent value="announcements">
            <div className="flex justify-end mb-4">
              <Dialog open={isAnnDialogOpen} onOpenChange={setIsAnnDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-1" /> New Announcement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Announcement</DialogTitle>
                  </DialogHeader>
                  <Input
                    placeholder="Title"
                    value={newAnnTitle}
                    onChange={(e) => setNewAnnTitle(e.target.value)}
                    className="mb-2"
                  />
                  <Textarea
                    placeholder="Content"
                    value={newAnnContent}
                    onChange={(e) => setNewAnnContent(e.target.value)}
                    className="mb-2"
                  />
                  <Select
                    value={newAnnType}
                    onValueChange={(value: "material" | "event") => setNewAnnType(value)}
                  >
                    <SelectTrigger className="mb-2">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="file"
                    onChange={(e) => setNewAnnFile(e.target.files?.[0] || null)}
                    className="mb-2"
                  />
                  <Button onClick={handleAddAnnouncement}>
                    <Upload className="h-4 w-4 mr-1" /> Post
                  </Button>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {announcements.map((ann) => (
                <Card key={ann.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{ann.title}</span>
                        <Badge variant={ann.type === "material" ? "default" : "secondary"}>
                          {ann.type === "material" ? "Material" : "Event"}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      {ann.author} • {format(ann.timestamp, "MMM dd, yyyy HH:mm")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">{ann.content}</p>
                    {ann.fileUrl && (
                      <a
                        href={ann.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 underline"
                      >
                        View Attachment
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ---------------- DOCUMENTS ---------------- */}
<TabsContent value="documents">
  <div className="flex justify-end mb-4">
    <Dialog open={isDocDialogOpen} onOpenChange={setIsDocDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" /> Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload New Document</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Title"
          value={newDocTitle}
          onChange={(e) => setNewDocTitle(e.target.value)}
          className="mb-2"
        />
        <Input
          type="datetime-local"
          placeholder="Select deadline"
          value={newDocDeadline}
          onChange={(e) => setNewDocDeadline(e.target.value)}
          className="mb-2"
        />
        <Input
          type="file"
          onChange={(e) => setNewDocFile(e.target.files?.[0] || null)}
          className="mb-2"
        />
        <Button onClick={handleUploadDocument}>
          <Upload className="h-4 w-4 mr-1" /> Upload
        </Button>
      </DialogContent>
    </Dialog>
  </div>

  <div className="space-y-4">
    {documents
      .slice()
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
      .map((doc) => (
      <Card key={doc.id}> 
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{doc.title}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteDocument(doc.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            Uploaded by {doc.author_name} • {format(new Date(doc.uploaded_at), "MMM dd, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {doc.fileUrl && (
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 underline mb-1 block"
            >
              View Document
            </a>
          )}

          {doc.deadline && (
            <p className="text-sm text-red-600 mb-2">
              Deadline: {format(new Date(doc.deadline), "MMM dd, yyyy HH:mm")}
            </p>
          )}

          <Separator className="my-3" />
          <p className="text-sm font-medium mb-2">Signatures ({doc.signatures.length})</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {doc.signatures.map((sig, i) => (
              <div key={i} className="text-xs p-2 bg-muted rounded">
                <p className="font-medium">{sig.studentName}</p>
                <p className="text-muted-foreground">{format(new Date(sig.timestamp), "MMM dd, HH:mm")}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
</TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
