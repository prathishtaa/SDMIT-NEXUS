from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db import get_db
from models import Student, Lecturer, Admin
from utils.auth_utils import create_access_token, verify_password

router = APIRouter()
class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/auth-login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    email = data.email
    password = data.password
    user = None
    role = None

    # 1️⃣ Check Student
    student = db.query(Student).filter(Student.email == email).first()
    if student:
        user = student
        role = "student"

    # 2️⃣ Check Lecturer
    if not user:
        lecturer = db.query(Lecturer).filter(Lecturer.email == email).first()
        if lecturer:
            user = lecturer
            role = "lecturer"

    # 3️⃣ Check Admin
    if not user:
        admin = db.query(Admin).filter(Admin.email == email).first()
        if admin:
            user = admin
            role = "admin"

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email")

    # 4️⃣ Verify Password
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")

    # 5️⃣ Create JWT (valid for 30 days by default)
    token_data = {"sub": user.email, "role": role, "id": getattr(user, f"{role}_id")}
    access_token = create_access_token(token_data)

    # 6️⃣ Build user object for frontend
    if role == "student":
        response_user = {
            "id": user.student_id,
            "name": user.name,
            "email": user.email,
            "role": role,
            "usn": user.usn,
            "branch": user.branch,
            "year": user.year,
            "group_id": user.group_id,
        }
    elif role == "lecturer":
        response_user = {
            "id": user.lecturer_id,
            "name": user.name,
            "email": user.email,
            "role": role,
            "groups": [lg.group_id for lg in user.groups],
        }
    else:  # admin
        response_user = {
            "id": user.admin_id,
            "name": user.name,
            "email": user.email,
            "role": role,
        }

    return {"token": access_token, "user": response_user}
