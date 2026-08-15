import { useMemo, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCT_DETAILS, VARIANT_MAP } from "@/data/lipstickRecommendations";
import { shareLook, downloadLook } from "@/lib/shareLook";
import { useShadeSettings } from "@/hooks/useShadeSettings";
import { useVariantImages } from "@/hooks/useVariantImages";
import { useBanubaSnapshots } from "@/hooks/useBanubaSnapshots";
import type { ShadeSnapshotSpec } from "@/lib/banubaSnapshots";

interface Props {
  userFace: string;
  skinTone: string;
  lipTone: string;
  sessionId: string;
  trackEvent: (event: string, props?: Record<string, unknown>) => void;
}

const ALL_VARIANT_NAMES = Object.keys(VARIANT_MAP);
const ALL_VARIANT_IDS = ALL_VARIANT_NAMES.map((n) => VARIANT_MAP[n]);

function extractFormula(label: string): string {
  const idx = label.toLowerCase().lastIndexOf(" in ");
  return idx > 0 ? label.slice(0, idx) : label;
}

const TryOnOtherShades = ({
  userFace,
  skinTone,
  lipTone,
  sessionId,
  trackEvent,
}: Props) => {
  const { data: settings } = useShadeSettings(ALL_VARIANT_NAMES, skinTone, lipTone);
  const variantImages = useVariantImages(ALL_VARIANT_IDS);

  const availableShades = useMemo(() => {
    if (!settings) return [];
    return ALL_VARIANT_NAMES
      .filter((name) => settings[name])
      .map((name) => {
        const details = PRODUCT_DETAILS[name];
        return {
          name,
          variantId: VARIANT_MAP[name],
          color: details?.color ?? "#000",
          label: details?.label ?? name,
          formula: extractFormula(details?.label ?? name),
          setting: settings[name],
        };
      });
  }, [settings]);

  const [selected, setSelected] = useState<string | null>(null);
  const activeName = selected ?? availableShades[0]?.name ?? null;
  const active = availableShades.find((s) => s.name === activeName);
  const activeImg = active ? variantImages[active.variantId] : null;

  const activeSpecs = useMemo<ShadeSnapshotSpec[]>(
    () =>
      active
        ? [{ key: active.name, hex: active.setting.hex, finish: active.setting.finish, opacity: active.setting.opacity }]
        : [],
    [active],
  );
  const snapshots = useBanubaSnapshots(userFace, activeSpecs);
  const activeSnapshot = active ? snapshots[active.name] : undefined;
  const productUrl = active && activeImg?.productHandle
    ? `https://nupoora-784.myshopify.com/products/${activeImg.productHandle}?variant=${active.variantId}&quiz_session_id=${encodeURIComponent(sessionId)}`
    : "#";

  if (availableShades.length === 0) return null;

  return (
    <div className="w-full max-w-lg flex flex-col gap-4 mt-8 bg-card px-4 py-8 sm:px-6">
      <label className="font-display text-lg text-foreground text-center">
        Try On Other Shades
      </label>

      <div className="w-full aspect-[3/4] rounded-md overflow-hidden bg-muted relative mx-auto max-w-sm">
        <img
          src={active ? activeSnapshot ?? userFace : userFace}
          alt={active ? `${active.label} on your photo` : "Your photo"}
          className="w-full h-full object-cover"
        />
      </div>

      {active && (
        <div className="flex flex-col items-center gap-1">
          <a
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display text-base text-foreground text-center hover:underline"
            onClick={() => trackEvent("product_clicked", { variant_id: active.variantId, variant_name: active.name, source: "try_on_other_shades", product_handle: activeImg?.productHandle })}
          >
            {active.name}
          </a>
          <span className="font-sans text-[10px] text-muted-foreground text-center uppercase tracking-wider">
            {active.formula}
          </span>
          {activeImg?.price && (
            <span className="font-sans text-[10px] text-foreground">${parseFloat(activeImg.price).toFixed(2)}</span>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button
              asChild
              size="sm"
              className="font-sans font-medium text-[9px] uppercase tracking-normal rounded-none px-5 bg-background text-foreground border border-foreground hover:bg-foreground hover:text-background"
            >
              <a
                href={productUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("product_clicked", { variant_id: active.variantId, variant_name: active.name, source: "try_on_other_shades_store_button", product_handle: activeImg?.productHandle })}
              >
                Shop Now
              </a>
            </Button>
            <Button
              size="sm"
              className="gap-1.5 font-sans font-medium text-[9px] uppercase tracking-normal rounded-none px-5 bg-background text-foreground border border-foreground hover:bg-foreground hover:text-background"
              onClick={() => {
                trackEvent("share_clicked", { variant_id: active.variantId, variant_name: active.name, source: "try_on_other_shades" });
                void shareLook({
                  text: `What do you think of ${active.label} on me?`,
                  url: productUrl,
                  imageUrl: activeSnapshot,
                });
              }}
            >
              <Share2 className="w-2.5 h-2.5" /> Get A Friend's Opinion
            </Button>
            <Button
              size="sm"
              aria-label={`Download ${active.label} on your photo`}
              className="px-2 rounded-none bg-background text-foreground border border-foreground hover:bg-foreground hover:text-background"
              disabled={!activeSnapshot}
              onClick={() => {
                if (!activeSnapshot) return;
                trackEvent("download_clicked", { variant_id: active.variantId, variant_name: active.name, source: "try_on_other_shades" });
                void downloadLook(activeSnapshot, `teak-${active.name.toLowerCase()}.jpg`);
              }}
            >
              <Download className="w-2.5 h-2.5" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3 px-2">
        {availableShades.map((shade) => {
          const isActive = shade.name === activeName;
          return (
            <button
              key={shade.name}
              type="button"
              onClick={() => setSelected(shade.name)}
              title={`${shade.name} — ${shade.formula}`}
              aria-label={`Try ${shade.name}`}
              className="flex flex-col items-center gap-1 group"
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
