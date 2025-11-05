#!/usr/bin/env python3
"""
Email Credentials Update Helper
This script helps you update email credentials for notifications
"""

import os
import sys

def update_email_credentials():
    """Helper to update email credentials"""
    print("SDMIT Nexus Email Credentials Update")
    print("=" * 40)
    print()
    print("Current issue: Gmail authentication is failing")
    print("Error: Username and Password not accepted")
    print()
    print("To fix this, you need to:")
    print()
    print("1. Go to your Gmail account")
    print("2. Enable 2-Factor Authentication (if not already enabled)")
    print("3. Generate an App Password:")
    print("   - Go to Google Account settings")
    print("   - Security → 2-Step Verification → App passwords")
    print("   - Generate a new app password for 'Mail'")
    print("   - Copy the 16-character password")
    print()
    print("4. Update the file: Backend/utils/otp_utils.py")
    print("   Change these lines:")
    print("   FROM_EMAIL = 'your-email@gmail.com'")
    print("   APP_PASSWORD = 'your-16-character-app-password'")
    print()
    print("5. Test the email system:")
    print("   cd Backend")
    print("   python test_notifications.py")
    print()
    print("6. Restart your backend server:")
    print("   python main.py")
    print()
    print("After updating credentials, students will receive emails for:")
    print("- Material uploads")
    print("- Event announcements") 
    print("- Document signing requests")
    print("- Deadline reminders")
    print()
    print("The email notification system is already integrated")
    print("and will work automatically once credentials are fixed!")

if __name__ == "__main__":
    update_email_credentials()


