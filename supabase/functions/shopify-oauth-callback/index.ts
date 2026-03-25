import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const shop = url.searchParams.get("shop");

    if (!code || !shop) {
      return new Response(
        renderHTML("Error", "Missing required parameters (code or shop)."),
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

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

    // Exchange the authorization code for an offline access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
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
        renderHTML("Token Exchange Failed", `Shopify returned an error. The authorization code may have already been used. Please try the OAuth flow again.`),
        { status: 500, headers: { "Content-Type": "text/html" } }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return new Response(
        renderHTML("Error", "No access_token returned from Shopify."),
        { status: 500, headers: { "Content-Type": "text/html" } }
      );
    }

    console.log("Successfully obtained offline access token. Scope:", tokenData.scope);

    // Display the token for the user to copy and store as an env secret
    return new Response(
      renderHTML(
        "✅ Authorization Successful!",
        `<p>Your Shopify <strong>offline</strong> access token has been obtained.</p>
         <p><strong>Scope:</strong> ${tokenData.scope || "N/A"}</p>
         <p style="margin-top:16px;"><strong>Copy the token below</strong> and paste it into the Lovable chat so it can be stored as a secret:</p>
         <div style="margin-top:12px;padding:16px;background:#f0f0f0;border-radius:8px;word-break:break-all;font-family:monospace;font-size:14px;border:2px solid #333;position:relative;">
           <span id="token">${accessToken}</span>
           <button onclick="navigator.clipboard.writeText(document.getElementById('token').textContent).then(()=>this.textContent='Copied!')" style="position:absolute;top:8px;right:8px;padding:4px 12px;background:#333;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Copy</button>
         </div>
         <p style="margin-top:16px;color:#666;">This token does not expire. You can close this page after copying.</p>`
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
