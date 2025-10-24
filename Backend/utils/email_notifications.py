import smtplib
from email.message import EmailMessage
from sqlalchemy.orm import Session
from models import Student, Lecturer, Group, DocumentSignature
from typing import List, Optional
import logging
from datetime import datetime, timedelta
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
import sys
import os

# Add the parent directory to the path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import email credentials from existing OTP utils
try:
    from utils.otp_utils import FROM_EMAIL, APP_PASSWORD
except ImportError:
    # Fallback to config file if OTP utils not available
    try:
        from config.email_config import FROM_EMAIL, APP_PASSWORD
    except ImportError:
        FROM_EMAIL = ""
        APP_PASSWORD = ""

# Import email templates and other settings from config
try:
    from config.email_config import (
        EMAIL_TEMPLATES, SMTP_SERVER, SMTP_PORT, 
        SMTP_TIMEOUT, DEADLINE_REMINDER_MINUTES
    )
except ImportError:
    # Fallback configuration if config file doesn't exist
    EMAIL_TEMPLATES = {}
    SMTP_SERVER = "smtp.gmail.com"
    SMTP_PORT = 587
    SMTP_TIMEOUT = 15
    DEADLINE_REMINDER_MINUTES = 30

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailNotificationService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.scheduler.start()
    
    def send_email(self, to_email: str, subject: str, content: str) -> bool:
        """Send a single email notification"""
        try:
            if not FROM_EMAIL or not APP_PASSWORD:
                logger.error("Email credentials missing. Set FROM_EMAIL and APP_PASSWORD.")
                return False

            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=SMTP_TIMEOUT)
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(FROM_EMAIL, APP_PASSWORD)

            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = FROM_EMAIL
            msg["To"] = to_email
            msg.set_content(content)

            server.send_message(msg)
            server.quit()
            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    async def send_material_notification(self, db: Session, group_id: int, lecturer_name: str, material_title: str):
        """Send email notifications to all students in a group when materials are uploaded"""
        try:
            # Get all students in the group
            students = db.query(Student).filter(Student.group_id == group_id).all()
            
            if not students:
                logger.warning(f"No students found in group {group_id}")
                return

            # Use email template if available
            template = EMAIL_TEMPLATES.get("material_notification", {})
            subject = template.get("subject", "New Study Material Available - SDMIT Nexus")
            content_template = template.get("template", """
Dear Student,

{lecturer_name} has uploaded new materials. Please view them.

Material: {material_title}

Please log in to SDMIT Nexus to access the new materials.

Best regards,
SDMIT Nexus Team
            """)
            content = content_template.format(
                lecturer_name=lecturer_name,
                material_title=material_title
            )

            # Send emails to all students
            for student in students:
                if student.email:
                    self.send_email(student.email, subject, content)
                    logger.info(f"Material notification sent to {student.email}")

        except Exception as e:
            logger.error(f"Error sending material notifications: {e}")

    async def send_event_notification(self, db: Session, group_id: int, lecturer_name: str, event_title: str):
        """Send email notifications to all students in a group when events are announced"""
        try:
            # Get all students in the group
            students = db.query(Student).filter(Student.group_id == group_id).all()
            
            if not students:
                logger.warning(f"No students found in group {group_id}")
                return

            # Use email template if available
            template = EMAIL_TEMPLATES.get("event_notification", {})
            subject = template.get("subject", "New Event Announcement - SDMIT Nexus")
            content_template = template.get("template", """
Dear Student,

{lecturer_name} has uploaded an event-related announcement.

Event: {event_title}

Please log in to SDMIT Nexus to view the event details.

Best regards,
SDMIT Nexus Team
            """)
            content = content_template.format(
                lecturer_name=lecturer_name,
                event_title=event_title
            )

            # Send emails to all students
            for student in students:
                if student.email:
                    self.send_email(student.email, subject, content)
                    logger.info(f"Event notification sent to {student.email}")

        except Exception as e:
            logger.error(f"Error sending event notifications: {e}")

    async def send_document_notification(self, db: Session, group_id: int, lecturer_name: str, document_title: str):
        """Send email notifications to all students in a group when documents are uploaded for signing"""
        try:
            # Get all students in the group
            students = db.query(Student).filter(Student.group_id == group_id).all()
            
            if not students:
                logger.warning(f"No students found in group {group_id}")
                return

            # Use email template if available
            template = EMAIL_TEMPLATES.get("document_notification", {})
            subject = template.get("subject", "Document Verification Required - SDMIT Nexus")
            content_template = template.get("template", """
Dear Student,

{lecturer_name} has uploaded a document for verification and signing. Please complete it at the earliest.

Document: {document_title}

Please log in to SDMIT Nexus to sign the document.

Best regards,
SDMIT Nexus Team
            """)
            content = content_template.format(
                lecturer_name=lecturer_name,
                document_title=document_title
            )

            # Send emails to all students
            for student in students:
                if student.email:
                    self.send_email(student.email, subject, content)
                    logger.info(f"Document notification sent to {student.email}")

        except Exception as e:
            logger.error(f"Error sending document notifications: {e}")

    async def send_deadline_reminder(self, document_id: int):
        """Send email reminders to students who haven't signed a document 30 minutes before deadline"""
        try:
            # Create a new database session for this async operation
            from db import SessionLocal
            db = SessionLocal()
            try:
                # Get document details
                from models import Document
                document = db.query(Document).filter(Document.document_id == document_id).first()
                
                if not document:
                    logger.warning(f"Document {document_id} not found")
                    return

                # Get lecturer name
                lecturer = db.query(Lecturer).filter(Lecturer.lecturer_id == document.uploaded_by).first()
                lecturer_name = lecturer.name if lecturer else "Lecturer"

                # Get all students in the group
                students = db.query(Student).filter(Student.group_id == document.group_id).all()
                
                if not students:
                    logger.warning(f"No students found in group {document.group_id}")
                    return

                # Get students who have already signed
                signed_student_ids = db.query(DocumentSignature.student_id).filter(
                    DocumentSignature.document_id == document_id
                ).all()
                signed_student_ids = [sid[0] for sid in signed_student_ids]

                # Filter students who haven't signed
                unsigned_students = [s for s in students if s.student_id not in signed_student_ids]

                if not unsigned_students:
                    logger.info(f"All students have signed document {document_id}")
                    return

                # Use email template if available
                template = EMAIL_TEMPLATES.get("deadline_reminder", {})
                subject = template.get("subject", "Document Deadline Reminder - SDMIT Nexus")
                content_template = template.get("template", """
Dear Student,

The document awaiting verification and signing is near its deadline. Please complete it as soon as possible.

Document: {document_title}
Deadline: {deadline}

Please log in to SDMIT Nexus to sign the document immediately.

Best regards,
SDMIT Nexus Team
                """)
                content = content_template.format(
                    document_title=document.title,
                    deadline=document.deadline.strftime('%Y-%m-%d %H:%M')
                )

                # Send emails to unsigned students
                for student in unsigned_students:
                    if student.email:
                        self.send_email(student.email, subject, content)
                        logger.info(f"Deadline reminder sent to {student.email}")
            finally:
                db.close()

        except Exception as e:
            logger.error(f"Error sending deadline reminders: {e}")

    def schedule_deadline_reminder(self, document_id: int, deadline: datetime):
        """Schedule a deadline reminder before the deadline"""
        try:
            reminder_time = deadline - timedelta(minutes=DEADLINE_REMINDER_MINUTES)
            
            # Only schedule if the reminder time is in the future
            if reminder_time > datetime.now():
                self.scheduler.add_job(
                    self.send_deadline_reminder,
                    DateTrigger(run_date=reminder_time),
                    args=[document_id],
                    id=f"deadline_reminder_{document_id}",
                    replace_existing=True
                )
                logger.info(f"Deadline reminder scheduled for document {document_id} at {reminder_time}")
            else:
                logger.warning(f"Cannot schedule reminder for document {document_id} - deadline too soon")
                
        except Exception as e:
            logger.error(f"Error scheduling deadline reminder: {e}")

    def cancel_deadline_reminder(self, document_id: int):
        """Cancel a scheduled deadline reminder"""
        try:
            job_id = f"deadline_reminder_{document_id}"
            self.scheduler.remove_job(job_id)
            logger.info(f"Deadline reminder cancelled for document {document_id}")
        except Exception as e:
            logger.error(f"Error cancelling deadline reminder: {e}")

# Global instance
email_service = EmailNotificationService()
