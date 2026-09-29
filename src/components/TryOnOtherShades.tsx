import { useMemo, useState } from "react";
import { Check, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCT_DETAILS, VARIANT_MAP, Recommendation } from "@/data/lipstickRecommendations";
import { shareLook, downloadLook } from "@/lib/shareLook";
import { shopifyImg } from "@/lib/shopifyImg";
import teakLogo from "@/assets/teak-logo.png";
import { useShadeSettings, ShadeSetting } from "@/hooks/useShadeSettings";
import { useShadeSwatches, swatchColor } from "@/hooks/useShadeSwatches";
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
  // Quiz v2: every top rec is rendered up front as its own card, stacked,
  // each with its own buttons; "Other Shades to Try" is hidden.
  stacked?: boolean;
  // Extra classes for the "Top Recs" title, e.g. padding to clear a Back
  // button placed level with it.
  titleClassName?: string;
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

// "$28" for whole amounts, "$28.50" otherwise, in the store's currency.
const formatPrice = (amount: string | null | undefined, currency: string | null | undefined): string | null => {
  const n = Number(amount);
  if (!amount || !Number.isFinite(n)) return null;
  const whole = Number.isInteger(n);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(n);
  } catch {
    return `$${whole ? n : n.toFixed(2)}`;
  }
};

const toSpec = (shade: Shade): ShadeSnapshotSpec => ({
  key: shade.name,
  hex: shade.setting.hex,
  finish: shade.setting.finish,
  opacity: shade.setting.opacity,
  gloss: shade.setting.gloss,
  shineIntensity: shade.setting.shine_intensity,
  shineScale: shade.setting.shine_scale,
});

