import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import SwatchColorPicker from "./SwatchColorPicker";
import ShadeRenderGallery, { type GalleryItem } from "./ShadeRenderGallery";
import { useShadeSwatches, swatchColor } from "@/hooks/useShadeSwatches";
import { VARIANT_MAP } from "@/data/lipstickRecommendations";
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
import { SHINE_DEFAULT_SCALE, SHINE_SCALE_MAX, shineFrom } from "@/lib/banubaEffect";

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

// Labelled control cell for the per-tone card grid.
const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block space-y-1">
    <span className="block text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
    {children}
  </label>
);

const SliderField = ({
  label,
  value,
  onChange,
  max = 1,
  step = 0.05,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
  step?: number;
  disabled?: boolean;
}) => (
  <Field label={label}>
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 min-w-0 accent-foreground disabled:opacity-40"
      />
      <Input
        type="number"
        min={0}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-7 w-16 shrink-0 text-[10px] rounded-md"
      />
    </div>
  </Field>
);

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
  /** makeup_lipsshine alpha, 0..1; 0 = off */
  shine_intensity: number;
  /** makeup_lipsshine scale; Banuba's shine preset is 1 */
  shine_scale: number;
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
  // Saved settings for every shade x lip tone at the default skin tone,
  // keyed "variant|lipTone": feeds the "one model, every shade" grid.
  const [allSettings, setAllSettings] = useState<Record<string, Setting>>({});
  const [galleryTone, setGalleryTone] = useState<(typeof LIP_TONES)[number]["id"]>(LIP_TONES[0].id);
  const pendingJump = useRef<string | null>(null);
  const [previewTone, setPreviewTone] = useState<(typeof LIP_TONES)[number] | null>(null);
  // Gallery tile -> that lip tone's card: scroll it into view, open its live
  // preview, and flash a ring so the eye lands on the right row.
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightTone, setHighlightTone] = useState<string | null>(null);
  const jumpToTone = (id: string) => {
    const tone = LIP_TONES.find((t) => t.id === id);
    if (!tone) return;
    setPreviewTone(tone);
    setHighlightTone(id);
    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => setHighlightTone((cur) => (cur === id ? null : cur)), 1800);
  };
  const { data: swatches } = useShadeSwatches();

  const fetchAllSettings = async () => {
    const { data, error } = await (supabase.from as any)("lipstick_shade_settings")
      .select("*")
      .eq("skin_tone", DEFAULT_SKIN_TONE);
    if (error) return;
    const map: Record<string, Setting> = {};
    for (const r of (data ?? []) as any[]) {
      map[`${r.variant_name}|${r.lip_tone}`] = {
        ...r,
        opacity: Number(r.opacity),
        gloss: Number(r.gloss ?? 0),
        shine_intensity: Number(r.shine_intensity ?? 0),
        shine_scale: Number(r.shine_scale ?? SHINE_DEFAULT_SCALE),
        finish: resolveBanubaFinish(r.finish),
      };
    }
    setAllSettings(map);
  };
  useEffect(() => {
    void fetchAllSettings();
  }, []);

  // A gallery click switches shade first; once that shade's rows are loaded,
  // jump to the model's card.
  useEffect(() => {
    if (!loading && pendingJump.current) {
      const id = pendingJump.current;
      pendingJump.current = null;
      jumpToTone(id);
    }
  }, [loading, selectedShade]);

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
            shine_intensity: Number(existing.shine_intensity ?? 0),
            shine_scale: Number(existing.shine_scale ?? SHINE_DEFAULT_SCALE),
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
            shine_intensity: 0,
            shine_scale: SHINE_DEFAULT_SCALE,
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
      shine_intensity: r.shine_intensity,
      shine_scale: r.shine_scale,
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
      setAllSettings((prev) => ({ ...prev, [`${r.variant_name}|${r.lip_tone}`]: r }));
    }
    setSavingRow(null);
  };


  const currentShade = useMemo(() => SHADES.find((s) => s.name === selectedShade), [selectedShade]);

  // Settings to render a given shade on a given lip tone: live edits for the
  // selected shade, saved values for the rest, catalog defaults otherwise.
  const settingFor = (variant: string, lipTone: string): Setting => {
    if (variant === selectedShade && rows[lipTone]) return rows[lipTone];
    const saved = allSettings[`${variant}|${lipTone}`];
    if (saved) return saved;
    return {
      variant_name: variant,
      skin_tone: DEFAULT_SKIN_TONE,
      lip_tone: lipTone,
      hex: PRODUCT_DETAILS[variant]?.color ?? "#b91c1c",
      finish: "satin",
      opacity: 0.8,
      gloss: 0,
      shine_intensity: 0,
      shine_scale: SHINE_DEFAULT_SCALE,
    };
  };
  const galleryToneIdx = LIP_TONES.findIndex((t) => t.id === galleryTone);
  const galleryToneImage = avatarFor(galleryTone, Math.max(0, galleryToneIdx));

  return (
    <div className="space-y-5">
      <div className="border border-border rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">One model, every shade</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Pick a model to see all {SHADES.length} shades on them with their saved settings. Click a shade that looks off to open its settings for this model below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {LIP_TONES.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setGalleryTone(t.id)}
              aria-pressed={galleryTone === t.id}
              title={t.label}
              className={`flex flex-col items-center gap-1 rounded-md p-1 border transition-colors ${galleryTone === t.id ? "border-foreground" : "border-transparent hover:border-border"}`}
            >
              <img src={avatarFor(t.id, i)} alt="" className="w-14 h-[70px] object-cover rounded-sm" />
              <span className="text-[9px] uppercase tracking-normal text-muted-foreground max-w-[64px] truncate">{t.label}</span>
            </button>
          ))}
        </div>
        <ShadeRenderGallery
          layout="grid"
          title={`${LIP_TONES[galleryToneIdx]?.label ?? ""} in every shade`}
          hint="Click a shade to load it and jump to this model's settings. Renders use the same pipeline as the quiz results."
          onSelect={(shade) => {
            pendingJump.current = galleryTone;
            if (shade === selectedShade) {
              pendingJump.current = null;
              jumpToTone(galleryTone);
            } else {
              setSelectedShade(shade);
            }
          }}
          items={SHADES.map((s): GalleryItem => {
            const st = settingFor(s.name, galleryTone);
            return {
              id: s.name,
              label: s.name,
              image: galleryToneImage,
              spec: {
                key: `${s.name}|${galleryTone}`,
                hex: st.hex,
                finish: st.finish,
                opacity: st.opacity,
                gloss: st.gloss,
                shineIntensity: st.shine_intensity,
                shineScale: st.shine_scale,
              },
            };
          })}
        />
      </div>

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
                      style={{ backgroundColor: swatchColor(s.name, swatches) }}
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



      {selectedShade && VARIANT_MAP[selectedShade] && (
        <SwatchColorPicker
          variantName={selectedShade}
          variantId={VARIANT_MAP[selectedShade]}
          savedHex={swatches?.[selectedShade]}
        />
      )}

      <div className="border border-border rounded-2xl p-5 space-y-4">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
          Banuba render settings per complexion type
        </p>

        {!loading && (
          <ShadeRenderGallery
            onSelect={jumpToTone}
            items={LIP_TONES.flatMap((t, tIdx): GalleryItem[] => {
              const row = rows[t.id];
              if (!row) return [];
              return [{
                id: t.id,
                label: t.label,
                image: avatarFor(t.id, tIdx),
                spec: {
                  key: t.id,
                  hex: row.hex,
                  finish: row.finish,
                  opacity: row.opacity,
                  gloss: row.gloss,
                  shineIntensity: row.shine_intensity,
                  shineScale: row.shine_scale,
                },
              }];
            })}
          />
        )}

        {loading ? (
          <p className="text-muted-foreground text-xs text-center py-8">Loading…</p>
        ) : (
          <div className="space-y-3">
            {LIP_TONES.map((t, tIdx) => {
              const row = rows[t.id];
              if (!row) return null;
              const avatarImg = avatarFor(t.id, tIdx);
              const isOpen = previewTone?.id === t.id;
              return (
                <div
                  key={t.id}
                  ref={(el) => { cardRefs.current[t.id] = el; }}
                  className={`border rounded-xl p-3 sm:p-4 space-y-3 scroll-mt-4 transition-shadow ${highlightTone === t.id ? "border-foreground ring-2 ring-foreground/40" : "border-border"}`}>
                  {/* Header: avatar, tone name, actions. Wraps on narrow screens. */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 sm:w-24 sm:h-24 shrink-0 rounded-lg overflow-hidden border border-border bg-muted">
                      <img src={avatarImg} alt={t.label} className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium truncate">{t.label}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{t.id}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        onClick={() => handleSaveRow(t.id)}
                        disabled={savingRow === t.id}
                        className="rounded-full bg-foreground text-background hover:bg-foreground/85 text-[9px] px-3 h-7"
                      >
                        {savingRow === t.id ? "Saving…" : "Save"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setPreviewTone((cur) => (cur?.id === t.id ? null : t))}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-border hover:bg-muted transition-colors"
                        aria-label={`Preview ${t.label} with Banuba`}
                        title={isOpen ? "Close preview" : "Preview with Banuba"}
                      >
                        {isOpen ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Controls: one column on phones, two on tablets, three on wide screens. */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3 text-[10px]">
                    <Field label="Hex">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={row.hex}
                          onChange={(e) => updateRow(t.id, { hex: e.target.value })}
                          className="h-7 w-10 shrink-0 rounded border border-border cursor-pointer bg-transparent"
                        />
                        <Input
                          value={row.hex}
                          onChange={(e) => updateRow(t.id, { hex: e.target.value })}
                          className="h-7 w-full text-[10px] rounded-md"
                        />
                      </div>
                    </Field>
                    <Field label="Finish">
                      <Select
                        value={row.finish}
                        onValueChange={(v) => updateRow(t.id, { finish: v as Finish })}
                      >
                        <SelectTrigger className="h-7 w-full text-[10px] rounded-md border-foreground/20">
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
                    </Field>
                    <SliderField
                      label="Opacity"
                      value={row.opacity}
                      onChange={(v) => updateRow(t.id, { opacity: v })}
                    />
                    {/* Banuba makeup_lipsgloss alpha: a specular highlight
                        layered over the lipstick. 0 omits the layer. */}
                    <SliderField
                      label="Gloss"
                      value={row.gloss}
                      onChange={(v) => updateRow(t.id, { gloss: v })}
                    />
                    {/* Banuba makeup_lipsshine: wet-look overlay. 0 omits the layer. */}
                    <SliderField
                      label="Shine intensity"
                      value={row.shine_intensity}
                      onChange={(v) => updateRow(t.id, { shine_intensity: v })}
                    />
                    <SliderField
                      label="Shine scale"
                      value={row.shine_scale}
                      max={SHINE_SCALE_MAX}
                      disabled={row.shine_intensity <= 0}
                      onChange={(v) => updateRow(t.id, { shine_scale: v })}
                    />
                  </div>

                  {isOpen && (
                    <div className="rounded-lg bg-muted/30 p-3">
                      <ErrorBoundary>
                        <BanubaInlinePreview
                          lipToneLabel={t.label}
                          lipToneImage={avatarImg}
                          hex={row.hex}
                          finish={row.finish}
                          opacity={row.opacity}
                          gloss={row.gloss}
                          shine={shineFrom(row.shine_intensity, row.shine_scale)}
                        />
                      </ErrorBoundary>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShadesTab;
