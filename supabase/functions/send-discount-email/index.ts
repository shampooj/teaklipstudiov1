import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Mints a single-use 10% Shopify code and delivers it BY EMAIL via Klaviyo,
// instead of showing it on-screen: a real address gets the reward, a fake one
// gets nothing. The profile is added to the Brown Skin Archive list (list
// membership only — no marketing consent is recorded), and a "Lip Studio
// Discount" event carries the code; a Klaviyo flow on that metric sends it.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPIFY_STORE_DOMAIN = "nupoora-784.myshopify.com";
const SHOPIFY_API_VERSION = "2025-07";
const KLAVIYO_REVISION = "2024-10-15";
// "Brown Skin Archive" list (created 2026-08-19); quiz and archive share it.
const KLAVIYO_LIST_ID = "X4RkpY";

const createDiscountCode = async (
  accessToken: string,
  skinTone: string,
  lipTone: string,
): Promise<string> => {
  const skinSlug = skinTone.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const lipSlug = lipTone.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const discountCode = `TEAK-${skinSlug}-${lipSlug}-${randomSuffix}`;

  const mutation = `
    mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
        codeDiscountNode {
          codeDiscount {
            ... on DiscountCodeBasic {
              codes(first: 1) { edges { node { code } } }
            }
          }
        }
        userErrors { field message }
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
      customerSelection: { all: true },
      customerGets: {
        value: { percentage: 0.1 },
        items: { all: true },
      },
      combinesWith: {
        shippingDiscounts: true,
        productDiscounts: false,
        orderDiscounts: false,
      },
    },
  };

  const res = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: mutation, variables }),
    },
  );

  if (!res.ok) {
    throw new Error(`Shopify GraphQL error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const userErrors = data?.data?.discountCodeBasicCreate?.userErrors;
  if (userErrors && userErrors.length > 0) {
    throw new Error(`Shopify discount userErrors: ${JSON.stringify(userErrors)}`);
  }
  return (
    data?.data?.discountCodeBasicCreate?.codeDiscountNode?.codeDiscount?.codes?.edges?.[0]
      ?.node?.code || discountCode
  );
};

const klaviyoHeaders = (apiKey: string) => ({
  Authorization: `Klaviyo-API-Key ${apiKey}`,
  "Content-Type": "application/json",
  revision: KLAVIYO_REVISION,
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, skinTone, lipTone, source } = await req.json();

    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || !skinTone || !lipTone) {
      return new Response(
        JSON.stringify({ error: "email, skinTone, and lipTone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SHOPIFY_ACCESS_TOKEN = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    const KLAVIYO_API_KEY = Deno.env.get("KLAVIYO_API_KEY");
    if (!SHOPIFY_ACCESS_TOKEN) throw new Error("SHOPIFY_ACCESS_TOKEN is not configured");
    if (!KLAVIYO_API_KEY) throw new Error("KLAVIYO_API_KEY is not configured");

    const discountCode = await createDiscountCode(SHOPIFY_ACCESS_TOKEN, skinTone, lipTone);

    // Create-or-update the profile so we can attach it to the archive list.
    const importRes = await fetch("https://a.klaviyo.com/api/profile-import/", {
      method: "POST",
      headers: klaviyoHeaders(KLAVIYO_API_KEY),
      body: JSON.stringify({
        data: { type: "profile", attributes: { email: trimmedEmail } },
      }),
    });
    if (!importRes.ok) {
      throw new Error(`Klaviyo profile import failed: ${importRes.status} ${await importRes.text()}`);
    }
    const profileId = (await importRes.json())?.data?.id;

    const listRes = await fetch(
      `https://a.klaviyo.com/api/lists/${KLAVIYO_LIST_ID}/relationships/profiles/`,
      {
        method: "POST",
        headers: klaviyoHeaders(KLAVIYO_API_KEY),
        body: JSON.stringify({ data: [{ type: "profile", id: profileId }] }),
      },
    );
    if (!listRes.ok && listRes.status !== 204) {
      console.error("Klaviyo list add failed:", listRes.status, await listRes.text());
    }

    // The flow triggered on this metric sends the code email.
    const eventRes = await fetch("https://a.klaviyo.com/api/events/", {
      method: "POST",
      headers: klaviyoHeaders(KLAVIYO_API_KEY),
      body: JSON.stringify({
        data: {
          type: "event",
          attributes: {
            properties: {
              discount_code: discountCode,
              source: source === "quiz" ? "quiz" : "archive",
              skin_tone: skinTone,
              lip_tone: lipTone,
            },
            metric: {
              data: { type: "metric", attributes: { name: "Lip Studio Discount" } },
            },
            profile: {
              data: { type: "profile", attributes: { email: trimmedEmail } },
            },
          },
        },
      }),
    });
    if (!eventRes.ok) {
      throw new Error(`Klaviyo event failed: ${eventRes.status} ${await eventRes.text()}`);
    }

    console.log(`Discount ${discountCode} queued to ${trimmedEmail} (${source})`);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-discount-email error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
