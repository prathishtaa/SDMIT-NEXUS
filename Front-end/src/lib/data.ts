// Hardcoded data for the application

export interface Message {
  id: string
  author: string
  content: string
  timestamp: Date
  role: 'student' | 'lecturer'
}

export interface Announcement {
  id: string
  title: string
  content: string
  type: 'material' | 'event'
  author: string
  timestamp: Date
  targetYear?: number
  targetBranch?: string
  imageUrl?: string
  comments?: Comment[]
}

export interface Comment {
  id: string
  author: string
  content: string
  timestamp: Date
}

export interface Document {
  id: string
  title: string
  uploadedBy: string
  timestamp: Date
  signatures: Signature[]
}

export interface Signature {
  studentName: string
  studentUSN: string
  timestamp: Date
}

export interface Lecturer {
  id: string
  name: string
  email: string
  password: string
}

// Sample data
export const sampleMessages: Message[] = [
  {
    id: '1',
    author: 'Dr. Smith',
    content: 'Welcome to the AI & Data Science group discussion! Please feel free to ask questions.',
    timestamp: new Date('2025-01-10T09:00:00'),
    role: 'lecturer'
  },
  {
    id: '2',
    author: 'Rahul Kumar',
    content: 'Thank you sir! Could you share the notes for Machine Learning?',
    timestamp: new Date('2025-01-10T09:15:00'),
    role: 'student'
  },
  {
    id: '3',
    author: 'Priya Sharma',
    content: 'Also waiting for the assignment deadline extension sir.',
    timestamp: new Date('2025-01-10T09:30:00'),
    role: 'student'
  }
]

export const sampleAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'Machine Learning Assignment 3',
    content: 'Complete the linear regression assignment by Friday. Dataset available on college portal.',
    type: 'material',
    author: 'Dr. Smith',
    timestamp: new Date('2025-01-09T10:00:00'),
    targetYear: 4,
    targetBranch: 'Artificial Intelligence & Data Science'
  },
  {
    id: '2',
    title: 'Tech Fest 2025',
    content: 'Annual technical festival starting next week! Register for coding competitions.',
    type: 'event',
    author: 'College Admin',
    timestamp: new Date('2025-01-08T14:00:00'),
    imageUrl: '/api/placeholder/400/300',
    comments: [
      {
        id: '1',
        author: 'Arjun Patel',
        content: 'Excited for the hackathon!',
        timestamp: new Date('2025-01-08T15:00:00')
      }
    ]
  },
  {
    id: '3',
    title: 'Database Systems Lab Manual',
    content: 'Updated lab manual with new exercises. Download from the portal.',
    type: 'material',
    author: 'Prof. Johnson',
    timestamp: new Date('2025-01-07T11:00:00'),
    targetYear: 3,
    targetBranch: 'Computer Science'
  }
]

export const sampleDocuments: Document[] = [
  {
    id: '1',
    title: 'Industrial Visit Permission Form',
    uploadedBy: 'Dr. Anderson',
    timestamp: new Date('2025-01-05T10:00:00'),
    signatures: [
      {
        studentName: 'Rahul Kumar',
        studentUSN: '4SU22AD023',
        timestamp: new Date('2025-01-05T11:00:00')
      },
      {
        studentName: 'Priya Sharma',
        studentUSN: '4SU22AD024',
        timestamp: new Date('2025-01-05T11:30:00')
      }
    ]
  },
  {
    id: '2',
    title: 'Internship Application Form',
    uploadedBy: 'Prof. Wilson',
    timestamp: new Date('2025-01-03T14:00:00'),
    signatures: [
      {
        studentName: 'Arjun Patel',
        studentUSN: '4SU22CS015',
        timestamp: new Date('2025-01-04T09:00:00')
      }
    ]
  }
]

export const sampleLecturers: Lecturer[] = [
  {
    id: '1',
    name: 'Dr. Smith',
    email: 'smith@gmail.com',
    password: 'password123'
  },
  {
    id: '2',
    name: 'Prof. Johnson',
    email: 'johnson@gmail.com',
    password: 'password123'
  },
  {
    id: '3',
    name: 'Dr. Anderson',
    email: 'anderson@gmail.com',
    password: 'password123'
  }
]

// Data management functions
class DataManager {
  private static instance: DataManager
  private messages: Message[] = [...sampleMessages]
  private announcements: Announcement[] = [...sampleAnnouncements]
  private documents: Document[] = [...sampleDocuments]
  private lecturers: Lecturer[] = [...sampleLecturers]

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager()
    }
    return DataManager.instance
  }

  // Messages
  getMessages(): Message[] {
    return this.messages
  }

  addMessage(message: Omit<Message, 'id' | 'timestamp'>): void {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    }
    this.messages.push(newMessage)
  }

  deleteMessage(id: string): void {
    this.messages = this.messages.filter(msg => msg.id !== id)
  }

  // Announcements
  getAnnouncements(): Announcement[] {
    return this.announcements
  }

  addAnnouncement(announcement: Omit<Announcement, 'id' | 'timestamp'>): void {
    const newAnnouncement: Announcement = {
      ...announcement,
      id: Date.now().toString(),
      timestamp: new Date()
    }
    this.announcements.push(newAnnouncement)
  }

  // Documents
  getDocuments(): Document[] {
    return this.documents
  }

  addDocument(document: Omit<Document, 'id' | 'timestamp' | 'signatures'>): void {
    const newDocument: Document = {
      ...document,
      id: Date.now().toString(),
      timestamp: new Date(),
      signatures: []
    }
    this.documents.push(newDocument)
  }

  signDocument(documentId: string, signature: Signature): void {
    const document = this.documents.find(doc => doc.id === documentId)
    if (document) {
      document.signatures.push(signature)
    }
  }

  // Lecturers
  getLecturers(): Lecturer[] {
    return this.lecturers
  }

  addLecturer(lecturer: Omit<Lecturer, 'id'>): void {
    const newLecturer: Lecturer = {
      ...lecturer,
      id: Date.now().toString()
    }
    this.lecturers.push(newLecturer)
  }

  deleteLecturer(id: string): void {
    this.lecturers = this.lecturers.filter(lecturer => lecturer.id !== id)
  }
}

export const dataManager = DataManager.getInstance()