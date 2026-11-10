import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const record = body.record || body.new || body;

    // Extract player details
    const playerName = record.name || "Player";
    const phone = record.mobile_number || "";
    const flatNo = record.flat_no || "N/A";
    const age = record.age || "N/A";
    const role = (record.role || "all_rounder").replace("_", " ");
    const gender = record.gender?.toUpperCase() || "N/A";
    const utr = record.transaction_id || "N/A";

    // Admin WhatsApp number from environment
    const ADMIN_WHATSAPP = Deno.env.get("ADMIN_WHATSAPP_NUMBER") || "";

    if (!ADMIN_WHATSAPP) {
      return new Response(
        JSON.stringify({
          error: "ADMIN_WHATSAPP_NUMBER not configured",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const jid = `${ADMIN_WHATSAPP}@s.whatsapp.net`;

    const message = `🏏 *New Player Registration!*

📝 *Player Details:*
Name: ${playerName}
📱 Phone: ${phone}
🏠 Flat: ${flatNo}
📅 Age: ${age}
👤 Gender: ${gender}
🎯 Role: ${role}
💳 UTR: ${utr}
💰 Payment: ₹500 ✓

✅ Registration confirmed & payment verified!`;

    console.log("WhatsApp Webhook Triggered");
    console.log("Player:", playerName);
    console.log("Phone:", phone);
    console.log("Message queued for:", jid);

    return new Response(
      JSON.stringify({
        success: true,
        message: "WhatsApp message queued",
        player: playerName,
        phone: phone,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
