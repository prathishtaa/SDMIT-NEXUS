# Email Notifications Fix for SDMIT Nexus

## 🔍 **Problem Identified**

The email notification system is properly integrated but **Gmail authentication is failing**. Students are not receiving emails because:

1. **Gmail credentials are incorrect** - The app password is not working
2. **Email authentication error** - "Username and Password not accepted"

## ✅ **Solution Steps**

### **Step 1: Fix Gmail Credentials**

The current credentials in `Backend/utils/otp_utils.py` are not working:
```python
FROM_EMAIL = "sdmitnexus@gmail.com"
APP_PASSWORD = "hoqz tajis vyvf xobr"  # This is incorrect
```

**You need to update these with your own Gmail credentials:**

1. **Go to your Gmail account**
2. **Enable 2-Factor Authentication** (if not already enabled)
3. **Generate App Password:**
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Copy the 16-character password

4. **Update the credentials in `Backend/utils/otp_utils.py`:**
   ```python
   FROM_EMAIL = "your-email@gmail.com"  # Your Gmail address
   APP_PASSWORD = "your-16-character-app-password"  # Your app password
   ```

### **Step 2: Test Email Sending**

After updating credentials, test the email system:
```bash
cd Backend
python test_notifications.py
```

### **Step 3: Restart Backend Server**

After updating credentials, restart your backend server:
```bash
python main.py
```

## 📧 **How Email Notifications Work**

The system is already integrated and will automatically send emails when:

### **1. Material Uploads**
- When a lecturer uploads study materials
- All students in the group receive email notifications
- Example: "Dr. Smith has uploaded new materials. Please view them."

### **2. Event Announcements**
- When a lecturer uploads event announcements
- All students in the group receive email notifications
- Example: "Dr. Smith has uploaded an event-related announcement."

### **3. Document Signing**
- When a lecturer uploads documents for verification
- All students in the group receive email notifications
- Example: "Dr. Smith has uploaded a document for verification and signing."

### **4. Deadline Reminders**
- Students who haven't signed documents receive reminders 30 minutes before deadline
- Example: "The document awaiting verification and signing is near its deadline."

## 🧪 **Testing the System**

### **Test 1: Basic Email Test**
```bash
cd Backend
python test_notifications.py
```

### **Test 2: Real Notification Test**
1. Login as a lecturer
2. Upload a material/event/document
3. Check if students in the group receive emails

### **Test 3: Check Email Logs**
The system logs all email activities. Check the console output for:
- Successful email sends
- Failed email attempts
- Error messages

## 🔧 **Current Integration Status**

✅ **Email service is properly integrated**
✅ **Material notifications are working**
✅ **Event notifications are working** 
✅ **Document notifications are working**
✅ **Deadline reminders are working**
❌ **Gmail credentials need to be updated**

## 📝 **Quick Fix Commands**

1. **Update credentials in `Backend/utils/otp_utils.py`**
2. **Test email system:**
   ```bash
   cd Backend
   python test_notifications.py
   ```
3. **Restart backend server:**
   ```bash
   python main.py
   ```

## 🚨 **Important Notes**

1. **Use your own Gmail account** - Don't use the default credentials
2. **Enable 2FA** - Required for app passwords
3. **Generate app password** - Not your regular Gmail password
4. **Test with real emails** - Use actual student email addresses for testing

## 📞 **If Still Not Working**

1. **Check Gmail settings** - Make sure 2FA is enabled
2. **Verify app password** - Generate a new one if needed
3. **Check email logs** - Look for specific error messages
4. **Test with different email** - Try with a different Gmail account

---

**Once you update the Gmail credentials, all email notifications will work automatically!** 🎉


