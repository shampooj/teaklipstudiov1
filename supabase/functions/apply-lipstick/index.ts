import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOOK_SHADES: Record<string, string> = {
  "classic-red": "bold red matte lipstick with a flat velvety finish, no gloss or shine",
  "berry-wine": "sheer rosy-pink berry tint with a glossy, dewy finish",
  "nude-rose": "warm mauvy-pink demi-satin lipstick with soft mauve undertones",
  "coral-sunset": "medium earthy brown demi-satin lipstick with warm terracotta undertones",
  "deep-terracotta": "deep terracotta-plum matte lipstick with purple-plum undertones",
};


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, look = "classic-red", skinTone = "", lipTone = "", model = "google/gemini-3.1-flash-image-preview" } = await req.json();

    const ALLOWED_MODELS = ["google/gemini-3.1-flash-image-preview", "google/gemini-3-pro-image-preview"];
    const selectedModel = ALLOWED_MODELS.includes(model) ? model : ALLOWED_MODELS[0];

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shade = LOOK_SHADES[look] || LOOK_SHADES["classic-red"];

    const prompt = `Apply this lipstick shade to the lips in this photo: ${shade}. Keep everything else in the image exactly the same — same face, skin, teeth, expression, lighting, and background. Only change the lip color.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const requestBody = JSON.stringify({
      model: selectedModel,
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
      const textContent = data.choices?.[0]?.message?.content || "no content";
      const fullStructure = JSON.stringify(data.choices?.[0]?.message || {}).substring(0, 1000);
      console.error("No image in response. Text:", textContent.substring(0, 300));
      console.error("Response structure:", fullStructure);
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
