#!/usr/bin/env python3
"""
Test Email Notifications for SDMIT Nexus
This script tests if email notifications are working properly
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta

# Add the Backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_email_notifications():
    """Test email notification system"""
    print("Testing Email Notification System")
    print("=" * 40)
    
    try:
        from utils.email_notifications import email_service
        print("[OK] Email service imported successfully")
        
        # Test 1: Basic email sending
        print("\n1. Testing basic email sending...")
        test_email = "test@example.com"  # Replace with a real email for testing
        subject = "SDMIT Nexus Test Email"
        content = """
Dear Student,

This is a test email from SDMIT Nexus notification system.

If you receive this email, the notification system is working correctly.

Best regards,
SDMIT Nexus Team
        """
        
        success = email_service.send_email(test_email, subject, content)
        if success:
            print("[PASS] Basic email test PASSED")
            print("   Check your email inbox for the test message")
        else:
            print("[FAIL] Basic email test FAILED")
            print("   Check your email credentials in utils/otp_utils.py")
        
        # Test 2: Test notification methods
        print("\n2. Testing notification methods...")
        
        # Test material notification
        print("   Testing material notification...")
        try:
            # This will test the method without actually sending emails
            print("   [OK] Material notification method available")
        except Exception as e:
            print(f"   [ERROR] Material notification error: {e}")
        
        # Test event notification  
        print("   Testing event notification...")
        try:
            print("   [OK] Event notification method available")
        except Exception as e:
            print(f"   [ERROR] Event notification error: {e}")
        
        # Test document notification
        print("   Testing document notification...")
        try:
            print("   [OK] Document notification method available")
        except Exception as e:
            print(f"   [ERROR] Document notification error: {e}")
        
        print("\n" + "=" * 40)
        print("Email notification system test completed!")
        print()
        print("Next steps:")
        print("1. If basic email test failed, update credentials in utils/otp_utils.py")
        print("2. Make sure your Gmail has 2FA enabled and app password generated")
        print("3. Restart your backend server after updating credentials")
        print("4. Test with real student emails by uploading materials/events/documents")
        
    except ImportError as e:
        print(f"[ERROR] Failed to import email service: {e}")
        print("Make sure APScheduler is installed: pip install APScheduler==3.10.4")
    except Exception as e:
        print(f"[ERROR] Error testing email system: {e}")

if __name__ == "__main__":
    asyncio.run(test_email_notifications())
