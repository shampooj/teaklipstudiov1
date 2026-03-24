import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SHOPIFY_STORE_DOMAIN = "nupoora-784.myshopify.com";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const shop = url.searchParams.get("shop");
    const state = url.searchParams.get("state");
    const hmac = url.searchParams.get("hmac");

    if (!code || !shop) {
      return new Response(
        renderHTML("Error", "Missing required parameters (code or shop)."),
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    // Validate shop domain
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop)) {
      return new Response(
        renderHTML("Error", "Invalid shop domain."),
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    const SHOPIFY_API_KEY = Deno.env.get("SHOPIFY_API_KEY");
    const SHOPIFY_API_SECRET = Deno.env.get("SHOPIFY_API_SECRET");

    if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
      return new Response(
        renderHTML("Error", "SHOPIFY_API_KEY and SHOPIFY_API_SECRET are not configured."),
        { status: 500, headers: { "Content-Type": "text/html" } }
      );
    }

    // Exchange the authorization code for an access token
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code: code,
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Token exchange failed:", tokenRes.status, errorText);
      return new Response(
        renderHTML("Token Exchange Failed", `Shopify returned status ${tokenRes.status}: ${errorText}`),
        { status: 500, headers: { "Content-Type": "text/html" } }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("No access_token in response:", JSON.stringify(tokenData));
      return new Response(
        renderHTML("Error", "No access_token returned from Shopify."),
        { status: 500, headers: { "Content-Type": "text/html" } }
      );
    }

    console.log("Successfully obtained access token. Scope:", tokenData.scope);

    // Return the token to the user so they can store it as a secret
    return new Response(
      renderHTML(
        "✅ Authorization Successful!",
        `<p>Access token obtained successfully.</p>
         <p><strong>Scope:</strong> ${tokenData.scope || "N/A"}</p>
         <p style="margin-top:16px;padding:12px;background:#f0f0f0;border-radius:8px;word-break:break-all;font-family:monospace;font-size:14px;">${accessToken}</p>
         <p style="margin-top:12px;color:#666;">Copy this token and add it as the <code>SHOPIFY_ACCESS_TOKEN</code> secret in your Lovable project.</p>`
      ),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (e) {
    console.error("shopify-oauth-callback error:", e);
    return new Response(
      renderHTML("Error", e instanceof Error ? e.message : "Unknown error"),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
});

function renderHTML(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 60px auto; padding: 20px; color: #333; }
    h1 { font-size: 24px; }
    code { background: #e8e8e8; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${body}
</body>
</html>`;
}
