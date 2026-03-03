import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOOK_SHADES: Record<string, string> = {
  "classic-red": "classic bold red lipstick, timeless and saturated true red",
  "berry-wine": "extremely sheer, barely-there berry-red lip tint — almost transparent, like a single swipe of tinted lip oil. The natural lip color and texture must remain clearly visible underneath. Only the faintest hint of warm cranberry-red. Think 'just bitten lips', not lipstick. Glossy, dewy, ultra-sheer — absolutely no opacity or full coverage",
  "nude-rose": "soft nude-rosé / pinkish-nude lipstick, natural 'my lips but better' tone",
  "coral-sunset": "warm terracotta-brown matte lipstick, medium-deep earthy brown with warm terracotta and burnt sienna undertone, slightly rich and moody but not full dark brick",
  "deep-terracotta": "deep warm terracotta-brick matte lipstick, rich dark earthy brown-red with deep burnt sienna and chocolate undertone, noticeably darker than a typical terracotta",
};

const SHAPE_LOCK_RULES = `
CRITICAL RULES (MUST FOLLOW WITHOUT EXCEPTION):
- Edit method: perform a localized lip-color edit only, not a global face regeneration.
- TEETH ARE LOCKED: every teeth pixel must remain identical to the original photo (shape, contour, spacing, texture, color, brightness, sharpness).
- NEVER alter, invent, remove, smooth, whiten, blur, resize, reshape, or restyle teeth.
- LIP GEOMETRY LOCK: keep lip shape/size/thickness/outline/cupid's bow/corners exactly unchanged.
- MOUTH LOCK: do not change mouth openness, expression, tongue, or inner mouth.
- NO FACIAL ENHANCEMENTS: do NOT smooth skin, remove blemishes, reduce wrinkles, brighten eyes, reshape face, slim nose, enhance eyebrows, add makeup to any area other than lips, adjust skin tone, or improve appearance in any way.
- NO BEAUTIFICATION: the output must look exactly like the input photo with ONLY the lip color changed. Do not make the person look "better" or more attractive.
- Keep all non-lip regions pixel-identical to the original (skin, eyes, nose, hair, jawline, clothing, background, lighting, skin texture, pores, imperfections).
- Only recolor lip surface within the exact existing lip boundary.
- If any of the above cannot be satisfied, return an unchanged image rather than modifying teeth, geometry, or facial appearance.
`.trim();

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

    const shade = LOOK_SHADES[look] || LOOK_SHADES["classic-red"];
    const prompt = `Edit this photo to apply lipstick only. Target shade: ${shade}. ${SHAPE_LOCK_RULES} Keep everything else EXACTLY the same — same face, expression, lighting, background, skin texture, skin imperfections, pores, and blemishes. Do NOT beautify, enhance, smooth, or improve any aspect of the face. Make the lip color change photorealistic but change NOTHING else.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
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
