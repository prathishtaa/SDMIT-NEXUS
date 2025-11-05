from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from db import get_db
from models import Lecturer, Group, StudyMaterial, Event, LecturerGroup
from utils.auth_utils import get_current_user 

router = APIRouter()

@router.get("/announcements")
def get_announcements(
    group_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    role = current_user["role"]
    user_id = current_user["id"]

    # Only lecturers allowed with explicit group_id
    if role != "lecturer":
        raise HTTPException(status_code=403, detail="Only lecturers can access this endpoint")

    # Check if lecturer is linked with this group
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

    # Fetch study materials
    materials = (
        db.query(StudyMaterial, Lecturer, Group)
        .join(Lecturer, StudyMaterial.uploaded_by == Lecturer.lecturer_id)
        .join(Group, StudyMaterial.group_id == Group.group_id)
        .filter(StudyMaterial.group_id == group_id)
        .all()
    )

    # Fetch events
    events = (
        db.query(Event, Lecturer, Group)
        .join(Lecturer, Event.created_by == Lecturer.lecturer_id)
        .join(Group, Event.group_id == Group.group_id)
        .filter(Event.group_id == group_id)
        .all()
    )

    # Format response
    announcements = []
    for mat, lecturer, group in materials:
        announcements.append({
            "id": f"material-{mat.material_id}",
            "group_id": group.group_id,
            "title": mat.title,
            "content": mat.content,
            "type": "material",
            "author": lecturer.name,
            "timestamp": mat.uploaded_at.isoformat(),
            "targetYear": group.year,
            "targetBranch": group.branch,
            "fileUrl": mat.file_url,
            "fileName": mat.file_name,
        })
    for ev, lecturer, group in events:
        announcements.append({
            "id": f"event-{ev.event_id}",
            "group_id": group.group_id,
            "title": ev.title,
            "content": ev.content,
            "type": "event",
            "author": lecturer.name,
            "timestamp": ev.created_at.isoformat(),
            "targetYear": group.year,
            "targetBranch": group.branch,
            "fileUrl": ev.file_url,
            "fileName": ev.file_name,
        })

    announcements.sort(key=lambda x: x["timestamp"], reverse=True)

    return announcements


