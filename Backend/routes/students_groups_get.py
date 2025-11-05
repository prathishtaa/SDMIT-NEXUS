from fastapi import APIRouter, Depends, HTTPException,Query
from sqlalchemy.orm import Session
from db import get_db
from models import DoubtClarification, StudyMaterial, Event, Document, Lecturer, Student,LecturerGroup,RecipientRole
from utils.auth_utils import get_current_user

router = APIRouter()

# -----------------------------
# Get Group Messages. works for both student and lecturer
# -----------------------------
@router.get("/messages")
def get_group_messages(
    group_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Determine if user is a student or lecturer
    student = db.query(Student).filter(Student.student_id == current_user["id"]).first()
    if student:
        # Student can only fetch their own group
        if student.group_id != group_id:
            raise HTTPException(status_code=403, detail="Access denied to this group")
    else:
        # Assume lecturer
        lecturer = db.query(Lecturer).filter(Lecturer.lecturer_id == current_user["id"]).first()
        if not lecturer:
            raise HTTPException(status_code=404, detail="User not found")

        # Check if lecturer belongs to the requested group
        lecturer_group = db.query(LecturerGroup).filter(
            LecturerGroup.lecturer_id == lecturer.lecturer_id,
            LecturerGroup.group_id == group_id
        ).first()
        if not lecturer_group:
            raise HTTPException(status_code=403, detail="Access denied to this group")

    doubts = db.query(DoubtClarification).filter(
    DoubtClarification.group_id == group_id
).order_by(DoubtClarification.created_at).all()

    messages = []

    for d in doubts:
        
        sender_name = "Unknown"

        if d.sender_role == RecipientRole.student:
            sender = db.query(Student).filter(Student.student_id == d.sender_id).first()
            
            if sender:
                sender_name = sender.name
        elif d.sender_role == RecipientRole.lecturer:
            sender = db.query(Lecturer).filter(Lecturer.lecturer_id == d.sender_id).first()
            
            if sender:
                sender_name = sender.name

        messages.append({
            "doubt_id": d.doubt_id,
            "sender_name": sender_name,
            "message": d.message,
            "sender_id": d.sender_id,
            "sender_role": d.sender_role.value if hasattr(d.sender_role, 'value') else d.sender_role,
            "created_at": d.created_at,
            "reply_to": d.parent_doubt_id
        })

    return messages


# -----------------------------
# Get Announcements (Study Materials + Events)
# -----------------------------
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

# Sorts newest first
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
