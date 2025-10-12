from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone
from utils.otp_utils import generate_otp, save_otp, send_email, verify_otp
from db import get_db
from passlib.context import CryptContext
from models import OTPVerification,Student,Lecturer
from sqlalchemy.orm import Session

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# ------------------------------
# Data validation
# ------------------------------
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str

class EmailRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

# ------------------------------
# Send OTP
# ------------------------------
@router.post("/send-otp")
def send_otp(data: EmailRequest, db: Session = Depends(get_db)):
    if not data.email.endswith("@sdmit.in"):
        raise HTTPException(status_code=400, detail="Invalid college email")
    if db.query(Student).filter(Student.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    otp, expires_at = generate_otp()

    # Send email
    if not send_email(data.email, otp):
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Try again.")

    # Save OTP
    if not save_otp(data.email, otp, expires_at):
        raise HTTPException(status_code=500, detail="Failed to save OTP. Try again.")

    return {
        "message": "OTP sent successfully",
        "expires_at": expires_at.isoformat()  # optional, for frontend timer
    }

# ------------------------------
# Verify OTP
# ------------------------------
@router.post("/verify-otp")
def verify_otp_endpoint(data: VerifyOTPRequest, db: Session = Depends(get_db)):

    status = verify_otp(data.email, data.otp)

    if status != "success":
        if status == "expired":
            raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
        elif status == "invalid":
            raise HTTPException(status_code=400, detail="Invalid OTP. Try again.")
        else:
            raise HTTPException(status_code=400, detail=f"OTP verification failed: {status}")

    return {"message": "OTP verified successfully ✅"}

# ------------------------------
# Resend OTP with rate limiting
# ------------------------------
@router.post("/resend-otp")
def resend_otp(data: EmailRequest, db: Session = Depends(get_db)):

    # Check last OTP timestamp
    last_otp = (
        db.query(OTPVerification)
        .filter(OTPVerification.email == data.email)
        .order_by(OTPVerification.created_at.desc())
        .first()
    )

    if last_otp:
        now = datetime.now(timezone.utc)
        wait_time = 60  # 60 seconds cooldown
        if (now - last_otp.created_at).total_seconds() < wait_time:
            remaining = wait_time - int((now - last_otp.created_at).total_seconds())
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {remaining} seconds before requesting a new OTP."
            )

    # Generate and send new OTP
    otp, expires_at = generate_otp()
    if not send_email(data.email, otp):
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Try again.")

    if not save_otp(data.email, otp, expires_at):
        raise HTTPException(status_code=500, detail="Failed to save OTP. Try again.")

    return {"message": "OTP resent successfully", "expires_at": expires_at.isoformat()}

# ------------------------------
# Send OTP for Forgot Password
# ------------------------------
@router.post("/send-otp-forgotpassword")
def send_otp_forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):

    # ✅ Check if email exists in students or lecturers
    student = db.query(Student).filter(Student.email == data.email).first()
    lecturer = db.query(Lecturer).filter(Lecturer.email == data.email).first()

    if not (student or lecturer):
        raise HTTPException(status_code=404, detail="Email not found in system")

    # ✅ Generate OTP
    otp, expires_at = generate_otp()

    # ✅ Send email
    if not send_email(data.email, otp):
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Try again.")

    # ✅ Save OTP (no purpose, same table as signup)
    if not save_otp(data.email, otp, expires_at):
        raise HTTPException(status_code=500, detail="Failed to save OTP. Try again.")

    return {"message": "OTP sent for password reset", "expires_at": expires_at.isoformat()}


# ------------------------------
# Reset Password
# ------------------------------
@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    # ✅ Hash new password with bcrypt
    hashed_password = pwd_context.hash(data.new_password)

    # ✅ Update password in correct table
    student = db.query(Student).filter(Student.email == data.email).first()
    lecturer = db.query(Lecturer).filter(Lecturer.email == data.email).first()

    if student:
        student.password_hash = hashed_password
    elif lecturer:
        lecturer.password_hash = hashed_password
    else:
        raise HTTPException(status_code=404, detail="User not found")
    db.commit()


    return {"message": "Password reset successful ✅"}
