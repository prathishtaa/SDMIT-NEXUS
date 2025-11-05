from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from db import get_db
from models import Lecturer, Student, Group, Admin
from pydantic import BaseModel
from utils.send_password import generate_hybrid_password, send_password_email as send_email
from utils.auth_utils import get_current_user
from passlib.context import CryptContext

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
class SendPasswordRequest(BaseModel):
    email: str

class LecturerCreate(BaseModel):
    name: str
    email: str

class AdminCreate(BaseModel):
    name: str
    email: str
    password: str

BRANCH_MAP = {
    "Artificial Intelligence and Data Science": "AD",
    "Computer Science": "CS",
    "Information Science": "IS",
    "Civil Engineering": "CE",
    "Electrical and Electronics": "EEE",
    "Electronics and Communication": "ECE",
}

# Step 1: Send password
@router.post("/lecturers/send-password")
def send_password(req:SendPasswordRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Check if user is admin
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")
    # Check if lecturer exists
    email=req.email
    existing = db.query(Lecturer).filter(Lecturer.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Lecturer with this email already exists")

    # Generate password and hash
    password = generate_hybrid_password()
    hashed_password = pwd_context.hash(password)

    # Add row with email and hashed password
    new_lecturer = Lecturer(name="", email=email, password_hash=hashed_password)
    db.add(new_lecturer)
    db.commit()
    db.refresh(new_lecturer)

    # Send plaintext password via email
    send_email(email, password)

    return {"message": "Password sent successfully", "email": email}

# Step 2: Add lecturer (update name)
@router.post("/lecturers/add")
def add_lecturer(payload:LecturerCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Check if user is admin
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")
    lecturer = db.query(Lecturer).filter(Lecturer.email == payload.email).first()
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer not found. Please send password first.")
    
    lecturer.name = payload.name
    db.commit()
    db.refresh(lecturer)

    return {
        "message": "Lecturer added successfully",
        "lecturer": {"id": lecturer.lecturer_id, "name": lecturer.name, "email": lecturer.email}
    }
@router.get("/get-lecturers")
def get_all_lecturers(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Check if user is admin
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")
    lecturers = db.query(Lecturer).all()
    return [
        {
            "id": lecturer.lecturer_id,
            "name": lecturer.name,
            "email": lecturer.email,
            "status": "Name not set" if not lecturer.name else "Active"
        }
        for lecturer in lecturers
    ]

@router.delete("/{lecturer_id}")
def delete_lecturer(lecturer_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Check if user is admin
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")
    lecturer = db.query(Lecturer).filter(Lecturer.lecturer_id == lecturer_id).first()
    if not lecturer:
        raise HTTPException(status_code=404, detail="Lecturer not found")

    db.delete(lecturer)
    db.commit()
    return {"message": f"Lecturer {lecturer.name} deleted successfully"}

@router.get("/student")
def get_students(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Check if user is admin
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")
    students = db.query(Student).all()
    return [
        {
            "id": s.student_id,   
            "usn": s.usn,
            "name": s.name,
            "year": s.year,
            "branch": BRANCH_MAP.get(s.branch, s.branch)  
        }
        for s in students
    ]


@router.get("/departments")
def get_departments(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Check if user is admin
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")
    departments = db.query(Group.branch).distinct().all()
    # Convert to short codes using BRANCH_MAP
    result = []
    for dept in departments:
        full_name = dept[0]
        short_code = BRANCH_MAP.get(full_name, full_name)  # fallback = original
        result.append(short_code)
    return result

@router.get("/students/year-distribution")
def get_students_by_year(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Check if user is admin
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")
    results = (
        db.query(Student.year, func.count(Student.student_id))
        .group_by(Student.year)
        .all()
    )
    return [{"name": year, "value": count} for year, count in results]

# 2. Students by Department
@router.get("/students/dept-distribution")
def get_students_by_department(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Check if user is admin
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")
    results = (
        db.query(Student.branch, func.count(Student.student_id))
        .group_by(Student.branch)
        .all()
    )
    return [{"name": branch, "value": count} for branch, count in results]

@router.get("/students-vs-lecturers")
def get_students_vs_lecturers(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Check if user is admin
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")
    student_count = db.query(func.count(Student.student_id)).scalar()
    lecturer_count = db.query(func.count(Lecturer.lecturer_id)).scalar()
    return [
        {"name": "Students", "value": student_count},
        {"name": "Lecturers", "value": lecturer_count}
    ]

# 4. Students & Lecturers by Group
@router.get("/group-distribution")
def get_group_distribution(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Check if user is admin
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can perform this action")
    groups = db.query(Group).all()
    data = []
    for g in groups:
        data.append({
            "name": g.group_name,
            "students": len(g.students),
            "lecturers": len(g.lecturers)
        })
    return data

# Create Admin User (for initial setup)
@router.post("/create-admin")
def create_admin(admin_data: AdminCreate, db: Session = Depends(get_db)):
    """
    Create an admin user - only works if no admins exist yet
    This is for initial setup only
    """
    # Check if any admin already exists
    existing_admin = db.query(Admin).first()
    if existing_admin:
        raise HTTPException(status_code=400, detail="Admin users already exist. Use existing admin credentials.")
    
    # Check if email already exists in any table
    existing_student = db.query(Student).filter(Student.email == admin_data.email).first()
    existing_lecturer = db.query(Lecturer).filter(Lecturer.email == admin_data.email).first()
    
    if existing_student or existing_lecturer:
        raise HTTPException(status_code=400, detail="Email already exists in the system")
    
    # Hash password
    hashed_password = pwd_context.hash(admin_data.password)
    
    # Create admin
    new_admin = Admin(
        name=admin_data.name,
        email=admin_data.email,
        password_hash=hashed_password
    )
    
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    
    return {
        "message": "Admin created successfully",
        "admin": {
            "id": new_admin.admin_id,
            "name": new_admin.name,
            "email": new_admin.email
        }
    }