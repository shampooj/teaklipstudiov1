import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const SHOPIFY_API_SECRET = Deno.env.get("SHOPIFY_API_SECRET");

    if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
      throw new Error("SHOPIFY_API_KEY and SHOPIFY_API_SECRET must be configured");
    }

    // Use Shopify's OAuth token endpoint with client_credentials grant
    const tokenUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/oauth/access_token`;

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Shopify token exchange failed:", tokenRes.status, errorText);
      return new Response(
        JSON.stringify({ error: "Token exchange failed", status: tokenRes.status, details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("No access_token in response:", JSON.stringify(tokenData));
      return new Response(
        JSON.stringify({ error: "No access_token returned from Shopify" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the SHOPIFY_ACCESS_TOKEN secret in Supabase vault
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Delete old secret if exists, then insert new one
      const { data: existingSecrets } = await supabase.rpc("get_secret_names") as any;
      
      // We can't directly update vault secrets via client, so we'll just return the token
      // The caller can use it or store it as needed
      console.log("Access token obtained successfully");
    }

    return new Response(
      JSON.stringify({
        success: true,
        access_token: accessToken,
        scope: tokenData.scope,
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
