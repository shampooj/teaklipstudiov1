import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { skinTone, lipTone, requestedCode } = await req.json();

    if (!skinTone || !lipTone) {
      return new Response(
        JSON.stringify({ error: "skinTone and lipTone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let SHOPIFY_ACCESS_TOKEN = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    
    // Fall back to DB-stored token if env secret is not set
    if (!SHOPIFY_ACCESS_TOKEN) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "SHOPIFY_ACCESS_TOKEN")
        .single();
      SHOPIFY_ACCESS_TOKEN = data?.value;
    }
    
    if (!SHOPIFY_ACCESS_TOKEN) {
      throw new Error("SHOPIFY_ACCESS_TOKEN is not configured");
    }

    // Generate unique code: TEAK-{SKIN}-{LIP}-{random}
    const skinSlug = skinTone.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const lipSlug = lipTone.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const generatedCode = `TEAK-${skinSlug}-${lipSlug}-${randomSuffix}`;
    const discountCode = typeof requestedCode === "string" && /^TEAK-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]{5}$/.test(requestedCode)
      ? requestedCode
      : generatedCode;

    const graphqlUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

    // Create discount code via GraphQL Admin API with combinesWith support
    const mutation = `
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                codes(first: 1) {
                  edges {
                    node {
                      code
                    }
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      basicCodeDiscount: {
        title: discountCode,
        code: discountCode,
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        usageLimit: 1,
        appliesOncePerCustomer: true,
        customerSelection: {
          all: true,
        },
        customerGets: {
          value: {
            percentage: 0.1,
          },
          items: {
            all: true,
          },
        },
        combinesWith: {
          shippingDiscounts: true,
          productDiscounts: false,
          orderDiscounts: false,
        },
      },
    };

    console.log("Calling Shopify GraphQL:", graphqlUrl, JSON.stringify(variables));

    const graphqlRes = await fetch(graphqlUrl, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    if (!graphqlRes.ok) {
      const errorText = await graphqlRes.text();
      console.error("Shopify GraphQL error:", graphqlRes.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create discount" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const graphqlData = await graphqlRes.json();
    console.log("Shopify GraphQL response:", JSON.stringify(graphqlData));
    const userErrors = graphqlData?.data?.discountCodeBasicCreate?.userErrors;

    if (userErrors && userErrors.length > 0) {
      console.error("Shopify discount userErrors:", JSON.stringify(userErrors));
      return new Response(
        JSON.stringify({ error: "Failed to create discount", details: userErrors }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const createdCode =
      graphqlData?.data?.discountCodeBasicCreate?.codeDiscountNode?.codeDiscount?.codes?.edges?.[0]?.node?.code;

    return new Response(
      JSON.stringify({
        code: createdCode || discountCode,
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
