#!/bin/bash

# WhatsApp Authentication Setup - Simple Wrapper
# This script runs the authentication with the required Node.js flag

echo "🚀 Starting WhatsApp Authentication..."
echo ""
echo "📱 Instructions:"
echo "1. A QR code will appear below"
echo "2. Open WhatsApp on your phone"
echo "3. Go to Settings → Linked Devices → Link a device"
echo "4. Scan the QR code within 20 seconds"
echo ""
echo "-------------------------------------------"
echo ""

node --experimental-global-webcrypto whatsapp-auth-setup.js
