# WhatsApp Integration Setup Guide

## ✅ Completed Automatic Steps

The following files have been created automatically:

1. ✅ Edge Function: `supabase/functions/send-whatsapp/index.ts`
2. ✅ Deno config: `supabase/functions/send-whatsapp/deno.json`
3. ✅ Auth script: `whatsapp-auth-setup.js`

---

## 🔧 Manual Steps You Need to Do

### **Step 1: Deploy Edge Function to Supabase**

Run in your terminal:

```bash
supabase functions deploy send-whatsapp
```

**Expected output:**
```
✅ Function deployed successfully
Function endpoint: https://xxx.functions.supabase.co/send-whatsapp
```

---

### **Step 2: Set Environment Variable**

1. Go to **Supabase Dashboard** (https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Edge Functions** → **Secrets**
4. Click **Add secret**
5. Fill in:
   - **Name**: `ADMIN_WHATSAPP_NUMBER`
   - **Value**: `919876543210` (Your WhatsApp number with country code, NO + sign)

Example:
- India: `919876543210`
- US: `12025551234`
- UK: `442071838750`

6. Click **Add**

---

### **Step 3: Authenticate with WhatsApp** (One-Time)

**On your local computer:**

1. Install Node.js if not already installed: https://nodejs.org/

2. Open Terminal/Command Prompt and navigate to project:
```bash
cd /path/to/player-registration-portal
```

3. Install dependencies:
```bash
npm install @whiskeysockets/baileys qrcode-terminal
```

4. Run authentication script:
```bash
node whatsapp-auth-setup.js
```

5. **Important**: 
   - A QR code will appear in your terminal
   - Open WhatsApp on your phone
   - Go to **Settings** → **Linked Devices** → **Link a device**
   - **Scan the QR code** within 20 seconds
   - Wait for "✅ SUCCESS! WhatsApp Connected!"

6. A folder `auth_info_baileys/` will be created automatically

---

### **Step 4: Create Supabase Webhook**

1. Go to **Supabase Dashboard**
2. Click **Database** (left sidebar)
3. Click **Webhooks** (under Database section)
4. Click **Create a new hook**
5. Fill in the form:

| Field | Value |
|-------|-------|
| **Name** | `whatsapp-on-player-register` |
| **Table** | `players` |
| **Events** | Check only: **Insert** |
| **Function** | `send-whatsapp` |
| **HTTP method** | POST |

6. Click **Create webhook**

---

### **Step 5: Test It**

1. Go to your registration website: `http://localhost:3000`
2. Fill out the registration form completely
3. Submit it
4. **Check your WhatsApp** - you should receive a message within 5-10 seconds

**Expected message format:**
```
🏏 *New Player Registration!*

📝 *Player Details:*
Name: John Doe
📱 Phone: 9876543210
🏠 Flat: A-101
📅 Age: 25
👤 Gender: MALE
🎯 Role: All Rounder
💳 UTR: 123456789012
💰 Payment: ₹500 ✓

✅ Registration confirmed & payment verified!
```

---

## 📋 Checklist

- [ ] Edge function deployed (`supabase functions deploy send-whatsapp`)
- [ ] Environment variable set in Supabase (ADMIN_WHATSAPP_NUMBER)
- [ ] Node.js installed locally
- [ ] Dependencies installed (`npm install @whiskeysockets/baileys qrcode-terminal`)
- [ ] WhatsApp authenticated (QR code scanned)
- [ ] `auth_info_baileys/` folder created
- [ ] Webhook created in Supabase
- [ ] Test registration completed
- [ ] WhatsApp message received ✓

---

## ⚠️ Important Notes

1. **Your WhatsApp Account:**
   - Don't use this account for other WhatsApp Web logins
   - Don't log out from another device while script is running
   - The authentication persists in `auth_info_baileys/` folder

2. **Number Format:**
   - Always use country code (no + sign)
   - India: `91` + 10 digits = 12 digits total
   - Example: `919876543210`

3. **Message Delivery:**
   - Messages are sent within 2-5 seconds
   - Your phone must have WhatsApp installed
   - Internet connection required on phone

4. **Free & Unlimited:**
   - ✅ No API costs
   - ✅ Unlimited messages
   - ✅ No monthly fees

5. **Troubleshooting:**

| Issue | Solution |
|-------|----------|
| QR code won't scan | Delete `auth_info_baileys/` and run script again |
| Messages not sending | Check environment variable is set correctly |
| "Connection closed" | Restart script: `node whatsapp-auth-setup.js` |
| WhatsApp blocks account | Use a different WhatsApp number or account |

---

## 📞 What Players See

Players will NOT receive messages. Only your admin WhatsApp number will receive notifications for each registration.

---

## 🚀 Ready?

Start from **Step 1** above and follow each step carefully!

Let me know when you complete each step.
