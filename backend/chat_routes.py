from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from db import SessionLocal
from chat_model import ChatMessage
from models import Student
from datetime import datetime

router = APIRouter()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Save a chat message
@router.post("/chat/send")
def send_message(sender_usn: str, group_id: int, message: str, db: Session = Depends(get_db)):
    chat = ChatMessage(
        sender_id=sender_usn,
        group_id=group_id,
        message=message,
        timestamp=datetime.utcnow()
    )
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return {"status": "success", "message_id": chat.id}

# Get all messages for a group
@router.get("/chat/{group_id}")
def get_group_messages(group_id: int, db: Session = Depends(get_db)):
    chats = db.query(ChatMessage).filter(ChatMessage.group_id == group_id).order_by(ChatMessage.timestamp).all()
    return chats
