import { useMemo, useState } from "react";
import { Check, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCT_DETAILS, VARIANT_MAP, Recommendation } from "@/data/lipstickRecommendations";
import { shareLook, downloadLook } from "@/lib/shareLook";
import teakLogo from "@/assets/teak-logo.png";
import { useShadeSettings, ShadeSetting } from "@/hooks/useShadeSettings";
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
  recommendations: Recommendation[];
  complexionType: number | null;
}

const ALL_VARIANT_NAMES = Object.keys(VARIANT_MAP);
const ALL_VARIANT_IDS = ALL_VARIANT_NAMES.map((n) => VARIANT_MAP[n]);

function extractFormula(label: string): string {
  const idx = label.toLowerCase().lastIndexOf(" in ");
  return idx > 0 ? label.slice(0, idx) : label;
}

interface Shade {
  name: string;
  variantId: string;
  color: string;
  label: string;
  formula: string;
  setting: ShadeSetting;
}

// The unified try-on card: one photo, one swatch strip with the founders'
// picks pinned first, arrows that tour the picks, and contextual category
// copy for whichever shade is on the lips.
const TryOnOtherShades = ({
  userFace,
  skinTone,
  lipTone,
  sessionId,
  trackEvent,
  embedded,
  cartStates,
  addToCart,
  recommendations,
  complexionType,
}: Props) => {
  const { data: settings } = useShadeSettings(ALL_VARIANT_NAMES, skinTone, lipTone);
  const variantImages = useVariantImages(ALL_VARIANT_IDS);

  const shadesByName = useMemo(() => {
    const map: Record<string, Shade> = {};
    if (!settings) return map;
    for (const name of ALL_VARIANT_NAMES) {
      const details = PRODUCT_DETAILS[name];
      map[name] = {
        name,
        variantId: VARIANT_MAP[name],
        color: details?.color ?? "#000",
        label: details?.label ?? name,
        formula: extractFormula(details?.label ?? name),
        // Founder-tuned setting for this complexion when one exists,
        // otherwise a generic preview built from the product color.
        setting: settings[name] ?? {
          variant_name: name,
          skin_tone: skinTone,
          lip_tone: lipTone,
          hex: details?.color ?? "#000000",
          finish: "satin",
          opacity: 0.8,
        },
      };
    }
    return map;
  }, [settings, skinTone, lipTone]);

  const pickNames = useMemo(() => {
    const seen = new Set<string>();
    return recommendations
      .map((r) => r.variantName)
      .filter((n) => VARIANT_MAP[n] && !seen.has(n) && (seen.add(n) || true));
  }, [recommendations]);
  const restNames = useMemo(
    () => ALL_VARIANT_NAMES.filter((n) => !pickNames.includes(n)),
    [pickNames],
  );

  const [selectedName, setSelectedName] = useState<string | null>(null);
  const activeName = selectedName ?? pickNames[0] ?? ALL_VARIANT_NAMES[0] ?? null;
  const active = activeName ? shadesByName[activeName] : undefined;
  const activeImg = active ? variantImages[active.variantId] : null;

  const selectShade = (name: string) => {
    setSelectedName(name);
    trackEvent("shade_selected", { variant_name: name, is_pick: pickNames.includes(name) });
  };

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

  if (!settings || !active) return null;

  const swatch = (name: string) => {
    const shade = shadesByName[name];
    if (!shade) return null;
    const isActive = name === activeName;
    return (
      <button
        key={name}
        type="button"
        onClick={() => selectShade(name)}
        title={`${shade.name} — ${shade.formula}`}
        aria-label={`Try ${shade.name}`}
        className="flex flex-col items-center gap-[3px] group"
      >
        <span
          className={`w-6 h-6 rounded-full border-2 transition-all ${
            isActive
              ? "border-foreground scale-110"
              : "border-transparent group-hover:border-muted-foreground"
          }`}
          style={{ backgroundColor: shade.color }}
        />
        <span className="font-sans font-medium text-[10px] uppercase tracking-normal text-muted-foreground">
          {shade.name}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-2.5 bg-background border border-foreground p-4">
      <span className="mt-1 mb-2.5 font-display text-[28px] leading-[29px] text-foreground text-center">
        You are{" "}
        {complexionType !== null ? (
          <span className="text-green-700">Complexion {complexionType}</span>
        ) : (
          "Unique"
        )}
      </span>

      <div className="w-full flex flex-col gap-4 px-1">
        {pickNames.length > 0 && (
          <div className="border-t border-foreground/20 pt-3.5">
            <p className="font-display text-[18px] leading-[18px] tracking-normal text-foreground text-center mb-2.5">
              Top Recs for Your Complexion
            </p>
            <div className="flex flex-wrap items-start justify-center gap-x-2.5 gap-y-2">
              {pickNames.map((name) => swatch(name))}
            </div>
          </div>
        )}
        <div className="border-t border-foreground/20 pt-3.5">
          <div className="flex flex-wrap items-start justify-center gap-x-2.5 gap-y-2">
            {restNames.map((name) => swatch(name))}
          </div>
        </div>
      </div>

      <div className="w-full aspect-[3/4] rounded-md overflow-hidden bg-muted relative mx-auto max-w-sm">
        <img
          src={activeSnapshot ?? userFace}
          alt={`${active.label} on your photo`}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex flex-col items-center gap-1">
        <div className="w-full flex flex-wrap gap-2">
          {embedded && (
            <Button
              size="sm"
              className={`h-7 flex-1 font-sans font-medium text-[9px] uppercase tracking-normal rounded-full transition-all duration-300 ${
                cartStates[active.variantId] === "added"
                  ? "bg-green-700 text-white hover:bg-green-700 border border-green-700"
                  : cartStates[active.variantId] === "error"
                  ? "bg-red-700 text-white hover:bg-red-700 border border-red-700"
                  : "bg-foreground text-background border border-foreground hover:bg-background hover:text-foreground"
              }`}
              disabled={cartStates[active.variantId] === "adding" || cartStates[active.variantId] === "added"}
              onClick={() => addToCart(active.variantId, active.name, "unified_try_on")}
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
            className="h-7 flex-1 min-w-0 px-2.5 font-sans font-medium text-[9px] uppercase tracking-normal rounded-full bg-background text-foreground border border-foreground hover:bg-foreground hover:text-background"
          >
            <a
              href={productUrl}
              // Same-window navigation: embedded, escape the iframe and take
              // the whole store page to the product (Back restores the quiz
              // via the browser's back/forward cache); standalone, navigate in
              // place. No new windows — disorienting on mobile.
              target={embedded ? "_top" : undefined}
              className="truncate"
              onClick={() => trackEvent("product_clicked", { variant_id: active.variantId, variant_name: active.name, source: "unified_try_on", product_handle: activeImg?.productHandle })}
            >
              View Product
            </a>
          </Button>
          <Button
            size="sm"
            aria-label={`Share ${active.label}`}
            className="h-7 px-2 bg-transparent hover:bg-transparent text-foreground hover:text-muted-foreground border-0"
            onClick={() => {
              trackEvent("share_clicked", { variant_id: active.variantId, variant_name: active.name, source: "unified_try_on" });
              void shareLook({
                text: `What do you think of ${active.label} on me?`,
                url: productUrl,
                imageUrl: activeSnapshot,
                brand: { logoUrl: teakLogo, shadeName: active.name, productTitle: activeImg?.productTitle ?? active.formula },
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
              trackEvent("download_clicked", { variant_id: active.variantId, variant_name: active.name, source: "unified_try_on" });
              void downloadLook({
                imageUrl: activeSnapshot,
                filename: `teak-${active.name.toLowerCase()}.jpg`,
                brand: { logoUrl: teakLogo, shadeName: active.name, productTitle: activeImg?.productTitle ?? active.formula },
              });
            }}
          >
            <Download className="w-2.5 h-2.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TryOnOtherShades;
