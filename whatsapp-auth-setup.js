// WhatsApp Authentication Setup Script
// Run this locally on your computer to authenticate with WhatsApp

import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import QRCode from "qrcode-terminal";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authPath = path.join(__dirname, "auth_info_baileys");

async function connectWhatsApp() {
  console.log("🚀 Starting WhatsApp Authentication...\n");

  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Show QR Code
    if (qr) {
      console.log("\n📱 SCAN THIS QR CODE WITH YOUR WHATSAPP PHONE:\n");
      QRCode.generate(qr, { small: true });
      console.log("\n⏱️  You have 20 seconds to scan...\n");
    }

    // Connection opened
    if (connection === "open") {
      console.log("\n✅ SUCCESS! WhatsApp Connected!\n");
      console.log("📁 Auth files saved in: auth_info_baileys/");
      console.log("\n📌 NEXT STEPS:");
      console.log("1. You can now register players on the website");
      console.log("2. Admin will receive WhatsApp messages for each registration\n");

      await saveCreds();
      process.exit(0);
    }

    // Connection closed
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = reason === DisconnectReason.loggedOut ? false : true;

      console.log("❌ Connection closed, reason:", reason);

      if (shouldReconnect) {
        console.log("🔄 Attempting to reconnect...");
        connectWhatsApp();
      } else {
        console.log("⚠️  You've been logged out. Please run this script again.");
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (m) => {
    console.log("📨 New message received (testing connection)");
  });
}

// Start authentication
connectWhatsApp().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
