import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOOK_SHADES: Record<string, string> = {
  "classic-red": "classic bold red MATTE lipstick, timeless and saturated true red with a completely FLAT MATTE finish — ABSOLUTELY ZERO gloss, ZERO shine, ZERO specular highlights, ZERO white reflections, ZERO sheen. The lip surface must look like velvet — completely diffuse with no light reflections whatsoever. Remove any existing shine or gloss from the lips and replace with pure flat matte color",
  "berry-wine": "ROSY PINK berry-red lip tint. On lighter lips: extremely sheer, barely-there, like a single swipe of tinted lip oil with natural lip visible underneath. On DARK BROWN lips with NO natural pink: apply MORE OPAQUE coverage with STRONGER PINK — the color must read clearly as rosy pink, NOT brown or muddy. Push aggressively toward warm rose-pink on dark skin. Glossy, dewy finish. Think 'just bitten lips' with a rosy glow",
  "nude-rose": "medium-pink demi-satin lipstick, a warm rosy-pink with soft mauve undertones — distinctly pink, not nude or brown. Think a warm medium pink with a subtle dusty-mauve tint. Light-medium coverage with a refined satin sheen. The color should read clearly as PINK first, mauve second. Warm peachy-pink warmth, never cool or brown",
  "coral-sunset": "warm terracotta-brown matte lipstick, medium-deep earthy brown with warm terracotta and burnt sienna undertone, slightly rich and moody but not full dark brick",
  "deep-terracotta": "deep warm terracotta-plum matte lipstick, rich dark earthy brown-red with a distinct purple-plum undertone — more purple than brick, with deep berry and chocolate notes. On darker skin tones the purple should be clearly visible, shifting away from orange-brick toward a cool plum-berry direction",
};

const SKIN_TONE_DESCRIPTIONS: Record<string, string> = {
  "light-brown": "light brown skin with warm golden undertones",
  "medium-brown": "medium brown skin with warm undertones",
  "deep-brown": "deep brown skin with rich undertones — lip-skin contrast may be subtle",
  "rich-brown": "rich dark brown skin — lip boundaries have very low contrast with surrounding skin, pay extra attention to identifying the vermilion border",
};

const SHAPE_LOCK_RULES = `
STRICT CONSTRAINTS:
- ONLY recolor lip pixels. Do NOT regenerate, redraw, or reconstruct any part of the image.
- LIP GEOMETRY IS LOCKED: lip outline, shape, size, thickness, cupid's bow, and corners must remain pixel-identical to the original. Do NOT reshape, enlarge, shrink, or alter lip boundaries.
- TEETH ARE LOCKED: if teeth are visible, every teeth pixel must remain completely untouched — no whitening, smoothing, reshaping, or altering.
- FACE IS LOCKED: do NOT change any facial feature, skin texture, blemish, pore, wrinkle, or expression. No beautification or enhancement of any kind.
- Only apply color within the natural lip boundary. Do NOT extend color beyond the vermilion border onto surrounding skin.
- If you cannot recolor lips without altering other features, return the image UNCHANGED.
`.trim();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, look = "classic-red", skinTone = "" } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shade = LOOK_SHADES[look] || LOOK_SHADES["classic-red"];
    const skinDesc = SKIN_TONE_DESCRIPTIONS[skinTone] || "";
    const skinContext = skinDesc ? `This person has ${skinDesc}.` : "";

    const prompt = `STEP 1 — IDENTIFY THE LIPS: Locate the lips in this photo. The lip area is defined by the vermilion border — the visible color transition where lip tissue meets surrounding face skin. The top boundary is the cupid's bow / upper lip edge. The bottom boundary is the lowest curve of the lower lip. The left and right boundaries are the mouth corners (oral commissures). Do NOT include the nose, nostrils, chin, or skin above the upper lip. ${skinContext}

STEP 2 — APPLY COLOR: Recolor ONLY the identified lip area with this shade: ${shade}.

STEP 3 — PRESERVE EVERYTHING ELSE: ${SHAPE_LOCK_RULES}

Keep everything else EXACTLY the same — same face, expression, lighting, background, skin texture, pores, and blemishes. Make the lip color change photorealistic but change NOTHING else.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const requestBody = JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
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
    });

    let response: Response | null = null;
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: requestBody,
      });

      if (response.status !== 429 || attempt === maxRetries) break;

      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      console.log(`Rate limited, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delay));
    }

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

    const responseText = await response.text();
    if (!responseText || responseText.trim() === "") {
      console.error("Empty response from AI gateway");
      return new Response(JSON.stringify({ error: "Empty response from AI. Please try again with a smaller or clearer photo." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", responseText.substring(0, 500));
      return new Response(JSON.stringify({ error: "Failed to parse AI response. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
