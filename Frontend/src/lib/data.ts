// src/lib/data.ts
import api from "@/services/api";

// ---------- Interfaces ----------
export interface Message {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
  role: "student" | "lecturer" | "system";
  reply_to?: string | null; // optional property
}


export interface Announcement {
  id: string;
  group_id?: number;
  title: string;
  content: string;
  type: "material" | "event";
  uploader_id: number;
  author: string;
  timestamp: Date; 
  targetYear?: string;
  targetBranch?: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
}

export interface Signature {
  studentName: string;
  studentUSN: string;
  timestamp: Date;
}

export interface Document {
  id: string;
  title: string;
  group_id: number;
  uploadedBy: number;
  author_name: string;
  signatures: Signature[];
  deadline: string; 
  uploaded_at: string;
  fileUrl: string;
  fileName: string;
}

export interface Lecturer {
  id: string;
  name: string;
  email: string;
  password: string;
}

// ---------- Data Manager (Singleton) ----------
class DataManager {
  private static instance: DataManager;
  private constructor() {}

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  // ----- Messages -----
  async getMessages(groupId?: number): Promise<Message[]> {
    const res = await api.get(`/groups/messages${groupId ? `?group_id=${groupId}` : ""}`);
    return (res.data || []).map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
  }

  // ----- Announcements -----
  async getAnnouncements(groupId?: number): Promise<Announcement[]> {
  const res = await api.get(
    `/lecturer-groups/announcements${groupId ? `?group_id=${groupId}` : ""}`
  )
  return (res.data || []).map((ann: any) => ({
    ...ann,
    timestamp: new Date(ann.timestamp), // <-- convert here
  }))
}
  async addAnnouncement(announcement: FormData): Promise<Announcement> {
    const res = await api.post("/files/post-announcements", announcement, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { ...res.data, timestamp: new Date(res.data.timestamp) };
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await api.delete(`/files/delete-announcements/${id}`);
  }

  // ----- Documents -----
  async getDocuments(groupId?: number): Promise<Document[]> {
  const res = await api.get(
    `/documents/list-documents${groupId ? `?group_id=${groupId}` : ""}`
  );

  // If backend already sends normalized data, no need to remap
  return res.data || [];
}


  async addDocument(document: FormData): Promise<Document> {
  const res = await api.post("/documents/upload", document, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return { 
    ...res.data, 
    timestamp: new Date(res.data.uploadedBy),
    signatures: []  // empty initially
  };
}


  async deleteDocument(id: string): Promise<void> {
    await api.delete(`/documents/delete/${id}`);
  }

  async signDocument(documentId: string, signature: Signature): Promise<void> {
    await api.post(`/documents/${documentId}/sign`, signature);
  }
}

// Export singleton instance
export const dataManager = DataManager.getInstance();