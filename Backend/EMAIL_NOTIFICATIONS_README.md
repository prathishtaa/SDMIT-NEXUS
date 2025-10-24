# Email Notification System for SDMIT Nexus

This document explains how to set up and use the email notification system for SDMIT Nexus.

## Features

The email notification system provides the following features:

1. **Material Notifications**: When a lecturer uploads study materials, all students in the respective group receive email notifications.

2. **Event Notifications**: When a lecturer uploads event-related announcements, all students in the respective group receive email notifications.

3. **Document Notifications**: When a lecturer uploads documents for verification and signing, all students in the respective group receive email notifications.

4. **Deadline Reminders**: Students who haven't signed documents receive email reminders 30 minutes before the deadline.

## Setup Instructions

### 1. Install Dependencies

Make sure you have the required dependencies installed:

```bash
pip install APScheduler==3.10.4
```

### 2. Configure Email Settings

The email notification system uses the same email credentials as the OTP verification system. 

**Update the email credentials in `Backend/utils/otp_utils.py`:**

```python
FROM_EMAIL = "your-email@gmail.com"  # Replace with your Gmail address
APP_PASSWORD = "your-app-password"   # Replace with your Gmail App Password
```

This ensures that all emails (OTP verification, password reset, and notifications) are sent from the same email account.

### 3. Gmail App Password Setup

To use Gmail for sending emails, you need to:

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in the `APP_PASSWORD` field

### 4. Start the Application

The email notification service will automatically start when you run the FastAPI application:

```bash
python main.py
```

## How It Works

### Material Upload Notifications

When a lecturer uploads materials via the `/files/post-announcements` endpoint:
- The system identifies all students in the lecturer's group
- Sends email notifications to all students with the lecturer's name and material title
- Example email: "Dr. Smith has uploaded new materials. Please view them."

### Event Upload Notifications

When a lecturer uploads events via the `/files/post-announcements` endpoint:
- The system identifies all students in the lecturer's group
- Sends email notifications to all students with the lecturer's name and event title
- Example email: "Dr. Smith has uploaded an event-related announcement."

### Document Upload Notifications

When a lecturer uploads documents via the `/documents/upload` endpoint:
- The system identifies all students in the lecturer's group
- Sends email notifications to all students with the lecturer's name and document title
- Schedules a deadline reminder 30 minutes before the deadline
- Example email: "Dr. Smith has uploaded a document for verification and signing. Please complete it at the earliest."

### Deadline Reminders

The system automatically:
- Schedules reminders 30 minutes before document deadlines
- Sends reminders only to students who haven't signed the document
- Cancels scheduled reminders if documents are deleted
- Example email: "The document awaiting verification and signing is near its deadline. Please complete it as soon as possible."

## Configuration Options

You can customize the email system by modifying `Backend/config/email_config.py`:

- `DEADLINE_REMINDER_MINUTES`: Change the reminder timing (default: 30 minutes)
- `EMAIL_TEMPLATES`: Customize email subject lines and content
- `SMTP_SERVER`, `SMTP_PORT`: Use different email providers

## Troubleshooting

### Common Issues

1. **Email credentials missing**: Make sure `FROM_EMAIL` and `APP_PASSWORD` are set in `Backend/utils/otp_utils.py`.

2. **Authentication failed**: Verify your Gmail app password is correct and 2FA is enabled.

3. **Emails not sending**: Check the application logs for detailed error messages.

4. **Scheduled reminders not working**: Ensure the APScheduler is running and the application is not restarted frequently.

5. **OTP emails work but notifications don't**: This usually means the email credentials are properly set in `otp_utils.py` but there might be an issue with the notification service initialization.

### Logs

The system logs all email activities. Check the console output for:
- Successful email sends
- Failed email attempts
- Scheduled reminder activities
- Error messages

## API Integration

The email notifications are automatically integrated into the existing API endpoints:

- `POST /files/post-announcements` - Triggers material/event notifications
- `POST /documents/upload` - Triggers document notifications and schedules reminders
- `DELETE /documents/delete/{document_id}` - Cancels scheduled reminders

No additional API calls are needed - the system works automatically in the background.

## Security Notes

- Store email credentials securely
- Use environment variables for production deployments
- Consider using a dedicated email service for production use
- Monitor email sending limits and quotas

## Testing

To test the email system:

1. Set up a test Gmail account
2. Configure the email settings
3. Upload materials/events/documents as a lecturer
4. Check that students receive email notifications
5. Test deadline reminders by setting a deadline in the near future
