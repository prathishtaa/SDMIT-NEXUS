from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import Group, LecturerGroup
from utils.auth_utils import get_current_user    

router = APIRouter()

@router.get("/groups")
def get_lecturer_groups(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "lecturer":
        raise HTTPException(status_code=403, detail="Not authorized")

    lecturer_id = current_user["id"]
    groups = (
        db.query(Group)
        .join(LecturerGroup, LecturerGroup.group_id == Group.group_id)
        .filter(LecturerGroup.lecturer_id == lecturer_id)
        .all()
    )

    return groups


@router.post("/add-groups")
def add_or_join_group(
    group_data: dict,  
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "lecturer":
        raise HTTPException(status_code=403, detail="Not authorized")

    lecturer_id = current_user["id"]
    branch = group_data.get("branch")
    year = str(group_data.get("year"))
    group_name=f"{branch}-{year}" 

    if not branch or not year:
        raise HTTPException(status_code=400, detail="Branch and year are required")

    # Check if group exists (year as string)
    group = db.query(Group).filter(Group.branch == branch, Group.year == year).first()

    if not group:
        # Create group (year stored as string)
        group = Group(branch=branch, year=year, group_name=group_name)
        db.add(group)
        db.commit()
        db.refresh(group)

    # Check if lecturer is already linked
    existing_link = db.query(LecturerGroup).filter(
        LecturerGroup.group_id == group.group_id,
        LecturerGroup.lecturer_id == lecturer_id
    ).first()
    if existing_link:
        return {
        "id": group.group_id,
        "branch": group.branch,
        "year": group.year,
        "message": "Already joined"
        }
        # Link lecturer to this group
    link = LecturerGroup(group_id=group.group_id, lecturer_id=lecturer_id)
    db.add(link)
    db.commit()
    return {
    "id": group.group_id,
    "branch": group.branch,
    "year": group.year,
    "message": "Joined successfully"
    }