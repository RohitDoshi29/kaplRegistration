import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory cache to prevent duplicate emails for the same player within 15 seconds
const recentAlerts = new Map<string, number>();

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ALERT_TO_EMAIL = Deno.env.get("ALERT_TO_EMAIL") || "rohitdoshi2904@gmail.com";

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not set in Supabase Edge Function Secrets.");
      return new Response(
        JSON.stringify({
          error: "RESEND_API_KEY is missing. Please set it in Supabase Project Settings -> Edge Functions -> Secrets.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));

    // Support both direct invocation and Supabase Database Webhook payload
    const record = body.record || body.new || body;
    const eventType = body.type || (body.record ? "Database Insert" : "Player Registration");

    // Prevent duplicate emails for the same player within 15 seconds
    const dedupeKey = `${record.id || ''}_${record.name || ''}_${record.transaction_id || ''}`;
    const now = Date.now();
    if (dedupeKey.trim().length > 2) {
      const lastSent = recentAlerts.get(dedupeKey);
      if (lastSent && now - lastSent < 15000) {
        console.log(`Deduplicated duplicate alert for ${dedupeKey}`);
        return new Response(JSON.stringify({ duplicate: true, message: "Duplicate alert skipped" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      recentAlerts.set(dedupeKey, now);

      // Clean up old entries
      if (recentAlerts.size > 200) {
        for (const [key, timestamp] of recentAlerts.entries()) {
          if (now - timestamp > 60000) recentAlerts.delete(key);
        }
      }
    }

    const playerName = record.name || record.full_name || record.email || "Registered Player";
    const phone = record.mobile_number || record.phone || "Not provided";
    const role = (record.role || "all_rounder").replace("_", " ").toUpperCase();
    const flatNo = record.flat_no || "N/A";
    const age = record.age || "N/A";
    const gender = record.gender ? record.gender.toUpperCase() : "N/A";
    const utr = record.transaction_id || "N/A";
    const fee = record.payment_amount || 500;
    const createdAt = record.created_at
      ? new Date(record.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // HTML Email Template
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; border-radius: 12px; max-width: 580px; margin: auto; border: 1px solid #f59e0b;">
        <div style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #f59e0b; margin: 0; font-size: 24px;">Premier League 3.0</h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">Official Registration & Login Alert System</p>
        </div>

        <div style="background-color: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
          <strong style="color: #fcd34d; font-size: 15px;">🏏 New Player Registration!</strong>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #cbd5e1;">A player has just submitted their registration to the live roster.</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 10px 0; color: #94a3b8;">Player Name:</td>
            <td style="padding: 10px 0; font-weight: bold; color: #ffffff; text-align: right;">${playerName}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 10px 0; color: #94a3b8;">Mobile Number:</td>
            <td style="padding: 10px 0; font-weight: bold; color: #10b981; text-align: right;">${phone}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 10px 0; color: #94a3b8;">Flat No & Age:</td>
            <td style="padding: 10px 0; color: #ffffff; text-align: right;">Flat ${flatNo} • Age: ${age}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 10px 0; color: #94a3b8;">Role / Gender:</td>
            <td style="padding: 10px 0; color: #ffffff; text-align: right;">${role} (${gender})</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 10px 0; color: #94a3b8;">UPI UTR / Trans ID:</td>
            <td style="padding: 10px 0; font-family: monospace; font-weight: bold; color: #f59e0b; text-align: right;">${utr}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
            <td style="padding: 10px 0; color: #94a3b8;">Entry Fee:</td>
            <td style="padding: 10px 0; font-weight: bold; color: #10b981; text-align: right;">₹${fee}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #94a3b8;">Registered At:</td>
            <td style="padding: 10px 0; color: #cbd5e1; text-align: right;">${createdAt} IST</td>
          </tr>
        </table>

        <div style="text-align: center; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
          <a href="https://jftwjqprwjeesivzmycy.supabase.co" style="display: inline-block; background-color: #f59e0b; color: #000000; font-weight: bold; font-size: 13px; text-decoration: none; padding: 10px 20px; border-radius: 8px;">
            Open Supabase Dashboard
          </a>
        </div>
      </div>
    `;

    // Send email using Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Premier League 3.0 <onboarding@resend.dev>",
        to: [ALERT_TO_EMAIL],
        subject: `🏏 New Player Registered: ${playerName} (Flat ${flatNo})`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API Error:", resendData);
      return new Response(JSON.stringify({ error: resendData }), {
        status: resendResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, resendId: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error sending alert email:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
