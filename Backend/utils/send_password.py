import smtplib
from email.message import EmailMessage
import secrets, string


WORDS = ["river", "cloud", "star", "moon", "tree", "ocean", "storm", "fire", "wind", "stone"]

FROM_EMAIL = ""#provide the gmail here
APP_PASSWORD = ""#and also the password

def generate_hybrid_password(num_words=1, num_digits=4, num_special=1):
    words = [secrets.choice(WORDS).capitalize() for _ in range(num_words)]
    digits = ''.join(secrets.choice(string.digits) for _ in range(num_digits))
    specials = ''.join(secrets.choice("!@#$%^&*_-") for _ in range(num_special))
    return ''.join(['SDMIT-'] + words + [digits, specials])


def send_password_email(to_email: str, password: str) -> bool:
    try:
        if not FROM_EMAIL or not APP_PASSWORD:
            print("Email credentials missing. Set BACKEND_EMAIL and BACKEND_EMAIL_APP_PASSWORD.")
            return False

        server = smtplib.SMTP("smtp.gmail.com", 587, timeout=15)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(FROM_EMAIL, APP_PASSWORD)

        msg = EmailMessage()

        #Subject for lecturer password email
        msg["Subject"] = "SDMIT Nexus Lecturer Account Password"

        #Content specific for lecturer credentials
        content = f"""
Hello,

Your SDMIT Nexus Lecturer account has been created successfully.

Here are your login credentials:
Email: {to_email}
Temporary Password: {password}

⚠️ Please change your password immediately after your first login for security.

Best regards,  
SDMIT Nexus Team
        """

        msg["From"] = FROM_EMAIL
        msg["To"] = to_email
        msg.set_content(content)

        server.send_message(msg)
        server.quit()
        print(f"Password email sent successfully to {to_email}")
        return True

    except Exception as e:
        print(f"❌ Failed to send password email: {e}")
        return False

