import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function verifyShopifyHmac(
  body: string,
  hmacHeader: string,
  secret: string
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );
  const computed = new TextDecoder().decode(
    hexEncode(new Uint8Array(signature))
  );

  // Shopify sends base64-encoded HMAC
  const expectedBase64 = btoa(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return expectedBase64 === hmacHeader;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SHOPIFY_WEBHOOK_SECRET = Deno.env.get("SHOPIFY_WEBHOOK_SECRET");
    if (!SHOPIFY_WEBHOOK_SECRET) {
      throw new Error("SHOPIFY_WEBHOOK_SECRET is not configured");
    }

    const body = await req.text();
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256") || "";
    const topic = req.headers.get("x-shopify-topic") || "";

    // Verify webhook signature
    const isValid = await verifyShopifyHmac(body, hmacHeader, SHOPIFY_WEBHOOK_SECRET);
    if (!isValid) {
      console.error("Invalid HMAC signature");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(body);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let eventName: string;
    let eventData: Record<string, unknown>;

    if (topic === "checkouts/create") {
      eventName = "checkout_initiated";
      eventData = {
        checkout_id: payload.id,
        email: payload.email || null,
        total_price: payload.total_price,
        currency: payload.currency,
        line_items_count: payload.line_items?.length || 0,
        source: "shopify_webhook",
      };
    } else if (topic === "orders/create") {
      eventName = "checkout_completed";
      eventData = {
        order_id: payload.id,
        order_number: payload.order_number,
        email: payload.email || null,
        total_price: payload.total_price,
        currency: payload.currency,
        line_items_count: payload.line_items?.length || 0,
        discount_codes: payload.discount_codes || [],
        source: "shopify_webhook",
      };
    } else {
      console.log("Unhandled webhook topic:", topic);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use a dedicated session_id for webhook events (based on checkout/order id)
    const sessionId = `shopify-${payload.id}`;

    const { error } = await supabase.from("quiz_events").insert({
      session_id: sessionId,
      event_name: eventName,
      event_data: eventData,
    });

    if (error) {
      console.error("Failed to insert event:", error);
      throw error;
    }

    console.log(`Logged ${eventName} for ${payload.id}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("shopify-webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
