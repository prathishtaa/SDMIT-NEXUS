# Email Configuration for SDMIT Nexus
# Note: Email credentials (FROM_EMAIL and APP_PASSWORD) are imported from utils/otp_utils.py
# This ensures all emails (OTP, notifications) use the same email account

# Email Templates
EMAIL_TEMPLATES = {
    "material_notification": {
        "subject": "New Study Material Available - SDMIT Nexus",
        "template": """
Dear Student,

{lecturer_name} has uploaded new materials. Please view them.

Material: {material_title}

Please log in to SDMIT Nexus to access the new materials.

Best regards,
SDMIT Nexus Team
        """
    },
    "event_notification": {
        "subject": "New Event Announcement - SDMIT Nexus",
        "template": """
Dear Student,

{lecturer_name} has uploaded an event-related announcement.

Event: {event_title}

Please log in to SDMIT Nexus to view the event details.

Best regards,
SDMIT Nexus Team
        """
    },
    "document_notification": {
        "subject": "Document Verification Required - SDMIT Nexus",
        "template": """
Dear Student,

{lecturer_name} has uploaded a document for verification and signing. Please complete it at the earliest.

Document: {document_title}

Please log in to SDMIT Nexus to sign the document.

Best regards,
SDMIT Nexus Team
        """
    },
    "deadline_reminder": {
        "subject": "Document Deadline Reminder - SDMIT Nexus",
        "template": """
Dear Student,

The document awaiting verification and signing is near its deadline. Please complete it as soon as possible.

Document: {document_title}
Deadline: {deadline}

Please log in to SDMIT Nexus to sign the document immediately.

Best regards,
SDMIT Nexus Team
        """
    },
    "reply_notification": {
        "subject": "New reply to your message in Group Discussion",
        "template": """
Dear User,

{replier_name} has replied to your message. Please check it in the Group Discussion section.

Best regards,
SDMIT Nexus Team
        """
    }
}

# SMTP Settings
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_TIMEOUT = 15

# Notification Settings
DEADLINE_REMINDER_MINUTES = 10  # Minutes before deadline to send reminder
