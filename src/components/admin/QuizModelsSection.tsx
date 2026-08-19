import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Trash2 } from "lucide-react";
import {
  BUNDLED_MODEL_IMAGES,
  QuizModelRow,
  resolveModelUrl,
  useAllQuizModels,
} from "@/hooks/useQuizModels";
import { SKIN_TONE_IDS, LIP_TONE_IDS } from "@/data/lipstickRecommendations";

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

// One card per model candidate: bundled folder images always appear (with a
// virtual unconfigured card until first touched); uploads appear from their
// DB row.
interface Card {
  row: QuizModelRow | null;
  imageKey: string | null;
  url: string;
}

export default function QuizModelsSection() {
  const qc = useQueryClient();
  const { data: rows, isLoading } = useAllQuizModels();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cards = useMemo<Card[]>(() => {
    const byKey = new Map<string, QuizModelRow>();
    const uploaded: QuizModelRow[] = [];
    for (const r of rows ?? []) {
      if (r.image_key) byKey.set(r.image_key, r);
      else uploaded.push(r);
    }
    const bundled = Object.keys(BUNDLED_MODEL_IMAGES)
      .sort()
      .map((key) => ({
        row: byKey.get(key) ?? null,
        imageKey: key,
        url: BUNDLED_MODEL_IMAGES[key],
      }));
    const uploads = uploaded
      .map((row) => ({ row, imageKey: null, url: resolveModelUrl(row) ?? "" }))
      .filter((c) => c.url);
    return [...uploads, ...bundled];
  }, [rows]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["quiz-models"] });

  // Creates the row on first touch of a bundled image, updates otherwise.
  const saveCard = async (card: Card, patch: Partial<QuizModelRow>) => {
    const cardId = card.row?.id ?? card.imageKey!;
    setBusyKey(cardId);
    try {
      if (card.row) {
        const { error } = await (supabase.from as any)("quiz_models")
          .update(patch)
          .eq("id", card.row.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from as any)("quiz_models")
          .insert({ image_key: card.imageKey, ...patch });
        if (error) throw error;
      }
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save model");
    } finally {
      setBusyKey(null);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("quiz-models")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { error: insertError } = await (supabase.from as any)("quiz_models")
        .insert({ image_path: path });
      if (insertError) throw insertError;
      toast.success("Model uploaded — set its tones, then enable Display");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (card: Card) => {
    if (!card.row) return;
    setBusyKey(card.row.id);
    try {
      if (card.row.image_path) {
        await supabase.storage.from("quiz-models").remove([card.row.image_path]);
      }
      const { error } = await (supabase.from as any)("quiz_models")
        .delete()
        .eq("id", card.row.id);
      if (error) throw error;
      toast.success("Model removed");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove model");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-4 pt-8 border-t border-border">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-medium" style={{ fontFamily: "'Wolpe Pegasus', serif" }}>
            Quiz Models
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xl">
            Choose which model photos appear on the quiz's "who would you like to see the
            shades on?" page. Set each model's skin and lip tone first — picking a model in
            the quiz shows that complexion's recommendations and try-on colors, not the
            quiz-taker's own selections. Only models with both tones set can be displayed.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            variant="outline"
            className="text-xs rounded-full"
          >
            <Upload className="h-3 w-3 mr-1" />
            {uploading ? "Uploading…" : "Upload model photo"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {cards.map((card) => {
            const cardId = card.row?.id ?? card.imageKey!;
            const busy = busyKey === cardId;
            const skin = card.row?.skin_tone ?? "";
            const lip = card.row?.lip_tone ?? "";
            const canDisplay = !!skin && !!lip;
            const displayed = !!card.row?.display;
            return (
              <div
                key={cardId}
                className={`border rounded-2xl p-3 space-y-2 ${displayed ? "border-foreground" : "border-border"} ${busy ? "opacity-60" : ""}`}
              >
                <div className="relative">
                  <img
                    src={card.url}
                    alt="Model"
                    loading="lazy"
                    className="w-full aspect-[4/5] object-cover rounded-md"
                  />
                  {card.row?.image_path && (
                    <button
                      type="button"
                      title="Remove uploaded model"
                      onClick={() => handleDelete(card)}
                      className="absolute top-1.5 right-1.5 bg-background/90 border border-border rounded-full p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <Select
                  value={skin}
                  onValueChange={(v) => saveCard(card, { skin_tone: v })}
                >
                  <SelectTrigger className="text-[11px] h-8">
                    <SelectValue placeholder="Skin tone…" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKIN_TONE_IDS.map((id) => (
                      <SelectItem key={id} value={id} className="text-xs">{SKIN_TONE_LABELS[id]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={lip}
                  onValueChange={(v) => saveCard(card, { lip_tone: v })}
                >
                  <SelectTrigger className="text-[11px] h-8">
                    <SelectValue placeholder="Lip tone…" />
                  </SelectTrigger>
                  <SelectContent>
                    {LIP_TONE_IDS.filter((id) => LIP_TONE_LABELS[id]).map((id) => (
                      <SelectItem key={id} value={id} className="text-xs">{LIP_TONE_LABELS[id]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label
                  className={`flex items-center gap-2 pt-1 ${canDisplay ? "cursor-pointer" : "opacity-40"}`}
                  title={canDisplay ? undefined : "Set both tones first"}
                >
                  <Checkbox
                    checked={displayed}
                    disabled={!canDisplay || busy}
                    onCheckedChange={(checked) => saveCard(card, { display: checked === true })}
                    className="h-4 w-4 rounded-none border border-foreground/40 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                  />
                  <span className="text-[10px] uppercase tracking-widest text-foreground">
                    Display in quiz
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
