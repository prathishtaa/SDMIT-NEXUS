from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from db import get_db
from fastapi.responses import FileResponse
from models import StudyMaterial, Event, LecturerGroup, Lecturer
from utils.auth_utils import get_current_user
from datetime import datetime
import os

router = APIRouter()


UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/post-announcements")
async def create_announcement(
    group_id: int = Form(...),
    title: str = Form(...),
    content: str = Form(...),
    type: str = Form(...),   
    date: str = Form(None),  
    targetYear: str = Form(None),
    targetBranch: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Role check
    if current_user["role"] != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can create announcements")

    lecturer_id = current_user["id"]
    lecturer = db.query(Lecturer).filter_by(lecturer_id=lecturer_id).first()
    author_name = lecturer.name if lecturer else "Lecturer"

    # Check if lecturer is linked to the group
    link_exists = db.query(LecturerGroup).filter_by(
        group_id=group_id, lecturer_id=lecturer_id
    ).first()
    if not link_exists:
        raise HTTPException(status_code=403, detail="Lecturer not linked with this group")

    # Handle file upload
    file_url, file_name = None, None
    if file:
        file_name = f"{datetime.now().timestamp()}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, file_name)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        file_url = f"http://localhost:8000/static/{file_name}" 

    # Store in correct table
    if type == "material":
        db_ann = StudyMaterial(
            group_id=group_id,
            uploaded_by=lecturer_id,
            title=title,
            content=content,
            file_url=file_url,
            file_name=file_name,
        )
    elif type == "event":
        db_ann = Event(
            group_id=group_id,
            created_by=lecturer_id,
            title=title,
            content=content,
            file_url=file_url,
            file_name=file_name,
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid announcement type")

    #saves to db
    db.add(db_ann)
    db.commit()
    db.refresh(db_ann)

    return {
        "id": f"{type}-{db_ann.material_id if type == 'material' else db_ann.event_id}",
        "group_id": group_id,
        "title": title,
        "content": content,
        "type": type,
        "author": author_name,
        "timestamp": db_ann.uploaded_at if type == "material" else db_ann.created_at,
        "targetYear": targetYear,
        "targetBranch": targetBranch,
        "fileUrl": file_url,
        "fileName": file_name,
    }

@router.delete("/delete-announcements/{ann_id}")
def delete_announcement(
    ann_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Only lecturers can delete
    if current_user["role"] != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can delete announcements")

    # Parse type and numeric ID
    try:
        ann_type, ann_id_num = ann_id.split("-")
        ann_id_num = int(ann_id_num)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid announcement ID format")

    lecturer_id = current_user["id"]

    # Delete material
    if ann_type == "material":
        ann = db.query(StudyMaterial).filter_by(material_id=ann_id_num, uploaded_by=lecturer_id).first()
        if not ann:
            raise HTTPException(status_code=404, detail="Material not found or not authorized")
        # Delete file if exists
        if ann.file_name:
            file_path = os.path.join(UPLOAD_DIR, ann.file_name)
            if os.path.exists(file_path):
                os.remove(file_path)
        db.delete(ann)
        db.commit()
        return {"detail": f"Material {ann_id} deleted successfully"}

    # Delete event
    elif ann_type == "event":
        ann = db.query(Event).filter_by(event_id=ann_id_num, created_by=lecturer_id).first()
        if not ann:
            raise HTTPException(status_code=404, detail="Event not found or not authorized")
        # Delete file if exists
        if ann.file_name:
            file_path = os.path.join(UPLOAD_DIR, ann.file_name)
            if os.path.exists(file_path):
                os.remove(file_path)
        db.delete(ann)
        db.commit()
        return {"detail": f"Event {ann_id} deleted successfully"}

    else:
        raise HTTPException(status_code=400, detail="Invalid announcement type")

