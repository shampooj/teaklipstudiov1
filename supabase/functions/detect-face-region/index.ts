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
                text: "Detect the face in this photo. Return a bounding box that tightly frames the face including forehead, chin, and both ears. Add about 20% padding on all sides so the crop looks natural. Return normalized coordinates (0 to 1) relative to the full image dimensions. If no face is found, return coordinates covering the center of the image."
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
              name: "return_face_region",
              description: "Return the bounding box around the face as normalized coordinates (0 to 1) relative to the full image.",
              parameters: {
                type: "object",
                properties: {
                  top: {
                    type: "number",
                    description: "Top edge of the face bounding box as a fraction of image height (0 = top of image)."
                  },
                  bottom: {
                    type: "number",
                    description: "Bottom edge of the face bounding box as a fraction of image height (1 = bottom of image)."
                  },
                  left: {
                    type: "number",
                    description: "Left edge of the face bounding box as a fraction of image width (0 = left of image)."
                  },
                  right: {
                    type: "number",
                    description: "Right edge of the face bounding box as a fraction of image width (1 = right of image)."
                  }
                },
                required: ["top", "bottom", "left", "right"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_face_region" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to detect face region" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Failed to detect face region" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const region = JSON.parse(toolCall.function.arguments);

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
    console.error("detect-face-region error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
