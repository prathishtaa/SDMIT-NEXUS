#!/usr/bin/env python3
"""
Email Configuration Verification Script
This script verifies that email credentials are properly configured
"""

import sys
import os

# Add the Backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def verify_email_configuration():
    """Verify email configuration is properly set up"""
    print("Email Configuration Verification")
    print("=" * 40)
    
    # Check OTP utils configuration
    try:
        from utils.otp_utils import FROM_EMAIL, APP_PASSWORD
        print("✅ Successfully imported email credentials from otp_utils.py")
        
        if FROM_EMAIL and APP_PASSWORD:
            print(f"✅ Email configured: {FROM_EMAIL}")
            print("✅ App password is set")
        else:
            print("❌ Email credentials are empty")
            print("   Please set FROM_EMAIL and APP_PASSWORD in utils/otp_utils.py")
            
    except ImportError as e:
        print(f"❌ Failed to import from otp_utils.py: {e}")
    
    print()
    
    # Check email notification service
    try:
        from utils.email_notifications import email_service, FROM_EMAIL as NOTIF_EMAIL, APP_PASSWORD as NOTIF_PASSWORD
        print("✅ Successfully imported email notification service")
        
        if NOTIF_EMAIL and NOTIF_PASSWORD:
            print(f"✅ Notification service email: {NOTIF_EMAIL}")
            print("✅ Notification service password is set")
        else:
            print("❌ Notification service email credentials are empty")
            
    except ImportError as e:
        print(f"❌ Failed to import email notification service: {e}")
    
    print()
    
    # Check if credentials match
    try:
        from utils.otp_utils import FROM_EMAIL as OTP_EMAIL, APP_PASSWORD as OTP_PASSWORD
        from utils.email_notifications import FROM_EMAIL as NOTIF_EMAIL, APP_PASSWORD as NOTIF_PASSWORD
        
        if OTP_EMAIL == NOTIF_EMAIL and OTP_PASSWORD == NOTIF_PASSWORD:
            print("✅ Email credentials match between OTP and notification services")
        else:
            print("❌ Email credentials don't match between services")
            
    except Exception as e:
        print(f"❌ Error comparing credentials: {e}")
    
    print()
    print("Configuration verification completed!")
    print("=" * 40)
    print("If all checks pass, your email notification system is ready to use.")

if __name__ == "__main__":
    verify_email_configuration()