// The unified try-on card: one photo, one swatch strip with the founders'
// picks pinned first, and contextual category copy for whichever shade is on
// the lips. In stacked mode (quiz v2) each pick gets its own card instead.
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
  stacked: stackedProp = false,
  titleClassName = "",
}: Props) => {
  const { data: settings } = useShadeSettings(ALL_VARIANT_NAMES, skinTone, lipTone);
  const { data: swatches } = useShadeSwatches();
  const variantImages = useVariantImages(ALL_VARIANT_IDS);

  const shadesByName = useMemo(() => {
    const map: Record<string, Shade> = {};
    if (!settings) return map;
    for (const name of ALL_VARIANT_NAMES) {
      const details = PRODUCT_DETAILS[name];
      map[name] = {
        name,
        variantId: VARIANT_MAP[name],
        color: swatchColor(name, swatches),
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
          gloss: 0,
          shine_intensity: 0,
          shine_scale: 1,
        },
      };
    }
    return map;
  }, [settings, swatches, skinTone, lipTone]);

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
  // Category title(s) for each pick, e.g. "A Statement Red". A shade
  // recommended in two categories lists both.
  const categoryByName = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const r of recommendations) {
      const list = (map[r.variantName] ??= []);
      if (!list.includes(r.categoryLabel)) list.push(r.categoryLabel);
    }
    return map;
  }, [recommendations]);

  // Stacked mode needs picks to show; with none it falls back to the single
  // photo and the full swatch list.
  const stacked = stackedProp && pickNames.length > 0;

  const [selectedName, setSelectedName] = useState<string | null>(null);
  const activeName = selectedName ?? pickNames[0] ?? ALL_VARIANT_NAMES[0] ?? null;
  const active = activeName ? shadesByName[activeName] : undefined;

  const selectShade = (name: string) => {
    setSelectedName(name);
    trackEvent("shade_selected", { variant_name: name, is_pick: pickNames.includes(name) });
  };

  // Stacked mode renders every pick up front, in order, through the shared
  // snapshot queue; otherwise only the shade on the lips is rendered.
  const snapshotSpecs = useMemo<ShadeSnapshotSpec[]>(
    () =>
      stacked
        ? pickNames.flatMap((n) => (shadesByName[n] ? [toSpec(shadesByName[n])] : []))
        : active
        ? [toSpec(active)]
        : [],
    [stacked, pickNames, shadesByName, active],
  );
  const snapshots = useBanubaSnapshots(userFace, snapshotSpecs);

  if (!settings || !active) return null;

  const snapshotFor = (shade: Shade) => snapshots[shade.name] ?? undefined;
  const productUrlFor = (shade: Shade) => {
    const handle = variantImages[shade.variantId]?.productHandle;
    return handle
      ? `https://nupoora-784.myshopify.com/products/${handle}?variant=${shade.variantId}&quiz_session_id=${encodeURIComponent(sessionId)}`
      : "#";
  };
  const productTitleFor = (shade: Shade) => variantImages[shade.variantId]?.productTitle ?? shade.formula;
  const source = stacked ? "stacked_cards" : "unified_try_on";

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

  // Photo plus the same branded bar composeBrandedImage draws on the
  // downloaded/shared file, so what's on screen is what gets saved. Every
  // dimension is a % of the image width (cqw), mirroring the canvas
  // proportions in src/lib/shareLook.ts.
  // showBar: false shows the photo alone (stacked mode, where the card names
  // the shade itself); downloaded/shared files still get the branded bar.
  // compareBare (v2): hovering, or pressing and holding on touch screens,
  // fades to the bare photo so the visitor can compare with and without.
  const photoCard = (shade: Shade, className = "w-full max-w-sm", showBar = true, compareBare = false) => (
    <div className={`mx-auto ${className}`} style={{ containerType: "inline-size" }}>
      <div
        className={`w-full aspect-[3/4] overflow-hidden bg-muted relative ${compareBare ? "group select-none [-webkit-touch-callout:none]" : ""}`}
        // An empty touch handler lets iOS Safari apply :active while pressed.
        onTouchStart={compareBare ? () => {} : undefined}
        onContextMenu={compareBare ? (e) => e.preventDefault() : undefined}
      >
        <img
          src={snapshotFor(shade) ?? userFace}
          alt={`${shade.label} on your photo`}
          draggable={compareBare ? false : undefined}
          className="w-full h-full object-cover"
        />
        {compareBare && snapshotFor(shade) && (
          <>
            <img
              src={userFace}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-active:opacity-100"
            />
            <span className="absolute top-1.5 left-1.5 rounded-full bg-background/85 px-2 py-0.5 font-sans font-medium text-[9px] uppercase tracking-normal text-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-active:opacity-100 pointer-events-none">
              No lipstick
            </span>
          </>
        )}
      </div>
      {showBar && (
        <div
          className="w-full bg-white text-black flex items-start justify-between font-display leading-none"
          style={{ height: "19cqw", padding: "4.56cqw 5cqw 0" }}
        >
          <div>
            <img src={teakLogo} alt="TEAK" style={{ height: "5cqw", width: "auto" }} />
            <p style={{ fontSize: "2.8cqw", marginTop: "1.8cqw" }}>Virtual Lip Studio</p>
          </div>
          <div className="text-right">
            <p style={{ fontSize: "4.2cqw" }}>{shade.name}</p>
            <p style={{ fontSize: "2.6cqw", marginTop: "1.6cqw", color: "#595959" }}>
              {productTitleFor(shade)}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // The shade's product photo from the store, linking to its product page,
  // with the buy buttons laid over its bottom edge. When the shade has a smear
  // swatch among its images, the cell splits side by side: main photo left,
  // smear right.
  const productImage = (shade: Shade) => {
    const img = variantImages[shade.variantId];
    const smear = img?.metaImages.find((m) => /smear/i.test(m.url.split("/").pop() ?? ""));
    return (
      <div className="relative w-full aspect-[3/4] overflow-hidden">
        <a
          href={productUrlFor(shade)}
          target={embedded ? "_top" : undefined}
          onClick={() => trackProductClick(shade)}
          aria-label={`View ${shade.label}`}
          className="flex w-full h-full gap-2 bg-background"
        >
          {img?.imageUrl && (
            <img
              src={shopifyImg(img.imageUrl, 480)}
              alt={img.altText ?? shade.label}
              loading="lazy"
              className="h-full flex-1 min-w-0 object-cover bg-muted"
            />
          )}
          {smear && (
            <img
              src={shopifyImg(smear.url, 480)}
              alt={smear.altText ?? `${shade.name} swatch`}
              loading="lazy"
              className="h-full flex-1 min-w-0 object-cover bg-muted"
            />
          )}
        </a>
        <div className="absolute inset-x-2 bottom-2 flex gap-1.5">{buyButtons(shade, true)}</div>
      </div>
    );
  };

  const trackProductClick = (shade: Shade) =>
    trackEvent("product_clicked", { variant_id: shade.variantId, variant_name: shade.name, source, product_handle: variantImages[shade.variantId]?.productHandle });

  // Add to Cart (embedded only) and View Product for one shade.
  // compact: shorter pills with tight padding, so both fit in one row on the
  // v2 product photo.
  const buyButtons = (shade: Shade, compact = false) => {
    const productUrl = productUrlFor(shade);
    const cartState = cartStates[shade.variantId];
    const size = compact ? "h-6 px-2" : "h-7";
    return (
      <>
        {embedded && (
          <Button
            size="sm"
            className={`${size} flex-1 min-w-0 font-sans font-medium text-[9px] uppercase tracking-normal rounded-full transition-all duration-300 ${
              cartState === "added"
                ? "bg-green-700 text-white hover:bg-green-700 border border-green-700"
                : cartState === "error"
                ? "bg-red-700 text-white hover:bg-red-700 border border-red-700"
                : "bg-foreground text-background border border-foreground hover:bg-background hover:text-foreground"
            }`}
            disabled={cartState === "adding" || cartState === "added"}
            onClick={() => addToCart(shade.variantId, shade.name, source)}
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
        )}
        <Button
          asChild
          size="sm"
          className={`${compact ? "h-6 px-2" : "h-7 px-2.5"} flex-1 min-w-0 font-sans font-medium text-[9px] uppercase tracking-normal rounded-full bg-background text-foreground border border-foreground hover:bg-foreground hover:text-background`}
        >
          <a
            href={productUrl}
            // Same-window navigation: embedded, escape the iframe and take
            // the whole store page to the product (Back restores the quiz
            // via the browser's back/forward cache); standalone, navigate in
            // place. No new windows — disorienting on mobile.
            target={embedded ? "_top" : undefined}
            className="truncate"
            onClick={() => trackProductClick(shade)}
          >
            {/* Compact (v2) next to Add to Cart: too narrow for the full label, and
                the product photo it sits on says what's being viewed. */}
            {compact && embedded ? "View" : "View Product"}
          </a>
        </Button>
      </>
    );
  };

  // Share and Download for one shade.
  const shareButtons = (shade: Shade) => {
    const snapshot = snapshotFor(shade);
    const productUrl = productUrlFor(shade);
    const brand = { logoUrl: teakLogo, shadeName: shade.name, productTitle: productTitleFor(shade) };
    return (
      <>
        <Button
          size="sm"
          aria-label={`Share ${shade.label}`}
          className="h-7 px-2 bg-transparent hover:bg-transparent text-foreground hover:text-muted-foreground border-0"
          onClick={() => {
            trackEvent("share_clicked", { variant_id: shade.variantId, variant_name: shade.name, source });
            void shareLook({
              text: `What do you think of ${shade.label} on me?`,
              url: productUrl,
              imageUrl: snapshot,
              brand,
            });
          }}
        >
          <Share2 className="w-2.5 h-2.5" />
        </Button>
        <Button
          size="sm"
          aria-label={`Download ${shade.label} on your photo`}
          className="h-7 px-2 bg-transparent hover:bg-transparent text-foreground hover:text-muted-foreground border-0"
          disabled={!snapshot}
          onClick={() => {
            if (!snapshot) return;
            trackEvent("download_clicked", { variant_id: shade.variantId, variant_name: shade.name, source });
            void downloadLook({
              imageUrl: snapshot,
              filename: `teak-${shade.name.toLowerCase()}.jpg`,
              brand,
            });
          }}
        >
          <Download className="w-2.5 h-2.5" />
        </Button>
      </>
    );
  };

  const actionButtons = (shade: Shade) => (
    <div className="w-full flex flex-wrap gap-2">
      {buyButtons(shade)}
      {shareButtons(shade)}
    </div>
  );

  const shippingNote = (
    <p className="w-full mt-1 font-display text-[12px] leading-[13px] tracking-normal text-foreground text-center">
      Buy 2+ Lipsticks for Free U.S. Standard Shipping
    </p>
  );

  const conciergeNote = (
    <>
      <p className="w-full mt-2.5 pt-3.5 border-t border-foreground/20 font-display text-[12px] leading-[15px] tracking-normal text-foreground text-center">
        Feeling unsure? Email a selfie to{" "}
        <a
          href="mailto:hello@teakbeauty.com"
          className="underline hover:text-muted-foreground transition-colors"
          onClick={() => trackEvent("concierge_email_clicked", { variant_name: stacked ? null : active.name, source })}
        >
          hello@teakbeauty.com
        </a>{" "}
        for shade recs from trained color specialists at Teak's free Color Concierge
      </p>
    </>
  );

  const footer = (
    <>
      {shippingNote}
      {conciergeNote}
    </>
  );

  const title = (
    // Stacked (v2) scales the title down on phones (Pegasus Large, same
    // 28:29 ratio) so it stays on one line beside the Back button.
    <span
      className={`mt-1 mb-2.5 font-display text-foreground text-center ${
        stacked ? "text-[21px] leading-[22px] sm:text-[28px] sm:leading-[29px]" : "text-[28px] leading-[29px]"
      } ${titleClassName}`}
    >
      Top Recs for{" "}
      {complexionType !== null ? (
        <span className="text-green-700 whitespace-nowrap">Complexion {complexionType}</span>
      ) : (
        "You"
      )}
    </span>
  );

  if (stacked) {
    return (
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <div className="flex flex-col items-center">
          {title}
          {/* Shipping offer up front, before the recs, rather than in the footer. */}
          {shippingNote}
        </div>
        {pickNames.map((name) => {
          const shade = shadesByName[name];
          if (!shade) return null;
          return (
            <div key={name} className="flex flex-col gap-2.5 bg-background border border-foreground p-4">
              {/* One-line header: shade, formula and price. Buy buttons sit on
                  the product photo. */}
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="flex flex-wrap items-baseline gap-x-2 min-w-0">
                    <span className="font-display text-[18px] leading-[18px] text-foreground">{shade.name}</span>
                    <span className="font-display text-[12px] leading-[13px] text-muted-foreground">{productTitleFor(shade)}</span>
                  </p>
                  {(() => {
                    const img = variantImages[shade.variantId];
                    const price = formatPrice(img?.price, img?.currencyCode);
                    return price ? (
                      <span className="shrink-0 font-display text-[12px] leading-[13px] text-foreground">{price}</span>
                    ) : null;
                  })()}
                </div>
              </div>
              {/* The shade on the visitor's photo, beside the product itself. */}
              <div className="grid grid-cols-2 gap-2">
                {photoCard(shade, "w-full", false, true)}
                {productImage(shade)}
              </div>
            </div>
          );
        })}
        <div className="flex flex-col items-center gap-1">{conciergeNote}</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-2.5 bg-background border border-foreground p-4">
      {title}

      <div className="w-full flex flex-col gap-4 px-1">
        {pickNames.length > 0 && (
          <div>
            <div className="flex flex-wrap items-start justify-center gap-x-2.5 gap-y-2">
              {pickNames.map((name) => swatch(name))}
            </div>
            {/* Title of the category the shade on the lips was picked for;
                blank (but space held) while a non-pick shade is selected. */}
            <p className="mt-2.5 min-h-[13px] font-display text-[12px] leading-[13px] tracking-normal text-foreground text-center">
              {activeName ? (categoryByName[activeName] ?? []).join(" · ") : ""}
            </p>
          </div>
        )}
        <div className="border-t border-foreground/20 pt-3.5">
          <p className="font-display text-[18px] leading-[18px] tracking-normal text-foreground text-center mb-2.5">
            Other Shades to Try
          </p>
          <div className="flex flex-wrap items-start justify-center gap-x-2.5 gap-y-2">
            {restNames.map((name) => swatch(name))}
          </div>
        </div>
      </div>

      {photoCard(active)}

      <div className="flex flex-col items-center gap-1">
        {actionButtons(active)}
        {footer}
      </div>
    </div>
  );
};

export default TryOnOtherShades;
