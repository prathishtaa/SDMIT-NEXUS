#!/usr/bin/env python3
"""
Test script for email notification system
Run this script to test the email functionality
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta

# Add the Backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.email_notifications import email_service

async def test_email_system():
    """Test the email notification system"""
    print("Testing Email Notification System...")
    print("=" * 50)
    
    # Test 1: Basic email sending
    print("Test 1: Basic email sending")
    test_email = "test@example.com"  # Replace with a real email for testing
    subject = "SDMIT Nexus Test Email"
    content = """
Dear Student,

This is a test email from SDMIT Nexus email notification system.

If you receive this email, the system is working correctly.

Best regards,
SDMIT Nexus Team
    """
    
    success = email_service.send_email(test_email, subject, content)
    if success:
        print("✅ Basic email test passed")
    else:
        print("❌ Basic email test failed")
    
    print()
    
    # Test 2: Schedule deadline reminder
    print("Test 2: Schedule deadline reminder")
    document_id = 999  # Test document ID
    deadline = datetime.now() + timedelta(minutes=1)  # 1 minute from now
    
    try:
        email_service.schedule_deadline_reminder(document_id, deadline)
        print("✅ Deadline reminder scheduling test passed")
    except Exception as e:
        print(f"❌ Deadline reminder scheduling test failed: {e}")
    
    print()
    
    # Test 3: Cancel deadline reminder
    print("Test 3: Cancel deadline reminder")
    try:
        email_service.cancel_deadline_reminder(document_id)
        print("✅ Deadline reminder cancellation test passed")
    except Exception as e:
        print(f"❌ Deadline reminder cancellation test failed: {e}")
    
    print()
    print("Email system tests completed!")
    print("=" * 50)
    print("Note: To test with real emails, update the email configuration")
    print("in Backend/utils/otp_utils.py and replace 'test@example.com' with a real email address.")
    print("The notification system uses the same email credentials as OTP verification.")

if __name__ == "__main__":
    asyncio.run(test_email_system())
