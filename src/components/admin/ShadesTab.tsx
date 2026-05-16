import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_DETAILS } from "@/data/lipstickRecommendations";
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

const LIP_TONES = [
  { id: "bright-pink", label: "Bright Pink" },
  { id: "brown-pink", label: "Brown Pink" },
  { id: "mauve-pink", label: "Mauve Pink" },
  { id: "beige", label: "Beige" },
  { id: "two-toned-purple", label: "Two-Toned Purple" },
  { id: "two-toned-brown", label: "Two-Toned Brown" },
  { id: "two-toned-grey", label: "Two-Toned Grey" },
  { id: "two-toned-beige", label: "Two-Toned Beige" },
  { id: "neutral-brown", label: "Neutral Brown" },
  { id: "medium-brown", label: "Medium Brown" },
  { id: "deep-brown", label: "Deep Brown" },
  { id: "grey-brown", label: "Grey Brown" },
] as const;

const FINISHES = ["matte", "satin", "glossy"] as const;
type Finish = (typeof FINISHES)[number];

interface Setting {
  variant_name: string;
  lip_tone: string;
  hex: string;
  finish: Finish;
  opacity: number;
}

// Shades only (exclude lip sets)
const SHADES = Object.entries(PRODUCT_DETAILS)
  .filter(([name]) => !name.startsWith("Lip Set"))
  .map(([name, d]) => ({ name, label: d.label, color: d.color }));

const ShadesTab = () => {
  const [selectedShade, setSelectedShade] = useState<string>(SHADES[0]?.name ?? "");
  const [rows, setRows] = useState<Record<string, Setting>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from as any)("lipstick_shade_settings")
      .select("variant_name, lip_tone, hex, finish, opacity")
      .eq("variant_name", selectedShade);
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
        : { variant_name: selectedShade, lip_tone: t.id, hex: defaultColor, finish: "satin", opacity: 0.8 };
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
    const payload = Object.values(rows).map((r) => ({
      variant_name: r.variant_name,
      lip_tone: r.lip_tone,
      hex: r.hex,
      finish: r.finish,
      opacity: r.opacity,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await (supabase.from as any)("lipstick_shade_settings")
      .upsert(payload, { onConflict: "variant_name,lip_tone" });
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
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Lipstick Shade</p>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedShade} onValueChange={setSelectedShade}>
            <SelectTrigger className="rounded-full border-foreground/20 text-[10px] w-72">
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
            <span className="text-[10px] text-muted-foreground">{currentShade.label}</span>
          )}
        </div>
      </div>

      <div className="border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
            Banuba render settings per lip tone
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
                  <th className="py-2 pr-3 font-normal">Lip Tone</th>
                  <th className="py-2 pr-3 font-normal">Hex</th>
                  <th className="py-2 pr-3 font-normal">Finish</th>
                  <th className="py-2 pr-3 font-normal w-44">Opacity</th>
                </tr>
              </thead>
              <tbody>
                {LIP_TONES.map((t) => {
                  const row = rows[t.id];
                  if (!row) return null;
                  return (
                    <tr key={t.id} className="border-t border-border">
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
                    </tr>
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
