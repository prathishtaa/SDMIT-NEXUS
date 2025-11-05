import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

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
import ConfirmButton from "@/components/Confirmation";
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
import api from "@/services/api";

export default function LecturerDashboard() {
  const { groupId } = useParams<{ groupId: string }>();
  const user = authService.getCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyParentId, setReplyParentId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [openDropdowns, setOpenDropdowns] = useState<{ [id: string]: boolean }>({});
  const wsRef = useRef<WebSocket | null>(null);

  const messagesEndRef = useRef(null);
  const scrollViewportRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMessageButton, setShowNewMessageButton] = useState(false);

  const [newMessage, setNewMessage] = useState("");
  const [newAnnTitle, setNewAnnTitle] = useState("");
  const [newAnnContent, setNewAnnContent] = useState("");
  const [newAnnType, setNewAnnType] = useState<"material" | "event">("material");
  const [newAnnFile, setNewAnnFile] = useState<File | null>(null);
  const [isAnnDialogOpen, setIsAnnDialogOpen] = useState(false);

  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [newDocDeadline, setNewDocDeadline] = useState("");
  const [isDocDialogOpen, setIsDocDialogOpen] = useState(false);
  const [deletedDocs, setDeletedDocs] = useState<Set<string>>(new Set());


  // ---------------------- AUTH & ACCESS CONTROL ----------------------
  useEffect(() => {
    if (!user || user.role !== "lecturer") {
      toast({
        title: "Access Denied",
        description: "You are not authorized to access this page.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    const lecturerGroups = user.groups || [];
    const currentGroupId = Number(groupId);
    if (!lecturerGroups.includes(currentGroupId)) {
      toast({
        title: "Access Denied",
        description: "You are not assigned to this group.",
        variant: "destructive",
      });
      navigate("/lecturer-home");
    }
  }, [groupId, navigate, toast, user]);

  // ---------------------- FETCH ANNOUNCEMENTS & DOCUMENTS ----------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [anns, docs] = await Promise.all([
          dataManager.getAnnouncements(Number(groupId)),
          dataManager.getDocuments(Number(groupId)),
        ]);

        // Deduplicate announcements by ID
        const uniqueAnns = [...new Map(anns.map(a => [a.id, a])).values()];
        setAnnouncements(uniqueAnns);

        // Format document signatures
        const formattedDocs: Document[] = docs.map((doc) => ({
          ...doc,
          signatures: Array.isArray(doc.signatures)
            ? doc.signatures.map((sig: any) => ({
                studentName: sig.name,
                studentUSN: sig.usn,
                timestamp: new Date(sig.signed_at),
              })) as Signature[]
            : [],
        }));

        // Deduplicate documents by ID
        const uniqueDocs = [...new Map(formattedDocs.map(d => [d.id, d])).values()];
        setDocuments(uniqueDocs);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (groupId) fetchData();
  }, [groupId]);

  // ---------------------- MESSAGES WEBSOCKET ----------------------
  useEffect(() => {
    if (!groupId || !user?.id) return;

    const token = localStorage.getItem("auth_token");
    const ws = new WebSocket(`ws://localhost:8000/chats/ws/group/${groupId}?token=${token}`);
    wsRef.current = ws;
    setLoadingMessages(true);


    dataManager.getMessages(Number(groupId))
      .then((msgs: any[]) => {
        const fetched = msgs.map((msg: any) => ({
          id: msg.doubt_id,
          content: msg.message,
          author: msg.sender_name,
          role: msg.sender_role,
          timestamp: msg.created_at,
          reply_to: msg.reply_to ?? null,
          sender_id: msg.sender_id, // Include sender_id for unread check
        }));
        setMessages(fetched);
      })
      .catch((err) => {
        console.error("Failed to load messages:", err);
        toast({ title: "Error", description: "Could not load messages", variant: "destructive" });
      })
      .finally(() => setLoadingMessages(false));

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.doubt_id)) return prev;
          return [
            ...prev,
            {
              id: data.doubt_id,
              content: data.message,
              author: data.sender_name || "Other",
              role: data.sender_role,
              timestamp: data.created_at,
              reply_to: data.reply_to,
            },
          ];
        });
      } else if (data.type === "delete") {
        setMessages((prev) => {
          const deleted = prev.find((m) => m.id === data.doubt_id);
          if (!deleted) return prev;
          const idx = prev.findIndex((m) => m.id === data.doubt_id);
          const filtered = prev.filter((m) => m.id !== data.doubt_id);
          filtered.splice(idx, 0, {
            id: `sys-${Date.now()}`,
            author: deleted.author,
            content: "deleted a message",
            role: "system" as any,
            timestamp: new Date(),
          });
          return filtered;
        });
      }
    };

    ws.onopen = () => console.log("✅ WebSocket connected");
    ws.onclose = () => console.warn("❌ WebSocket closed");

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [groupId, user?.id, toast]);

  useEffect(() => {
  if (isAtBottom) {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  } else {
    setShowNewMessageButton(true);
  }
  }, [messages]);

  // ---------------------- ANNOUNCEMENTS SSE ----------------------
  useEffect(() => {
    if (!groupId) return;

    const evtSource = new EventSource(`http://localhost:8000/sse/events/announcements/${groupId}`);

    evtSource.onmessage = (e) => {
      const incoming: Announcement = JSON.parse(e.data);
      setAnnouncements((prev) => {
        const exists = prev.some(a => a.id === incoming.id);
        if (exists) return prev;
        return [...prev, incoming].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });
    };

    evtSource.onerror = (err) => {
      console.error("SSE error:", err);
      evtSource.close();
    };

    return () => evtSource.close();
  }, [groupId]);

  // ---------------------- DOCUMENTS SSE ----------------------
  useEffect(() => {
    if (!groupId) return;

    const evtSource = new EventSource(`http://localhost:8000/sse/events/documents/${groupId}`);

    evtSource.onmessage = (e) => {
  const incoming: Document = JSON.parse(e.data);
  setDocuments(prev => {
    // Ignore if already in state OR if deleted
    if (prev.some(d => d.id === incoming.id) || deletedDocs.has(incoming.id)) return prev;
    return [...prev, incoming].sort(
      (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
    );
  });
};

    evtSource.onerror = (err) => {
      console.error("SSE error:", err);
      evtSource.close();
    };

    return () => evtSource.close();
  }, [groupId]);

  // ---------------------- MESSAGE HANDLERS ----------------------
  const handleSendMessage = (msg: string, parentId: number | null = null) => {
    if (!msg.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({
      action: "send",
      message: msg,
      parent_id: parentId,
    }));
    setNewMessage("");
  };

  const handleDeleteMessage = (id: number) => {
    if (!wsRef.current) return;
    wsRef.current.send(JSON.stringify({ action: "delete", doubt_id: id }));
  };

  // ---------------------- ANNOUNCEMENT HANDLERS ----------------------
  const handleAddAnnouncement = async () => {
    if (!newAnnTitle.trim() || !newAnnContent.trim() || !newAnnType) {
      toast({ title: "Missing Fields", description: "Fill in title, content, and type.", variant: "destructive" });
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
      newAnn.timestamp = new Date(newAnn.timestamp) as any;

      setAnnouncements(prev => {
        const exists = prev.some(a => a.id === newAnn.id);
        if (exists) return prev;
        return [...prev, newAnn].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });

      setNewAnnTitle(""); setNewAnnContent(""); setNewAnnFile(null); setIsAnnDialogOpen(false);
      toast({ title: "Announcement Added", description: "Your announcement has been posted." });
    } catch {
      toast({ title: "Error", description: "Could not post announcement", variant: "destructive" });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await dataManager.deleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast({ title: "Announcement Deleted" });
    } catch {
      toast({ title: "Error", description: "Could not delete announcement", variant: "destructive" });
    }
  };

  // ---------------------- DOCUMENT HANDLERS ----------------------
  const handleUploadDocument = async () => {
    if (!newDocTitle.trim() || !newDocFile) {
      toast({ title: "Missing Fields", description: "Provide both title and file.", variant: "destructive" });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("group_id", String(groupId));
      formData.append("title", newDocTitle);
      formData.append("deadline", newDocDeadline);
      formData.append("file", newDocFile);

      const newDoc = await dataManager.addDocument(formData);

      setDocuments(prev => {
        const exists = prev.some(d => d.id === newDoc.id);
        if (exists) return prev;
        return [...prev, newDoc].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
      });

      setNewDocTitle(""); setNewDocFile(null); setNewDocDeadline(""); setIsDocDialogOpen(false);
      toast({ title: "Document Uploaded", description: "Students can now sign this document." });
    } catch {
      toast({ title: "Error", description: "Could not upload document", variant: "destructive" });
    }
  };

  const handleDeleteDocument = async (id: string) => {
  if (!id) return;
  try {
    await dataManager.deleteDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    
    // Add to deletedDocs so SSE won't re-add it
    setDeletedDocs(prev => new Set(prev).add(id));

    toast({ title: "Document Deleted" });
  } catch {
    toast({ title: "Error", description: "Could not delete document", variant: "destructive" });
  }
};

const handleScroll = (e) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  const atBottom = scrollHeight - scrollTop - clientHeight < 50;

  setIsAtBottom(atBottom);

  // Hide "new message" button when at bottom
  if (atBottom) setShowNewMessageButton(false);
};

  const safeFormat = (date: string | Date | undefined | null, fmt: string) => {
    if (!date) return "N/A";
    const d = typeof date === "string" ? new Date(date) : date;
    return isNaN(d.getTime()) ? "Invalid Date" : format(d, fmt);
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><p className="text-muted-foreground">Loading your dashboard...</p></div>;
  
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
  <Card className="shadow-lg border border-gray-200">
    <CardHeader>
      <CardTitle className="text-lg font-semibold">Group Discussion</CardTitle>
      <CardDescription>Chat with students</CardDescription>
    </CardHeader>

    <CardContent>
      <ScrollArea ref={scrollViewportRef} className="h-96 mb-4 pr-2" onScrollCapture={handleScroll}>
        <div className="flex flex-col space-y-3">
          {loadingMessages
            ? Array.from({ length: 5 }).map((_, i) => <div className="flex flex-col space-y-2">
  <Skeleton className="h-4 w-2/3" />
  <Skeleton className="h-4 w-1/2" />
</div>
)
            : messages.length === 0
            ? (
              <p className="text-center text-gray-400 italic">
                No messages yet. Start a discussion!
              </p>
            ) : (
              messages.map((msg) => {
                const isSender = msg.author === user?.name;
                const repliedMessage = msg.reply_to
                  ? messages.find((m) => m.id === msg.reply_to)
                  : null;

                const bubbleClass =
                  isSender
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-none"
                    : msg.role === "lecturer"
                    ? "bg-yellow-100 text-gray-900 rounded-bl-none"
                    : msg.role === "student"
                    ? "bg-blue-100 text-gray-900 rounded-bl-none"
                    : "bg-gray-100 text-gray-900 rounded-bl-none";

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isSender ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`relative max-w-xs px-4 py-3 rounded-2xl break-words shadow-sm hover:shadow-md transition-all ${bubbleClass}`}
                    >
                      {/* ⋮ Dropdown menu */}
                      {msg.role !== "system" && (
                        <div className="absolute top-1 right-2">
                          <button
                            className={`${
                              isSender
                                ? "text-white/80 hover:text-white"
                                : "text-gray-700 hover:text-gray-900"
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
                                  setReplyParentId(Number(msg.id));
                                  setOpenDropdowns({});
                                }}
                              >
                                Reply
                              </button>
                              {isSender && (
                                <button
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-red-400"
                                  onClick={() => {
                                    setConfirmDeleteId(Number(msg.id));
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

                      {/* Author label */}
                      {!isSender && (
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-sm font-semibold">{msg.author}</span>
                          <span className="text-xs text-gray-600">
                            {msg.role === "lecturer" ? "👩‍🏫" : "🎓"}
                          </span>
                        </div>
                      )}

                      {/* Message content */}
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
              })
            )}
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

      {/* Reply section */}
      {replyParentId &&
        (() => {
          const replied = messages.find((m) => Number(m.id )=== replyParentId);
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

      {/* Input bar */}
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
</TabsContent>

          {/* ---------- ANNOUNCEMENTS ---------- */}
          <TabsContent value="announcements">
            <div className="flex justify-end mb-4">
              <Dialog open={isAnnDialogOpen} onOpenChange={setIsAnnDialogOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Announcement</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Announcement</DialogTitle></DialogHeader>
                  <Input placeholder="Title" value={newAnnTitle} onChange={(e) => setNewAnnTitle(e.target.value)} className="mb-2" />
                  <Textarea placeholder="Content" value={newAnnContent} onChange={(e) => setNewAnnContent(e.target.value)} className="mb-2" />
                  <Select value={newAnnType} onValueChange={(value: "material" | "event") => setNewAnnType(value)}>
                    <SelectTrigger className="mb-2"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="file" onChange={(e) => setNewAnnFile(e.target.files?.[0] || null)} className="mb-2" />
                  <Button onClick={handleAddAnnouncement}><Upload className="h-4 w-4 mr-1" /> Post</Button>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {[...new Map(announcements.map(a => [a.id, a])).values()]
                .filter(ann=> ann && ann.id)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((ann) => (
                  <Card key={ann.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{ann.title}</span>
                          <Badge variant={ann.type === "material" ? "default" : "secondary"}>{ann.type === "material" ? "Material" : "Event"}</Badge>
                        </div>
                        {user?.id === ann.uploader_id && (
  <ConfirmButton
    label="Remove"
    onConfirm={() => handleDeleteAnnouncement(ann.id)}
  />
)}
                      </CardTitle>
                      <CardDescription>{ann.author} • {safeFormat(ann.timestamp, "MMM dd, yyyy HH:mm")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">{ann.content}</p>
                      {ann.fileUrl && (<a href={ann.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">View Attachment</a>)}
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
    .filter(doc => doc && doc.id)
      .slice()
      .sort(
        (a, b) =>
          new Date(b.uploaded_at).getTime() -
          new Date(a.uploaded_at).getTime()
      )
      .map((doc) => {
        const now = new Date()
        let statusBadge

        if (doc.deadline) {
          const deadline = new Date(doc.deadline)
          if (deadline < now) {
            statusBadge = <Badge variant="destructive">Expired</Badge>
          } else {
            statusBadge = <Badge className="bg-green-600">Available</Badge>
          }
        } else {
          statusBadge = <Badge variant="secondary">No Deadline</Badge>
        }

        return (
          <Card key={doc.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{doc.title}</span>
                <div className="flex items-center gap-2">
                  {statusBadge}
                  {user?.id===doc.uploadedBy &&(<ConfirmButton
  label="Remove"
  onConfirm={() => handleDeleteDocument(doc.id)}
/>)}
                </div>
              </CardTitle>
              <CardDescription>
                Uploaded by {doc.author_name} •{" "}
                {safeFormat(doc.uploaded_at, "MMM dd, yyyy")}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {doc.fileUrl && (
                <>
                  {/\.(pdf|png|jpe?g)$/i.test(doc.fileName || "") ? (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 underline mb-1 block"
                    >
                      View Document
                    </a>
                  ) : (
                    <a
                      href={doc.fileUrl}
                      download
                      className="text-sm text-blue-600 underline mb-1 block"
                    >
                      Download Document
                    </a>
                  )}
                </>
              )}

              {doc.deadline && (
                <p className="text-sm text-red-600 mb-2">
                  Deadline: {safeFormat(doc.deadline, "MMM dd, yyyy HH:mm")}
                </p>
              )}

              <Separator className="my-3" />
<p className="text-sm font-medium mb-2">
  Signatures ({Array.isArray(doc.signatures) ? doc.signatures.length : doc.signatures})
</p>

{/* Show Info dropdown only to lecturer who uploaded */}
{user?.role === "lecturer" && user?.id === doc.uploadedBy && Array.isArray(doc.signatures) && (
  <details className="mt-2">
    <summary className="cursor-pointer text-sm font-medium">Info</summary>
    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
      {doc.signatures.map((sig, i) => (
        <div key={i} className="text-xs p-2 bg-muted rounded">
          <p className="font-medium">{sig.studentName}</p>
          <p className="text-muted-foreground">{sig.studentUSN}</p>
          <p className="text-muted-foreground">
            {format(sig.timestamp, "MMM dd, HH:mm")}
          </p>
        </div>
      ))}
    </div>
  </details>
)}

            </CardContent>
          </Card>
        )
      })}
  </div>
</TabsContent>

        </Tabs>
      </main>
    </div>
  );
}