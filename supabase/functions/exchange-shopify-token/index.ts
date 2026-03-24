import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPIFY_STORE_DOMAIN = "nupoora-784.myshopify.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SHOPIFY_API_KEY = Deno.env.get("SHOPIFY_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (!SHOPIFY_API_KEY) {
      throw new Error("SHOPIFY_API_KEY must be configured");
    }

    // Build the redirect URI pointing to the oauth callback edge function
    const redirectUri = `${SUPABASE_URL}/functions/v1/shopify-oauth-callback`;

    // Generate a nonce for CSRF protection
    const nonce = crypto.randomUUID();

    // Scopes needed for discount codes and order reading
    const scopes = "write_discounts,read_orders";

    // Build the Shopify authorization URL
    const authorizeUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}`;

    return new Response(
      JSON.stringify({
        authorize_url: authorizeUrl,
        redirect_uri: redirectUri,
        nonce: nonce,
        instructions: "Open the authorize_url in your browser. After approving, Shopify will redirect to the callback which will exchange the code for an access token.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("exchange-shopify-token error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
