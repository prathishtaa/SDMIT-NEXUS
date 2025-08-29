from sqlalchemy import (
    Column, Integer, String, ForeignKey, Boolean,
    DateTime, Enum, JSON, func
)
from sqlalchemy.orm import relationship
from db import Base
import enum
from datetime import datetime,timezone

# ---------- ENUMS ----------
class RecipientRole(enum.Enum):
    student = "student"
    lecturer = "lecturer"
    admin = "admin"

class NotificationType(enum.Enum):
    document_reminder = "document_reminder"
    event_update = "event_update"
    doubt_reply = "doubt_reply"

class NotificationChannel(enum.Enum):
    in_app = "in_app"
    email = "email"
    both = "both"

class NotificationStatus(enum.Enum):
    sent = "sent"
    pending = "pending"
    failed = "failed"

# ---------- STUDENTS ----------
class Student(Base):
    __tablename__ = "students"
    student_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    usn = Column(String, unique=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    branch = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    group_id = Column(Integer, ForeignKey("groups.group_id", ondelete="CASCADE"))

    group = relationship("Group", back_populates="students")
    signatures = relationship("DocumentSignature", back_populates="student", cascade="all, delete-orphan")
    embeddings = relationship("FaceEmbedding", back_populates="student", cascade="all, delete-orphan")

# ---------- FACE EMBEDDINGS ----------
class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"
    embedding_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"))
    embedding = Column(JSON, nullable=False)  # store as list/array in JSON
    angle = Column(String)  # e.g., "front", "left", "right"

    student = relationship("Student", back_populates="embeddings")

# ---------- LECTURERS ----------
class Lecturer(Base):
    __tablename__ = "lecturers"
    lecturer_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

    groups = relationship("LecturerGroup", back_populates="lecturer", cascade="all, delete-orphan")
    study_materials = relationship("StudyMaterial", back_populates="uploader", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="uploader", cascade="all, delete-orphan")

# ---------- ADMINS ----------
class Admin(Base):
    __tablename__ = "admins"
    admin_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)

# ---------- GROUPS ----------
class Group(Base):
    __tablename__ = "groups"
    group_id = Column(Integer, primary_key=True, index=True)
    branch = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    group_name = Column(String, nullable=False)

    students = relationship("Student", back_populates="group", cascade="all, delete")
    lecturers = relationship("LecturerGroup", back_populates="group", cascade="all, delete")
    study_materials = relationship("StudyMaterial", back_populates="group", cascade="all, delete")
    events = relationship("Event", back_populates="group", cascade="all, delete")
    doubts = relationship("DoubtClarification", back_populates="group", cascade="all, delete")
    documents = relationship("Document", back_populates="group", cascade="all, delete")

# ---------- LECTURER-GROUPS ----------
class LecturerGroup(Base):
    __tablename__ = "lecturer_groups"
    lecturer_id = Column(Integer, ForeignKey("lecturers.lecturer_id", ondelete="CASCADE"), primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.group_id", ondelete="CASCADE"), primary_key=True)

    lecturer = relationship("Lecturer", back_populates="groups")
    group = relationship("Group", back_populates="lecturers")

# ---------- STUDY MATERIALS ----------
class StudyMaterial(Base):
    __tablename__ = "study_materials"
    material_id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.group_id", ondelete="CASCADE"))
    uploaded_by = Column(Integer, ForeignKey("lecturers.lecturer_id", ondelete="CASCADE"))
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    uploaded_at = Column(DateTime, server_default=func.now())

    group = relationship("Group", back_populates="study_materials")
    uploader = relationship("Lecturer", back_populates="study_materials")

# ---------- EVENTS ----------
class Event(Base):
    __tablename__ = "events"
    event_id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.group_id", ondelete="CASCADE"))
    title = Column(String, nullable=False)
    description = Column(String)
    date = Column(DateTime, nullable=False)

    group = relationship("Group", back_populates="events")

# ---------- DOUBT CLARIFICATION ----------
class DoubtClarification(Base):
    __tablename__ = "doubt_clarification"
    doubt_id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.group_id", ondelete="CASCADE"))
    sender_id = Column(Integer, nullable=False)
    sender_role = Column(Enum(RecipientRole), nullable=False)  # NEW
    message = Column(String, nullable=False)
    is_reply = Column(Boolean, default=False)
    parent_doubt_id = Column(Integer, ForeignKey("doubt_clarification.doubt_id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    group = relationship("Group", back_populates="doubts")
    replies = relationship("DoubtClarification", cascade="all, delete")

# ---------- DOCUMENTS ----------
class Document(Base):
    __tablename__ = "documents"
    document_id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.group_id", ondelete="CASCADE"))
    uploaded_by = Column(Integer, ForeignKey("lecturers.lecturer_id", ondelete="CASCADE"))
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    deadline = Column(DateTime, nullable=False)
    uploaded_at = Column(DateTime, server_default=func.now())

    group = relationship("Group", back_populates="documents")
    uploader = relationship("Lecturer", back_populates="documents")
    signatures = relationship("DocumentSignature", back_populates="document", cascade="all, delete-orphan")

# ---------- DOCUMENT SIGNATURES ----------
class DocumentSignature(Base):
    __tablename__ = "document_signatures"
    signature_id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.document_id", ondelete="CASCADE"))
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"))
    signed_at = Column(DateTime, server_default=func.now())

    document = relationship("Document", back_populates="signatures")
    student = relationship("Student", back_populates="signatures")

# ---------- NOTIFICATIONS ----------
class Notification(Base):
    __tablename__ = "notifications"
    notification_id = Column(Integer, primary_key=True, index=True)
    recipient_id = Column(Integer, nullable=False)
    recipient_role = Column(Enum(RecipientRole), nullable=False)
    message = Column(String, nullable=False)
    type = Column(Enum(NotificationType), nullable=False)
    channel = Column(Enum(NotificationChannel), nullable=False)
    status = Column(Enum(NotificationStatus), default=NotificationStatus.pending)
    created_at = Column(DateTime, server_default=func.now())
    sent_at = Column(DateTime, nullable=True)

# --------------OTP Verification------------
class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    otp_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)