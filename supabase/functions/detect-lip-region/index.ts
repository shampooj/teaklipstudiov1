import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this face photo. First, locate the EYES. Then return a bounding box that starts WELL BELOW the eyes — the top edge must be at or below the nose bridge (approximately mid-nose level). The crop must NEVER include any part of the eyes, eyebrows, or forehead. Include the nose tip, lips, chin, and jawline. The result should show roughly the bottom third of the face only. Be aggressive about cutting high — it is much better to cut too low (missing some nose) than to include any eye area."
              },
              {
                type: "image_url",
                image_url: { url: imageBase64 }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_lip_region",
              description: "Return the bounding box of the lower face / lip region as normalized coordinates (0 to 1).",
              parameters: {
                type: "object",
                properties: {
                  top: {
                    type: "number",
                    description: "Top edge of the crop region as a fraction of image height (0 = top of image, 1 = bottom). Should be roughly at the nose tip level."
                  },
                  bottom: {
                    type: "number",
                    description: "Bottom edge of the crop region as a fraction of image height. Should include the chin with some margin."
                  },
                  left: {
                    type: "number",
                    description: "Left edge of the crop region as a fraction of image width."
                  },
                  right: {
                    type: "number",
                    description: "Right edge of the crop region as a fraction of image width."
                  }
                },
                required: ["top", "bottom", "left", "right"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_lip_region" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to detect lip region" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Failed to detect lip region" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const region = JSON.parse(toolCall.function.arguments);

    // Clamp values to valid range
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    const result = {
      top: clamp(region.top),
      bottom: clamp(region.bottom),
      left: clamp(region.left),
      right: clamp(region.right),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-lip-region error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
