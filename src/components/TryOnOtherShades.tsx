import { useMemo, useState } from "react";
import { PRODUCT_DETAILS, VARIANT_MAP } from "@/data/lipstickRecommendations";
import { useShadeSettings } from "@/hooks/useShadeSettings";
import BanubaProductPreview from "@/components/BanubaProductPreview";

interface Props {
  userFace: string;
  skinTone: string;
  lipTone: string;
}

const ALL_VARIANT_NAMES = Object.keys(VARIANT_MAP);

const TryOnOtherShades = ({ userFace, skinTone, lipTone }: Props) => {
  const { data: settings } = useShadeSettings(ALL_VARIANT_NAMES, skinTone, lipTone);

  const availableShades = useMemo(() => {
    if (!settings) return [];
    return ALL_VARIANT_NAMES
      .filter((name) => settings[name])
      .map((name) => ({
        name,
        color: PRODUCT_DETAILS[name]?.color ?? "#000",
        label: PRODUCT_DETAILS[name]?.label ?? name,
        setting: settings[name],
      }));
  }, [settings]);

  const [selected, setSelected] = useState<string | null>(null);
  const activeName = selected ?? availableShades[0]?.name ?? null;
  const active = availableShades.find((s) => s.name === activeName);

  if (availableShades.length === 0) return null;

  return (
    <div className="w-full max-w-lg flex flex-col gap-4 mt-8">
      <label className="font-display text-lg text-foreground text-center">
        Try On Other Shades
      </label>

      <div className="w-full aspect-[3/4] rounded-md overflow-hidden bg-muted relative mx-auto max-w-sm">
        {active ? (
          <BanubaProductPreview
            key={active.name}
            imageUrl={userFace}
            hex={active.setting.hex}
            finish={active.setting.finish}
            opacity={active.setting.opacity}
            alt={`${active.label} on your photo`}
          />
        ) : (
          <img src={userFace} alt="Your photo" className="w-full h-full object-cover" />
        )}
      </div>

      {active && (
        <p className="font-display text-sm text-foreground text-center">
          {active.name}
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-3 px-2">
        {availableShades.map((shade) => {
          const isActive = shade.name === activeName;
          return (
            <button
              key={shade.name}
              type="button"
              onClick={() => setSelected(shade.name)}
              title={shade.name}
              aria-label={`Try ${shade.name}`}
              className={`flex flex-col items-center gap-1 group`}
            >
              <span
                className={`w-9 h-9 rounded-full border-2 transition-all ${
                  isActive
                    ? "border-foreground scale-110"
                    : "border-transparent group-hover:border-muted-foreground"
                }`}
                style={{ backgroundColor: shade.color }}
              />
              <span className="font-sans text-[9px] uppercase tracking-wider text-muted-foreground">
                {shade.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TryOnOtherShades;
