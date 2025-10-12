from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import DoubtClarification, StudyMaterial, Event, Document, Lecturer, Student,DocumentSignature
from utils.auth_utils import get_current_user

router = APIRouter()

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
from models import Lecturer

@router.get("/{group_id}/announcements")
def get_group_announcements(group_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Materials with lecturer info
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can access announcements.")
    if current_user["role"] == "student":
        student = db.query(Student).filter(Student.student_id == current_user["id"],Student.group_id==group_id).first()
        if not student:
            raise HTTPException(status_code=403, detail="Access denied to this group's announcements.")
    materials = (
        db.query(
            StudyMaterial.material_id,
            StudyMaterial.title,
            StudyMaterial.content,
            StudyMaterial.file_url,
            StudyMaterial.file_name,
            StudyMaterial.uploaded_at,
            Lecturer.name.label("lecturer_name")
        )
        .join(Lecturer, Lecturer.lecturer_id == StudyMaterial.uploaded_by)
        .filter(StudyMaterial.group_id == group_id)
        .all()
    )

    # Events with lecturer info
    events = (
        db.query(
            Event.event_id,
            Event.title,
            Event.content,
            Event.file_url,
            Event.file_name,
            Event.created_at,
            Lecturer.name.label("lecturer_name")
        )
        .join(Lecturer, Lecturer.lecturer_id == Event.created_by)
        .filter(Event.group_id == group_id)
        .all()
    )
    materials_list = [dict(m._mapping) for m in materials]
    events_list = [dict(e._mapping) for e in events]

# Sort newest first
    materials_list.sort(key=lambda x: x.get("uploaded_at") or "", reverse=True)
    events_list.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return {
        "materials": materials_list,
        "events": events_list
    }


# -----------------------------
# Get Documents
# -----------------------------
@router.get("/documents")
def get_student_group_documents(
    db: Session = Depends(get_db), 
    current_user: Student = Depends(get_current_user)
):
    # Ensure the user is a student
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can access documents.")
    # Get student's group_id
    student = db.query(Student).filter(Student.student_id == current_user["id"]).first()
    if not student or not student.group_id:
        raise HTTPException(status_code=404, detail="Student or group not found.")
    group_id = student.group_id
    # Fetch documents for the group
    documents = db.query(Document).filter(Document.group_id == group_id).all()

    
    # Format documents for JSON response
    documents_list = [
        {
            "document_id": doc.document_id,
            "title": doc.title,
            "author_name": db.query(Lecturer).filter(Lecturer.lecturer_id == doc.uploaded_by).first().name if db.query(Lecturer).filter(Lecturer.lecturer_id == doc.uploaded_by).first() else "Lecturer",
            "signatures": [
            {
                "usn": sig.student.usn,
                "name": sig.student.name,
                "signed_at": sig.signed_at
            }
            for sig in doc.signatures
        ],
            "file_name": doc.file_name,
            "file_url": doc.file_path,
            "deadline": doc.deadline,
            "uploaded_at": doc.uploaded_at,
            "uploaded_by": doc.uploaded_by
        }
        for doc in documents
    ]

    return {"documents": documents_list}
