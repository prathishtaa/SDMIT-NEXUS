from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from db import get_db
from models import Document, Group, LecturerGroup, Lecturer
from utils.auth_utils import get_current_user
from fastapi.responses import FileResponse
import os
import asyncio
from routes.sse import broadcast_document
from datetime import datetime

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# -------------------
# Upload a Document
# -------------------
@router.post("/upload")
async def upload_document(
    group_id: int = Form(...),
    title: str = Form(...),
    deadline: str = Form(...),  
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Role check
    if current_user["role"] != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can upload documents")

    lecturer_id = current_user["id"]
    lecturer = db.query(Lecturer).filter_by(lecturer_id=lecturer_id).first()
    author_name = lecturer.name if lecturer else "Lecturer"

    # Check if lecturer is linked to the group
    group = db.query(Group).filter_by(group_id=group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    file_url, file_name = None, None
    if file:
        file_name = f"{datetime.now().timestamp()}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        file_url = f"http://localhost:8000/static/{file_name}" 
    # Convert deadline to datetime
    try:
        deadline_dt = datetime.fromisoformat(deadline)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid deadline format, use ISO format")
    # Save record in DB
    document = Document(
        group_id=group_id,
        uploaded_by=lecturer_id,
        title=title,
        file_path=file_url,
        file_name=file_name,
        deadline=deadline_dt
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    print(document)
    document_data={
        "id": document.document_id,
        "title": title,
        "group_id": group_id,
        "uploadedBy": lecturer_id,
        "author_name": author_name,
        "deadline": deadline,
        "uploaded_at": document.uploaded_at,
        "fileUrl":file_url,
        "fileName":file_name
    }
    # Broadcast asynchronously (fire-and-forget)
    asyncio.create_task(broadcast_document(group_id, document_data))
    return document_data


@router.get("/list-documents")
def list_documents(group_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Check if group exists
    role = current_user["role"]
    user_id = current_user["id"]
    if role != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can access this endpoint")
    link_exists = (
        db.query(LecturerGroup)
        .filter(
            LecturerGroup.lecturer_id == user_id,
            LecturerGroup.group_id == group_id
        )
        .first()
    )
    if not link_exists:
        raise HTTPException(status_code=403, detail="Lecturer not linked with this group")
    group = db.query(Group).filter_by(group_id=group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Fetch documents for the group
    documents = db.query(Document).filter_by(group_id=group_id).all()
    for doc in documents:
        lecturer = db.query(Lecturer).filter_by(lecturer_id=doc.uploaded_by).first()
        author_name = lecturer.name if lecturer else "Lecturer"
    response = []
    for doc in documents:
        response.append({
            "id": doc.document_id,
            "title": doc.title,
            "group_id": doc.group_id,
            "uploadedBy": doc.uploaded_by,
            "author_name": author_name,
            "signatures": [
            {
                "usn": sig.student.usn,
                "name": sig.student.name,
                "signed_at": sig.signed_at
            }
            for sig in doc.signatures
        ],
            "deadline": doc.deadline.isoformat(),
            "uploaded_at": doc.uploaded_at.isoformat(),
            "fileUrl": doc.file_path,
            "fileName": doc.file_name
        })

    return response
# -------------------
# Delete a Document
# -------------------
@router.delete("/delete/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Only lecturers can delete
    if current_user["role"] != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can delete documents")

    lecturer_id = current_user["id"]
    document = db.query(Document).filter_by(document_id=document_id, uploaded_by=lecturer_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found or not authorized")

    # Delete file from local storage
    if document.file_name:
            file_path = os.path.join(UPLOAD_DIR, document.file_name)
            if os.path.exists(file_path):
                os.remove(file_path)
    # Delete DB record
            db.delete(document)
            db.commit()

    return {"detail": f"Document {document_id} deleted successfully"}
