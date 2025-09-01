from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import DoubtClarification, StudyMaterial, Event, Document

router = APIRouter(prefix="/groups", tags=["groups"])

# -----------------------------
# Get Group Messages (Doubt Clarifications)
# -----------------------------
@router.get("/{group_id}/messages")
def get_group_messages(group_id: int, db: Session = Depends(get_db)):
    messages = db.query(DoubtClarification)\
                 .filter(DoubtClarification.group_id == group_id, DoubtClarification.is_reply == False)\
                 .all()
    return messages

# -----------------------------
# Get Announcements (Study Materials + Events)
# -----------------------------
@router.get("/{group_id}/announcements")
def get_group_announcements(group_id: int, db: Session = Depends(get_db)):
    materials = db.query(StudyMaterial).filter(StudyMaterial.group_id == group_id).all()
    events = db.query(Event).filter(Event.group_id == group_id).all()
    return {
        "materials": materials,
        "events": events
    }

# -----------------------------
# Get Documents
# -----------------------------
@router.get("/{group_id}/documents")
def get_group_documents(group_id: int, db: Session = Depends(get_db)):
    documents = db.query(Document).filter(Document.group_id == group_id).all()
    return documents
