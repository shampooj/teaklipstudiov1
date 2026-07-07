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
import lipBeige from "@/assets/lip-beige.webp";
import lipBrightPink from "@/assets/lip-bright-pink.webp";
import lipMediumBrownAsset from "@/assets/lip-two-toned-deep-brown.png.asset.json";
const lipMediumBrown = lipMediumBrownAsset.url;
import lipDeepBrown from "@/assets/lip-deep-brown.webp";
import lipTwoTonedPurple from "@/assets/lip-two-toned-purple.webp";
import lipNeutralBrownAsset from "@/assets/lip-brick-v2.png.asset.json";
const lipNeutralBrown = lipNeutralBrownAsset.url;
import lipTwoTonedGrey from "@/assets/lip-two-toned-grey.webp";
import lipMauvePink from "@/assets/lip-mauve-pink.webp";
import lipTwoTonedBrownAsset from "@/assets/lip-two-toned-brown.png.asset.json";
const lipTwoTonedBrown = lipTwoTonedBrownAsset.url;
import lipTwoTonedBeigeAsset from "@/assets/lip-two-toned-beige.png.asset.json";
const lipTwoTonedBeige = lipTwoTonedBeigeAsset.url;
import lipBrownPink from "@/assets/lip-brown-pink.webp";
import lipGreyBrownAsset from "@/assets/lip-mostly-purple.png.asset.json";
const lipGreyBrown = lipGreyBrownAsset.url;
import skinLightBrown from "@/assets/skin-light-brown.jpg";
import avatar3Asset from "@/assets/avatar-3.jpg.asset.json";
import avatar4Asset from "@/assets/avatar-4.jpg.asset.json";
import avatar5Asset from "@/assets/avatar-5.jpg.asset.json";
import avatar6Asset from "@/assets/avatar-6.jpg.asset.json";
import avatarSkinLightAsset from "@/assets/avatar-skin-light-brown.jpg.asset.json";
import avatarSkinMediumAsset from "@/assets/avatar-skin-medium-brown.jpg.asset.json";
import avatarNupooraAsset from "@/assets/avatar-nupoora.jpg.asset.json";

const AVATAR_IMAGES = [
  avatar3Asset.url,
  avatar4Asset.url,
  avatar5Asset.url,
  avatar6Asset.url,
  avatarSkinLightAsset.url,
  avatarSkinMediumAsset.url,
  avatarNupooraAsset.url,
];
const avatarFor = (id: string, idx: number) => AVATAR_IMAGES[idx % AVATAR_IMAGES.length];

const LIP_TONES = [
  { id: "bright-pink", label: "Bright Pink", image: lipBrightPink },
  { id: "beige", label: "Beige", image: lipBeige },
  { id: "mauve-pink", label: "Mauve", image: lipMauvePink },
  { id: "neutral-brown", label: "Chestnut", image: lipNeutralBrown },
  { id: "two-toned-grey", label: "Two-Toned Grey", image: lipTwoTonedGrey },
  { id: "two-toned-purple", label: "Two-Toned Purple", image: lipTwoTonedPurple },
  { id: "two-toned-brown", label: "Two-Toned Brown", image: lipTwoTonedBrown },
  { id: "medium-brown", label: "Two-toned Deep Brown", image: lipMediumBrown },
  { id: "deep-brown", label: "Mostly Brown", image: lipDeepBrown },
] as const;

const FINISHES = ["matte", "satin", "glossy"] as const;
type Finish = (typeof FINISHES)[number];

const SKIN_TONES = [
  { id: "light-brown", label: "Light Brown" },
  { id: "medium-brown", label: "Medium Brown" },
  { id: "deep-brown", label: "Deep Brown" },
  { id: "rich-brown", label: "Rich Brown" },
] as const;

interface Setting {
  variant_name: string;
  skin_tone: string;
  lip_tone: string;
  hex: string;
  finish: Finish;
  opacity: number;
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
  const [saving, setSaving] = useState(false);
  const [previewTone, setPreviewTone] = useState<(typeof LIP_TONES)[number] | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from as any)("lipstick_shade_settings")
      .select("variant_name, skin_tone, lip_tone, hex, finish, opacity")
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
        ? { ...existing, opacity: Number(existing.opacity) }
        : {
            variant_name: selectedShade,
            skin_tone: DEFAULT_SKIN_TONE,
            lip_tone: t.id,
            hex: defaultColor,
            finish: "satin",
            opacity: 0.8,
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

  const handleSaveAll = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const payload = Object.values(rows).flatMap((r) =>
      SKIN_TONES.map((st) => ({
        variant_name: r.variant_name,
        skin_tone: st.id,
        lip_tone: r.lip_tone,
        hex: r.hex,
        finish: r.finish,
        opacity: r.opacity,
        updated_at: now,
      })),
    );
    const { error } = await (supabase.from as any)("lipstick_shade_settings")
      .upsert(payload, { onConflict: "variant_name,skin_tone,lip_tone" });
    if (error) {
      toast.error("Failed to save settings");
      console.error(error);
    } else {
      toast.success("Shade settings saved");
    }
    setSaving(false);
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
        <div className="flex items-center justify-between">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
            Banuba render settings per complexion type
          </p>
          <Button
            className="rounded-full bg-foreground text-background hover:bg-foreground/85 text-[9px] px-4 h-8"
            onClick={handleSaveAll}
            disabled={saving || loading}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>

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
                  <th className="py-2 pr-3 font-normal w-12"></th>
                </tr>
              </thead>
              <tbody>
                {LIP_TONES.map((t, tIdx) => {
                  const row = rows[t.id];
                  if (!row) return null;
                  const avatarImg = avatarFor(t.id, tIdx);
                  const blend =
                    row.finish === "matte"
                      ? "multiply"
                      : row.finish === "glossy"
                      ? "overlay"
                      : "multiply";
                  return (
                    <Fragment key={t.id}>
                    <tr className="border-t border-border">
                      <td className="py-2 pr-3">
                        <div className="relative w-36 h-36 rounded-lg overflow-hidden border border-border bg-muted">
                          <img
                            src={avatarImg}
                            alt={t.label}
                            className="absolute inset-0 w-full h-full object-cover"
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
                          <SelectTrigger className="h-7 w-28 text-[10px] rounded-md border-foreground/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {FINISHES.map((f) => (
                              <SelectItem key={f} value={f} className="text-[10px] capitalize">
                                {f}
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
                        <td colSpan={6} className="py-4 px-3">
                          <ErrorBoundary>
                            <BanubaInlinePreview
                              lipToneLabel={t.label}
                              lipToneImage={avatarImg}
                              hex={row.hex}
                              finish={row.finish}
                              opacity={row.opacity}
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
