import { useMemo, useState } from "react";
import { Check, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCT_DETAILS, VARIANT_MAP } from "@/data/lipstickRecommendations";
import { shareLook, downloadLook } from "@/lib/shareLook";
import teakLogo from "@/assets/teak-logo.png";
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
  embedded: boolean;
  cartStates: Record<string, "adding" | "added" | "error">;
  addToCart: (variantId: string, variantName: string, source: string) => void;
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
  embedded,
  cartStates,
  addToCart,
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
      <label className="font-display text-[18px] leading-[18px] text-foreground text-center">
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
            className="font-display text-[12px] leading-[13px] text-foreground text-center hover:underline"
            onClick={() => trackEvent("product_clicked", { variant_id: active.variantId, variant_name: active.name, source: "try_on_other_shades", product_handle: activeImg?.productHandle })}
          >
            {active.name}
          </a>
          <span className="font-display text-[12px] leading-[13px] text-foreground text-center">
            {active.formula}
            {activeImg?.price && ` · $${parseFloat(activeImg.price).toFixed(2)}`}
          </span>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {embedded && (
              <Button
                size="sm"
                className={`font-sans font-medium text-[9px] uppercase tracking-normal h-7 rounded-full px-5 transition-all duration-300 ${
                  cartStates[active.variantId] === "added"
                    ? "bg-green-700 text-white hover:bg-green-700 border border-green-700"
                    : cartStates[active.variantId] === "error"
                    ? "bg-red-700 text-white hover:bg-red-700 border border-red-700"
                    : "bg-foreground text-background border border-foreground hover:bg-background hover:text-foreground"
                }`}
                disabled={cartStates[active.variantId] === "adding" || cartStates[active.variantId] === "added"}
                onClick={() => addToCart(active.variantId, active.name, "try_on_other_shades")}
              >
                {cartStates[active.variantId] === "adding" ? (
                  <><span className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> Adding…</>
                ) : cartStates[active.variantId] === "added" ? (
                  <><Check className="w-2.5 h-2.5" /> Added</>
                ) : cartStates[active.variantId] === "error" ? (
                  <>Failed</>
                ) : (
                  <>Add to Cart</>
                )}
              </Button>
            )}
            <Button
              asChild
              size="sm"
              className="font-sans font-medium text-[9px] uppercase tracking-normal h-7 rounded-full px-5 bg-background text-foreground border border-foreground hover:bg-foreground hover:text-background"
            >
              <a
                href={productUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("product_clicked", { variant_id: active.variantId, variant_name: active.name, source: "try_on_other_shades_store_button", product_handle: activeImg?.productHandle })}
              >
                View
              </a>
            </Button>
            <Button
              size="sm"
              aria-label={`Share ${active.label}`}
              className="h-7 px-2 bg-transparent hover:bg-transparent text-foreground hover:text-muted-foreground border-0"
              onClick={() => {
                trackEvent("share_clicked", { variant_id: active.variantId, variant_name: active.name, source: "try_on_other_shades" });
                void shareLook({
                  text: `What do you think of ${active.label} on me?`,
                  url: productUrl,
                  imageUrl: activeSnapshot,
                  brand: { logoUrl: teakLogo, shadeName: active.name, productTitle: active.formula },
                });
              }}
            >
              <Share2 className="w-2.5 h-2.5" />
            </Button>
            <Button
              size="sm"
              aria-label={`Download ${active.label} on your photo`}
              className="h-7 px-2 bg-transparent hover:bg-transparent text-foreground hover:text-muted-foreground border-0"
              disabled={!activeSnapshot}
              onClick={() => {
                if (!activeSnapshot) return;
                trackEvent("download_clicked", { variant_id: active.variantId, variant_name: active.name, source: "try_on_other_shades" });
                void downloadLook({
                  imageUrl: activeSnapshot,
                  filename: `teak-${active.name.toLowerCase()}.jpg`,
                  brand: { logoUrl: teakLogo, shadeName: active.name, productTitle: active.formula },
                });
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
              <span className="font-sans font-medium text-[9px] uppercase tracking-normal text-muted-foreground">
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
