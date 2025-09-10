from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
from utils.otp_utils import generate_otp, save_otp, send_email, verify_otp
from db import get_db
from models import OTPVerification
from sqlalchemy.orm import Session

router = APIRouter()

# ------------------------------
# Data validation
# ------------------------------
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
    if not data.email.endswith("@sdmit.in"):
        raise HTTPException(status_code=400, detail="Invalid college email")

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
    if not data.email.endswith("@sdmit.in"):
        raise HTTPException(status_code=400, detail="Invalid college email")

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

