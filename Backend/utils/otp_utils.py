import os
import random
import smtplib
import bcrypt
from datetime import datetime, timezone, timedelta
from email.message import EmailMessage
from sqlalchemy.orm import Session
from models import OTPVerification
from db import SessionLocal

# ------------------------------
# Configuration
# ------------------------------
FROM_EMAIL = "sdmitnexus@gmail.com"
APP_PASSWORD = "hoqz tajs vyvf xobr"
OTP_LENGTH = 6
OTP_EXPIRY_SECONDS = 300  # 5 minutes

# ------------------------------
# Generate OTP + Expiry
# ------------------------------

def generate_otp(length: int = OTP_LENGTH, expiry_seconds: int = OTP_EXPIRY_SECONDS):
    if length <= 0:
        length = OTP_LENGTH
    
    # Always random in production
    otp = "".join([str(random.randint(0, 9)) for _ in range(length)])
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expiry_seconds)
    return otp, expires_at

# ------------------------------
# Send Email
# ------------------------------
def send_email(to_email: str, otp: str) -> bool:
    try:
        if not FROM_EMAIL or not APP_PASSWORD:
            print("❌ Email credentials missing. Set BACKEND_EMAIL and BACKEND_EMAIL_APP_PASSWORD.")
            return False

        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=15)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(FROM_EMAIL, APP_PASSWORD)

        msg = EmailMessage()

        # ✅ Single subject for both cases
        msg["Subject"] = "SDMIT Nexus OTP"

        # ✅ Universal content for both verification & password reset
        content = f"""
Hello,

Your One-Time Password (OTP) for SDMIT Nexus is: {otp}

Please use this OTP within 5 minutes to proceed. 
If you did not request this, please ignore this email.

Best regards,
SDMIT Nexus Team
        """

        msg["From"] = FROM_EMAIL
        msg["To"] = to_email
        msg.set_content(content)

        server.send_message(msg)
        server.quit()
        print(f"✅ Email sent successfully to {to_email}")
        return True

    except Exception as e:
        print(f"❌ Failed to send OTP email: {e}")
        return False

# ------------------------------
# Save OTP (hashed) into DB
# ------------------------------

def save_otp(email: str, otp: str, expires_at: datetime):
    db: Session = SessionLocal()
    try:
        db.query(OTPVerification).filter(
            OTPVerification.email == email, 
            OTPVerification.is_used == False
        ).delete()
        db.commit()

        otp_hash = bcrypt.hashpw(otp.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        otp_entry = OTPVerification(
            email=email,
            otp_hash=otp_hash,
            expires_at=expires_at,
            is_used=False,
            created_at=datetime.now(timezone.utc),
        )
        db.add(otp_entry)
        db.commit()
        db.refresh(otp_entry)
        return otp_entry

    except Exception as e:
        db.rollback()
        print(f"[Error] Failed to save OTP: {e}")
        return None
    finally:
        db.close()

# ------------------------------
# Verify OTP
# ------------------------------

def verify_otp(email: str, otp_input: str) -> str:
    db: Session = SessionLocal()
    try:
        otp_entry = (
            db.query(OTPVerification)
            .filter(OTPVerification.email == email, OTPVerification.is_used == False)
            .order_by(OTPVerification.created_at.desc())
            .first()
        )

        if not otp_entry:
            return "no_otp"

        if datetime.now(timezone.utc) > otp_entry.expires_at:
            db.delete(otp_entry)
            db.commit()
            return "expired"

        if bcrypt.checkpw(otp_input.encode("utf-8"), otp_entry.otp_hash.encode("utf-8")):
            otp_entry.is_used = True
            db.commit()
            return "success"

        return "invalid"

    except Exception as e:
        print(f"[Error] OTP verification failed: {e}")
        return "error"
    finally:
        db.close()

# ------------------------------
# Resend OTP
# ------------------------------

def resend_otp(email: str) -> dict:
    otp, expires_at = generate_otp()
    if send_email(email, otp):
        saved = save_otp(email, otp, expires_at)
        if saved:
            return {"status": "success", "message": "OTP sent successfully."}
        else:
            return {"status": "error", "message": "Failed to save OTP. Try again."}
    else:
        return {"status": "error", "message": "Failed to send OTP email. Check configuration and try later."}
