from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from db import Base

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(String, ForeignKey("students.usn"))   # ✅ usn is String
    group_id = Column(Integer, index=True)
    message = Column(String, nullable=False)
    reply_to = Column(Integer, ForeignKey("chat_messages.id"), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    sender = relationship("Student", back_populates="messages")
    replies = relationship("ChatMessage", remote_side=[id], backref="parent", cascade="all, delete-orphan")
