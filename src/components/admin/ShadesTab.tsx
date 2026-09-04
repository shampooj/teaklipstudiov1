import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_DETAILS, getComplexionType } from "@/data/lipstickRecommendations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";
import BanubaInlinePreview from "./BanubaInlinePreview";
import ErrorBoundary from "./ErrorBoundary";
import skinLightBrown from "@/assets/skin-light-brown.jpg";
import nero from "@/assets/nero.jpg";
import cynthia from "@/assets/cynthia.jpg";
import anastasia from "@/assets/anastasia.jpg";
import maseray from "@/assets/maseray.jpg";
import sanna from "@/assets/sanna.jpg";
import terushka from "@/assets/terushka.jpg";
import aaliyah from "@/assets/aaliyah.jpg";
import nupoora from "@/assets/nupoora.jpg";
import tanvi from "@/assets/tanvi.jpg";
import arris from "@/assets/skin_tone/web/skin_tone_arris.jpg";
import pritt from "@/assets/skin_tone/web/skin_tone_pritt.jpg";
import geeta from "@/assets/skin_tone/web/skin_tone_geeta.jpg";
import {
  BANUBA_FINISHES,
  type BanubaFinish,
  finishLabel,
  resolveBanubaFinish,
} from "@/lib/banubaFinish";

const AVATAR_IMAGES = [
  nero,
  cynthia,
  anastasia,
  maseray,
  sanna,
  terushka,
  nupoora,
];
const LIP_TONE_AVATARS: Record<string, string> = {
  "beige": arris,
  "brown-rose": cynthia,
  "chestnut": anastasia,
  "deep-brown-rose": maseray,
  "grey-rose": nero,
  "mauve": tanvi,
  "mostly-deep-brown": aaliyah,
  "mostly-purple": geeta,
  "mostly-light-brown": pritt,
  "mostly-pink": sanna,
};
const avatarFor = (id: string, idx: number) =>
  LIP_TONE_AVATARS[id] ?? AVATAR_IMAGES[idx % AVATAR_IMAGES.length];

import ltBeige from "@/assets/lip-tone/web/beige-1.jpg";
import ltBrownRose from "@/assets/lip-tone/web/brown-rose-1.jpg";
import ltChestnut from "@/assets/lip-tone/web/chestnut-1.jpg";
import ltDeepBrownRose from "@/assets/lip-tone/web/deep-brown-rose-1.jpg";
import ltGreyRose from "@/assets/lip-tone/web/grey-rose-1.jpg";
import ltMauve from "@/assets/lip-tone/web/mauve-1.jpg";
import ltMostlyDeepBrown from "@/assets/lip-tone/web/mostly-deep-brown-1.jpg";
import ltMostlyPurple from "@/assets/lip-tone/web/mostly-purple-1.jpg";
import ltMostlyLightBrown from "@/assets/lip-tone/web/mostly-light-brown-1.jpg";
import ltMostlyPink from "@/assets/lip-tone/web/mostly-pink-1.jpg";
const LIP_TONES = [
  { id: "beige", label: "Beige", image: ltBeige },
  { id: "brown-rose", label: "Brown Rose", image: ltBrownRose },
  { id: "chestnut", label: "Chestnut", image: ltChestnut },
  { id: "deep-brown-rose", label: "Deep Brown Rose", image: ltDeepBrownRose },
  { id: "grey-rose", label: "Grey Rose", image: ltGreyRose },
  { id: "mauve", label: "Mauve", image: ltMauve },
  { id: "mostly-deep-brown", label: "Mostly Deep Brown", image: ltMostlyDeepBrown },
  { id: "mostly-purple", label: "Mostly Purple", image: ltMostlyPurple },
  { id: "mostly-light-brown", label: "Mostly Light Brown", image: ltMostlyLightBrown },
  { id: "mostly-pink", label: "Mostly Pink", image: ltMostlyPink },
] as const;

type Finish = BanubaFinish;

const SKIN_TONES = [
  { id: "light-brown", label: "Light Brown" },
  { id: "medium-brown", label: "Medium Brown" },
  { id: "deep-brown", label: "Deep Brown" },
  { id: "rich-brown", label: "Rich Brown" },
  { id: "full-brown", label: "Full Brown" },
] as const;

