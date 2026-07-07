import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCT_DETAILS, VARIANT_MAP } from "@/data/lipstickRecommendations";
import { useShadeSettings } from "@/hooks/useShadeSettings";
import { useVariantImages } from "@/hooks/useVariantImages";
import BanubaProductPreview from "@/components/BanubaProductPreview";

interface Props {
  userFace: string;
  skinTone: string;
  lipTone: string;
  sessionId: string;
  cartStates: Record<string, "adding" | "added" | "error">;
  setCartStates: React.Dispatch<React.SetStateAction<Record<string, "adding" | "added" | "error">>>;
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
  cartStates,
  setCartStates,
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
  const productUrl = active && activeImg?.productHandle
    ? `https://nupoora-784.myshopify.com/products/${activeImg.productHandle}?variant=${active.variantId}&quiz_session_id=${encodeURIComponent(sessionId)}`
    : "#";

  const handleAddToCart = async () => {
    if (!active) return;
    const variantId = active.variantId;
    setCartStates((prev) => ({ ...prev, [variantId]: "adding" }));
    trackEvent("add_to_cart", { variant_id: variantId, variant_name: active.name, source: "try_on_other_shades" });
    try {
      const cartPromise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);
        const handler = (event: MessageEvent) => {
          if (event.data?.type === "cart-add-response") {
            clearTimeout(timeout);
            window.removeEventListener("message", handler);
            resolve(!!event.data.success);
          }
        };
        window.addEventListener("message", handler);
      });
      window.top?.postMessage({
        type: "cart-add",
        variantId: parseInt(variantId),
        quantity: 1,
        quizSessionId: sessionId,
      }, "*");
      const success = await cartPromise;
      if (!success) {
        trackEvent("add_to_cart_failed", { variant_id: variantId, variant_name: active.name, source: "try_on_other_shades", reason: "no_response_or_error" });
      }
      setCartStates((prev) => ({ ...prev, [variantId]: success ? "added" : "error" }));
    } catch {
      trackEvent("add_to_cart_failed", { variant_id: variantId, variant_name: active.name, source: "try_on_other_shades", reason: "exception" });
      setCartStates((prev) => ({ ...prev, [variantId]: "error" }));
    }
  };

  if (availableShades.length === 0) return null;

  const cartState = active ? cartStates[active.variantId] : undefined;

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
          <Button
            size="sm"
            className={`mt-2 font-sans text-[8px] uppercase tracking-wider transition-all duration-300 rounded-full px-6 ${
              cartState === "added"
                ? "bg-green-700 text-white hover:bg-green-700 border border-green-700"
                : cartState === "error"
                ? "bg-red-700 text-white hover:bg-red-700 border border-red-700"
                : "bg-background text-foreground border-2 border-foreground hover:bg-foreground hover:text-background"
            }`}
            disabled={cartState === "adding" || cartState === "added"}
            onClick={handleAddToCart}
          >
            {cartState === "adding" ? (
              <><span className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> Adding…</>
            ) : cartState === "added" ? (
              <><Check className="w-2.5 h-2.5" /> Added</>
            ) : cartState === "error" ? (
              <>Failed</>
            ) : (
              <>Add to Cart</>
            )}
          </Button>
          <a
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground underline mt-1"
            onClick={() => trackEvent("product_clicked", { variant_id: active.variantId, variant_name: active.name, source: "try_on_other_shades_link", product_handle: activeImg?.productHandle })}
          >
            View product page
          </a>
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
