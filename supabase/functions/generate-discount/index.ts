import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPIFY_STORE_DOMAIN = "nupoora-784.myshopify.com";
const SHOPIFY_API_VERSION = "2025-07";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { skinTone, lipTone } = await req.json();

    if (!skinTone || !lipTone) {
      return new Response(
        JSON.stringify({ error: "skinTone and lipTone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SHOPIFY_ACCESS_TOKEN = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    if (!SHOPIFY_ACCESS_TOKEN) {
      throw new Error("SHOPIFY_ACCESS_TOKEN is not configured");
    }

    // Generate unique code: TEAK-{SKIN}-{LIP}-{random}
    const skinSlug = skinTone.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const lipSlug = lipTone.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const discountCode = `TEAK-${skinSlug}-${lipSlug}-${randomSuffix}`;

    const adminUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}`;

    // Step 1: Create a price rule for 10% off
    const priceRuleRes = await fetch(`${adminUrl}/price_rules.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_rule: {
          title: discountCode,
          target_type: "line_item",
          target_selection: "all",
          allocation_method: "across",
          value_type: "percentage",
          value: "-10.0",
          customer_selection: "all",
          usage_limit: 1,
          once_per_customer: true,
          starts_at: new Date().toISOString(),
          prerequisite_to_entitlement_purchase: { prerequisite_amount: null },
        },
      }),
    });

    if (!priceRuleRes.ok) {
      const errorText = await priceRuleRes.text();
      console.error("Shopify price rule error:", priceRuleRes.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create price rule" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const priceRuleData = await priceRuleRes.json();
    const priceRuleId = priceRuleData.price_rule.id;

    // Step 2: Create the discount code under that price rule
    const discountRes = await fetch(`${adminUrl}/price_rules/${priceRuleId}/discount_codes.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        discount_code: {
          code: discountCode,
        },
      }),
    });

    if (!discountRes.ok) {
      const errorText = await discountRes.text();
      console.error("Shopify discount code error:", discountRes.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create discount code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const discountData = await discountRes.json();

    return new Response(
      JSON.stringify({
        code: discountData.discount_code.code,
        priceRuleId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-discount error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