interface Setting {
  variant_name: string;
  skin_tone: string;
  lip_tone: string;
  hex: string;
  finish: Finish;
  opacity: number;
  /** makeup_lipsgloss alpha, 0..1; 0 = off */
  gloss: number;
}


// Shades only (exclude lip sets)
const SHADES = Object.entries(PRODUCT_DETAILS)
  .filter(([name]) => !name.startsWith("Lip Set"))
  .map(([name, d]) => ({ name, label: d.label, color: d.color }));

const DEFAULT_SKIN_TONE = "light-brown";

const ShadesTab = () => {
  const [selectedShade, setSelectedShade] = useState<string>(SHADES[0]?.name ?? "");
  const [rows, setRows] = useState<Record<string, Setting>>({});
  const [loading, setLoading] = useState(true);
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [previewTone, setPreviewTone] = useState<(typeof LIP_TONES)[number] | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from as any)("lipstick_shade_settings")
      .select("*")
      .eq("variant_name", selectedShade)
      .eq("skin_tone", DEFAULT_SKIN_TONE);
    if (error) {
      toast.error("Failed to load shade settings");
      setLoading(false);
      return;
    }
    const map: Record<string, Setting> = {};
    const defaultColor = PRODUCT_DETAILS[selectedShade]?.color ?? "#b91c1c";
    LIP_TONES.forEach((t) => {
      const existing = (data || []).find((r: any) => r.lip_tone === t.id);
      map[t.id] = existing
        ? {
            ...existing,
            opacity: Number(existing.opacity),
            gloss: Number(existing.gloss ?? 0),
            // rows saved before the full preset list used matte/satin/glossy
            finish: resolveBanubaFinish(existing.finish),
          }
        : {
            variant_name: selectedShade,
            skin_tone: DEFAULT_SKIN_TONE,
            lip_tone: t.id,
            hex: defaultColor,
            finish: "satin",
            opacity: 0.8,
            gloss: 0,
          };
    });
    setRows(map);
    setLoading(false);
  };

  useEffect(() => {
    if (selectedShade) void fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShade]);

  const updateRow = (lipTone: string, patch: Partial<Setting>) => {
    setRows((prev) => ({ ...prev, [lipTone]: { ...prev[lipTone], ...patch } }));
  };

  const buildPayload = (r: Setting) =>
    SKIN_TONES.map((st) => ({
      variant_name: r.variant_name,
      skin_tone: st.id,
      lip_tone: r.lip_tone,
      hex: r.hex,
      finish: r.finish,
      opacity: r.opacity,
      gloss: r.gloss,
      updated_at: new Date().toISOString(),
    }));

  const handleSaveRow = async (lipTone: string) => {
    const r = rows[lipTone];
    if (!r) return;
    setSavingRow(lipTone);
    const { error } = await (supabase.from as any)("lipstick_shade_settings")
      .upsert(buildPayload(r), { onConflict: "variant_name,skin_tone,lip_tone" });
    if (error) {
      toast.error(`Failed to save: ${error.message}`);
      console.error(error);
    } else {
      toast.success(`${r.lip_tone} saved`);
    }
    setSavingRow(null);
  };


  const currentShade = useMemo(() => SHADES.find((s) => s.name === selectedShade), [selectedShade]);

  return (
    <div className="space-y-5">
      <div className="border border-border rounded-2xl p-5 space-y-4">
        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Lipstick Shade</p>
          <Select value={selectedShade} onValueChange={setSelectedShade}>
            <SelectTrigger className="rounded-full border-foreground/20 text-[10px] w-full">
              <SelectValue placeholder="Select shade" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl max-h-80">
              {SHADES.map((s) => (
                <SelectItem key={s.name} value={s.name} className="text-[10px]">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border border-border"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name} — {s.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentShade && (
            <span className="text-[10px] text-muted-foreground block">{currentShade.label}</span>
          )}
        </div>
      </div>



      <div className="border border-border rounded-2xl p-5 space-y-4">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
          Banuba render settings per complexion type
        </p>


        {loading ? (
          <p className="text-muted-foreground text-xs text-center py-8">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-left text-muted-foreground uppercase tracking-widest text-[9px]">
                  <th className="py-2 pr-3 font-normal w-40">Preview</th>
                  <th className="py-2 pr-3 font-normal">Lip Tone</th>
                  <th className="py-2 pr-3 font-normal">Hex</th>
                  <th className="py-2 pr-3 font-normal">Finish</th>
                  <th className="py-2 pr-3 font-normal w-44">Opacity</th>
                  <th className="py-2 pr-3 font-normal w-44">Gloss</th>
                  <th className="py-2 pr-3 font-normal w-24"></th>
                  <th className="py-2 pr-3 font-normal w-12"></th>
                </tr>
              </thead>
              <tbody>
                {LIP_TONES.map((t, tIdx) => {
                  const row = rows[t.id];
                  if (!row) return null;
                  const avatarImg = avatarFor(t.id, tIdx);
                  return (
                    <Fragment key={t.id}>
                    <tr className="border-t border-border">
                      <td className="py-2 pr-3">
                        <div className="relative w-36 h-36 rounded-lg overflow-hidden border border-border bg-muted">
                          <img
                            src={avatarImg}
                            alt={t.label}
                            className={`absolute inset-0 w-full h-full object-cover ${
                              false
                                ? "scale-150"
                                : ""
                            }`}
                          />
                        </div>

                      </td>
                      <td className="py-2 pr-3 font-medium">{t.label}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={row.hex}
                            onChange={(e) => updateRow(t.id, { hex: e.target.value })}
                            className="h-7 w-10 rounded border border-border cursor-pointer bg-transparent"
                          />
                          <Input
                            value={row.hex}
                            onChange={(e) => updateRow(t.id, { hex: e.target.value })}
                            className="h-7 w-24 text-[10px] rounded-md"
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <Select
                          value={row.finish}
                          onValueChange={(v) => updateRow(t.id, { finish: v as Finish })}
                        >
                          <SelectTrigger className="h-7 w-44 text-[10px] rounded-md border-foreground/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl max-h-72">
                            {BANUBA_FINISHES.map((f) => (
                              <SelectItem key={f} value={f} className="text-[10px]">
                                {finishLabel(f)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={row.opacity}
                            onChange={(e) =>
                              updateRow(t.id, { opacity: Number(e.target.value) })
                            }
                            className="flex-1 accent-foreground"
                          />
                          <Input
                            type="number"
                            min={0}
                            max={1}
                            step={0.05}
                            value={row.opacity}
                            onChange={(e) =>
                              updateRow(t.id, { opacity: Number(e.target.value) })
                            }
                            className="h-7 w-16 text-[10px] rounded-md"
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        {/* Banuba makeup_lipsgloss alpha: a specular highlight
                            layered over the lipstick. 0 omits the layer. */}
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={row.gloss}
                            onChange={(e) =>
                              updateRow(t.id, { gloss: Number(e.target.value) })
                            }
                            className="flex-1 accent-foreground"
                          />
                          <Input
                            type="number"
                            min={0}
                            max={1}
                            step={0.05}
                            value={row.gloss}
                            onChange={(e) =>
                              updateRow(t.id, { gloss: Number(e.target.value) })
                            }
                            className="h-7 w-16 text-[10px] rounded-md"
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <Button
                          type="button"
                          onClick={() => handleSaveRow(t.id)}
                          disabled={savingRow === t.id}
                          className="rounded-full bg-foreground text-background hover:bg-foreground/85 text-[9px] px-3 h-7"
                        >
                          {savingRow === t.id ? "Saving…" : "Save"}
                        </Button>
                      </td>
                      <td className="py-2 pr-3">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewTone((cur) => (cur?.id === t.id ? null : t))
                          }
                          className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-border hover:bg-muted transition-colors"
                          aria-label={`Preview ${t.label} with Banuba`}
                          title={previewTone?.id === t.id ? "Close preview" : "Preview with Banuba"}
                        >
                          {previewTone?.id === t.id ? (
                            <X className="w-3.5 h-3.5" />
                          ) : (
                            <Pencil className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {previewTone?.id === t.id && (
                      <tr key={`${t.id}-preview`} className="bg-muted/30">
                        <td colSpan={8} className="py-4 px-3">
                          <ErrorBoundary>
                            <BanubaInlinePreview
                              lipToneLabel={t.label}
                              lipToneImage={avatarImg}
                              hex={row.hex}
                              finish={row.finish}
                              opacity={row.opacity}
                              gloss={row.gloss}
                              scale={false ? 1.5 : 1}
                            />
                          </ErrorBoundary>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShadesTab;
