import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  PRODUCT_DETAILS,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  SKIN_TONE_IDS,
  LIP_TONE_IDS,
  getComplexionType,
  RecommendationCategory,
} from "@/data/lipstickRecommendations";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import QuizModelsSection from "@/components/admin/QuizModelsSection";

const SKIN_TONE_LABELS: Record<string, string> = {
  "light-brown": "Light Brown",
  "medium-brown": "Medium Brown",
  "deep-brown": "Deep Brown",
  "rich-brown": "Rich Brown",
  "full-brown": "Full Brown",
};

const LIP_TONE_LABELS: Record<string, string> = {
  "beige": "Beige",
  "brown-rose": "Brown Rose",
  "chestnut": "Chestnut",
  "deep-brown-rose": "Deep Brown Rose",
  "grey-rose": "Grey Rose",
  "mauve": "Mauve",
  "mostly-deep-brown": "Mostly Deep Brown",
  "mostly-purple": "Mostly Purple",
  "mostly-light-brown": "Mostly Light Brown",
  "mostly-pink": "Mostly Pink",
};

const FRONTEND_LIP_TONE_IDS = [
  "beige",
  "brown-rose",
  "chestnut",
  "deep-brown-rose",
  "grey-rose",
  "mauve",
  "mostly-deep-brown",
  "mostly-purple",
  "mostly-light-brown",
  "mostly-pink",
];

interface Row {
  skin_tone: string;
  lip_tone: string;
  category: string;
  variant_name: string;
}

export default function RecommendationsTab() {
  const qc = useQueryClient();
  const [skinTone, setSkinTone] = useState<string>(SKIN_TONE_IDS[0]);
  const [lipTone, setLipTone] = useState<string>(FRONTEND_LIP_TONE_IDS[0]);
  const [slots, setSlots] = useState<Record<RecommendationCategory, string>>({
    MLBB: "", RED: "", DAY: "", EVENING: "",
  });
  const [saving, setSaving] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["recommendations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recommendations")
        .select("skin_tone, lip_tone, category, variant_name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  // Populate slot state when selection or data changes
  useEffect(() => {
    if (!rows) return;
    const next: Record<RecommendationCategory, string> = {
      MLBB: "", RED: "", DAY: "", EVENING: "",
    };
    for (const r of rows) {
      if (r.skin_tone === skinTone && r.lip_tone === lipTone) {
        next[r.category as RecommendationCategory] = r.variant_name;
      }
    }
    setSlots(next);
  }, [rows, skinTone, lipTone]);

  const variantOptions = useMemo(() => Object.keys(PRODUCT_DETAILS), []);
  const complexionType = getComplexionType(skinTone, lipTone);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = CATEGORY_ORDER
        .filter((cat) => slots[cat])
        .map((cat) => ({
          skin_tone: skinTone,
          lip_tone: lipTone,
          category: cat,
          variant_name: slots[cat],
        }));

      if (payload.length !== CATEGORY_ORDER.length) {
        toast.error("Please pick a product for every slot before saving.");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("recommendations")
        .upsert(payload, { onConflict: "skin_tone,lip_tone,category" });
      if (error) throw error;

      toast.success("Recommendations updated.");
      qc.invalidateQueries({ queryKey: ["recommendations"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium" style={{ fontFamily: "'Wolpe Pegasus', serif" }}>
          Recommendations
        </h2>
        <p className="text-[11px] text-muted-foreground mt-1">
          Edit which 5 products appear on the results screen for each of the 48 complexion types.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Skin Tone</label>
          <Select value={skinTone} onValueChange={setSkinTone}>
            <SelectTrigger className="w-56 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SKIN_TONE_IDS.map((id) => (
                <SelectItem key={id} value={id} className="text-xs">{SKIN_TONE_LABELS[id]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Lip Tone</label>
          <Select value={lipTone} onValueChange={setLipTone}>
            <SelectTrigger className="w-56 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FRONTEND_LIP_TONE_IDS.map((id) => (
                <SelectItem key={id} value={id} className="text-xs">{LIP_TONE_LABELS[id]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {complexionType && (
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground pb-2">
            Complexion Type #{complexionType}
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <div className="border border-border rounded-2xl divide-y divide-border max-w-3xl">
          {CATEGORY_ORDER.map((cat) => {
            const selected = slots[cat];
            const selectedDetails = selected ? PRODUCT_DETAILS[selected] : undefined;
            return (
              <div key={cat} className="flex items-center gap-4 p-4">
                <div className="w-48">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{cat}</p>
                  <p className="text-xs">{CATEGORY_LABELS[cat]}</p>
                </div>
                <div
                  className="w-6 h-6 rounded-full border border-border shrink-0"
                  style={{ backgroundColor: selectedDetails?.color ?? "transparent" }}
                />
                <div className="flex-1">
                  <Select
                    value={selected}
                    onValueChange={(v) => setSlots((s) => ({ ...s, [cat]: v }))}
                  >
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Choose product…" /></SelectTrigger>
                    <SelectContent>
                      {variantOptions.map((name) => {
                        const d = PRODUCT_DETAILS[name];
                        return (
                          <SelectItem key={name} value={name} className="text-xs">
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full border border-border inline-block"
                                style={{ backgroundColor: d.color }}
                              />
                              {name}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedDetails && (
                    <p className="text-[10px] text-muted-foreground mt-1">{selectedDetails.label}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="text-xs">
        {saving ? "Saving…" : "Save changes"}
      </Button>

      <QuizModelsSection />
    </div>
  );
}
