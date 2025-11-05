#!/usr/bin/env python3
"""
Email Configuration Update Script
This script helps you update email credentials for notifications
"""

import os
import sys

def update_email_config():
    """Update email configuration"""
    print("Email Configuration Update for SDMIT Nexus")
    print("=" * 50)
    print()
    print("Current email configuration:")
    print("FROM_EMAIL = 'sdmitnexus@gmail.com'")
    print("APP_PASSWORD = 'hoqz tajis vyvf xobr'")
    print()
    print("The email sending is failing due to authentication issues.")
    print("You need to update the Gmail credentials.")
    print()
    print("Steps to fix:")
    print("1. Go to your Gmail account settings")
    print("2. Enable 2-Factor Authentication")
    print("3. Generate an App Password:")
    print("   - Go to Google Account settings")
    print("   - Security → 2-Step Verification → App passwords")
    print("   - Generate a new app password for 'Mail'")
    print("4. Update the credentials in Backend/utils/otp_utils.py")
    print()
    print("Example updated configuration:")
    print("FROM_EMAIL = 'your-email@gmail.com'")
    print("APP_PASSWORD = 'your-16-character-app-password'")
    print()
    print("After updating, restart your backend server.")
    print()
    print("To test email sending, run:")
    print("python test_email_system.py")

if __name__ == "__main__":
    update_email_config()


