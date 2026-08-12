import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "gemini-flash-latest";

const SKIN_TONE_OPTIONS = ["light-brown", "medium-brown", "deep-brown", "rich-brown", "full-brown"];
const LIP_TONE_OPTIONS = [
  "beige", "brown-rose", "chestnut", "deep-brown-rose", "grey-rose", "mauve", "mostly-deep-brown", "mostly-purple", "mostly-light-brown", "mostly-pink",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, submissionId } = await req.json();

    if (!imageBase64 || !submissionId) {
      return new Response(
        JSON.stringify({ error: "imageBase64 and submissionId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this person's face photo. Categorize their skin tone and lip tone from the following options.

Skin tone options: ${SKIN_TONE_OPTIONS.join(", ")}
Lip tone options: ${LIP_TONE_OPTIONS.join(", ")}

Pick the single best match for each.`,
              },
              {
                type: "image_url",
                image_url: { url: imageBase64 },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_categorization",
              description: "Return the AI's categorization of skin tone and lip tone.",
              parameters: {
                type: "object",
                properties: {
                  skin_tone: {
                    type: "string",
                    enum: SKIN_TONE_OPTIONS,
                    description: "The closest skin tone match.",
                  },
                  lip_tone: {
                    type: "string",
                    enum: LIP_TONE_OPTIONS,
                    description: "The closest lip tone match.",
                  },
                },
                required: ["skin_tone", "lip_tone"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_categorization" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI categorization failed" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "AI did not return categorization" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categorization = JSON.parse(toolCall.function.arguments);

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: insertError } = await supabase.from("ai_categorization").insert({
      submission_id: submissionId,
      ai_skin_tone: categorization.skin_tone,
      ai_lip_tone: categorization.lip_tone,
      model_name: MODEL,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store categorization" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ skin_tone: categorization.skin_tone, lip_tone: categorization.lip_tone, model: MODEL }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("categorize-skin-lip error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
