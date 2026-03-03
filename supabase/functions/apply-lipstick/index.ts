import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOOK_PROMPTS: Record<string, string> = {
  "classic-red":
    "Edit this photo to change ONLY the color of the person's lips to a classic bold red lipstick. Do NOT change the shape, size, thickness, or outline of the lips in any way. Do NOT enlarge, plump, reshape, or redefine the lip edges. Only alter the color/finish within the existing lip area. Keep everything else exactly the same — same face, expression, lighting, background, skin texture. Make it look natural and realistic.",
  "berry-wine":
    "Edit this photo to change ONLY the color of the person's lips to a deep berry-wine / dark plum lipstick. Rich, moody, and luxurious — think burgundy-berry tones. Do NOT change the shape, size, thickness, or outline of the lips in any way. Do NOT enlarge, plump, reshape, or redefine the lip edges. Only alter the color/finish within the existing lip area. Keep everything else exactly the same — same face, expression, lighting, background, skin texture. Make it look natural and realistic.",
  "nude-rose":
    "Edit this photo to change ONLY the color of the person's lips to a soft nude-rosé / pinkish-nude lipstick. Subtle, natural, and effortless — a 'my lips but better' shade. Do NOT change the shape, size, thickness, or outline of the lips in any way. Do NOT enlarge, plump, reshape, or redefine the lip edges. Only alter the color/finish within the existing lip area. Keep everything else exactly the same — same face, expression, lighting, background, skin texture. Make it look natural and realistic.",
  "coral-sunset":
    "Edit this photo to change ONLY the color of the person's lips to a warm terracotta-brick matte lipstick — a muted earthy coral-brown, rich burnt sienna / terracotta tone with a velvety matte finish. Think 90s supermodel brown-red lip. Do NOT change the shape, size, thickness, or outline of the lips in any way. Do NOT enlarge, plump, reshape, or redefine the lip edges. Only alter the color/finish within the existing lip area. Keep everything else exactly the same — same face, expression, lighting, background, skin texture. Make it look natural and realistic.",
};
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, look = "classic-red" } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = LOOK_PROMPTS[look] || LOOK_PROMPTS["classic-red"];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to process image" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const resultImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!resultImage) {
      return new Response(JSON.stringify({ error: "No image was generated. Try again with a clearer photo." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ resultImage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("apply-lipstick error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
