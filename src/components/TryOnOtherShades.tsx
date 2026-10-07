import { useMemo, useRef, useState, type ComponentProps } from "react";
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
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface Props {
  // The face to try shades on; null (quiz v4) shows products only.
  userFace: string | null;
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

// A tap rarely lands perfectly still; a few px of sideways wobble starts a
// carousel drag, which cancels the touch so phones never fire the click.
// Touches that begin on the buy buttons don't drag (the card around them
// still swipes).
const carouselOpts: ComponentProps<typeof Carousel>["opts"] = {
  align: "start",
  watchDrag: (_api, evt) => !(evt.target instanceof Element && evt.target.closest("[data-no-drag]")),
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
  // Stacked cards whose try-on is flipped to the bare photo by a tap
  // (touch screens; mouse users get it on hover instead).
  const [bareShown, setBareShown] = useState<Record<string, boolean>>({});
  // Product-only cards whose photo is flipped to the smear by a tap (touch
  // screens; mouse users get it on hover instead).
  const [smearShown, setSmearShown] = useState<Record<string, boolean>>({});
  // Where and when the current touch on a product photo began. The flip is
  // driven by the touch itself, not the click: a tap that wobbles a few px
  // sideways starts a carousel drag, and phones then drop the click.
  const photoTouch = useRef<{ x: number; y: number; t: number } | null>(null);
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
  const bareFace = userFace ?? undefined;
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
  // compareBare (v2): hovering (mouse), or tapping (touch screens, tap again
  // to go back), fades to the bare photo to compare with and without.
  const photoCard = (
    shade: Shade,
    className = "w-full max-w-sm",
    showBar = true,
    compareBare = false,
    aspect = "aspect-[3/4]",
  ) => (
    <div className={`mx-auto ${className}`} style={{ containerType: "inline-size" }}>
      <div
        className={`w-full ${aspect} overflow-hidden bg-muted relative ${compareBare ? "group select-none" : ""}`}
        onClick={
          compareBare
            ? () => {
                // Touch only: with a mouse, hover already shows the bare photo,
                // and a click-toggle would leave it stuck after the pointer leaves.
                if (!window.matchMedia("(hover: none)").matches || !snapshotFor(shade)) return;
                const next = !bareShown[shade.name];
                setBareShown((prev) => ({ ...prev, [shade.name]: next }));
                trackEvent("bare_photo_toggled", { variant_name: shade.name, showing_bare: next, source });
              }
            : undefined
        }
      >
        <img
          src={snapshotFor(shade) ?? bareFace}
          alt={`${shade.label} on your photo`}
          draggable={compareBare ? false : undefined}
          className="w-full h-full object-cover"
        />
        {compareBare && snapshotFor(shade) && (
          <>
            <img
              src={bareFace}
              alt=""
              aria-hidden="true"
              draggable={false}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${bareShown[shade.name] ? "opacity-100" : "opacity-0"} [@media(hover:hover)]:group-hover:opacity-100`}
            />
            <span className={`absolute top-1.5 left-1.5 rounded-full bg-background/85 px-2 py-0.5 font-sans font-medium text-[9px] uppercase tracking-normal text-foreground transition-opacity duration-200 ${bareShown[shade.name] ? "opacity-100" : "opacity-0"} [@media(hover:hover)]:group-hover:opacity-100 pointer-events-none`}>
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

  // The shade's product photo from the store, linking to its product page.
  // When the shade has a smear swatch among its images, the photos stack:
  // main photo on top, smear below. The photos are laid out absolutely so
  // they fill exactly the try-on photo's height (the grid row) instead of
  // stretching the row with their own heights.
  const productImage = (shade: Shade) => {
    const img = variantImages[shade.variantId];
    const smear = img?.metaImages.find((m) => /smear/i.test(m.url.split("/").pop() ?? ""));
    return (
      <div className="relative w-full h-full">
        <a
          href={productUrlFor(shade)}
          target={embedded ? "_top" : undefined}
          onClick={() => trackProductClick(shade)}
          aria-label={`View ${shade.label}`}
          className="absolute inset-0 flex flex-col gap-2"
        >
          {img?.imageUrl && (
            <img
              src={shopifyImg(img.imageUrl, 480)}
              alt={img.altText ?? shade.label}
              loading="lazy"
              className="w-full flex-1 min-h-0 object-contain bg-muted"
            />
          )}
          {smear && (
            <img
              src={shopifyImg(smear.url, 480)}
              alt={smear.altText ?? `${shade.name} swatch`}
              loading="lazy"
              className="w-full flex-1 min-h-0 object-cover bg-muted"
            />
          )}
        </a>
      </div>
    );
  };

  // Without a try-on photo (quiz v4): the product photo, filling a 4:5 frame
  // so every card's photo is the same size (packshots are mostly 4:5; the odd
  // landscape one is cropped to its middle), with the smear fading in over it
  // on hover. On touch screens a tap flips between the
  // two (tap again to go back) instead of opening the product page.
  const productOnlyImage = (shade: Shade) => {
    const img = variantImages[shade.variantId];
    const smear = img?.metaImages.find((m) => /smear/i.test(m.url.split("/").pop() ?? ""));
    const showSmear = !!smear && !!smearShown[shade.name];
    return (
      <a
        href={productUrlFor(shade)}
        target={embedded ? "_top" : undefined}
        onPointerDown={(e) => {
          photoTouch.current = e.pointerType === "touch" ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null;
        }}
        onPointerUp={(e) => {
          const start = photoTouch.current;
          photoTouch.current = null;
          // Under 10px and half a second is a tap; anything more is a swipe.
          if (!smear || !start || e.pointerType !== "touch") return;
          if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10 || e.timeStamp - start.t > 500) return;
          const next = !smearShown[shade.name];
          setSmearShown((prev) => ({ ...prev, [shade.name]: next }));
          trackEvent("smear_toggled", { variant_name: shade.name, showing_smear: next, source });
        }}
        onClick={(e) => {
          // On touch screens a tap flips to the smear (above) instead of
          // opening the product page.
          if (smear && window.matchMedia("(hover: none)").matches) {
            e.preventDefault();
            return;
          }
          trackProductClick(shade);
        }}
        aria-label={`View ${shade.label}`}
        className="group relative block w-full aspect-[4/5] overflow-hidden bg-muted select-none"
      >
        {img?.imageUrl && (
          <img
            src={shopifyImg(img.imageUrl, 480)}
            alt={img.altText ?? shade.label}
            loading="lazy"
            draggable={false}
            className="w-full h-full object-cover"
          />
        )}
        {smear && (
          <>
            <img
              src={shopifyImg(smear.url, 480)}
              alt={smear.altText ?? `${shade.name} swatch`}
              loading="lazy"
              draggable={false}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${showSmear ? "opacity-100" : "opacity-0"} [@media(hover:hover)]:group-hover:opacity-100`}
            />
            <span className={`absolute top-1.5 left-1.5 rounded-full bg-background/85 px-2 py-0.5 font-sans font-medium text-[9px] uppercase tracking-normal text-foreground transition-opacity duration-200 ${showSmear ? "opacity-100" : "opacity-0"} [@media(hover:hover)]:group-hover:opacity-100 pointer-events-none`}>
              Swatch
            </span>
          </>
        )}
      </a>
    );
  };

  const trackProductClick = (shade: Shade) =>
    trackEvent("product_clicked", { variant_id: shade.variantId, variant_name: shade.name, source, product_handle: variantImages[shade.variantId]?.productHandle });

  // Add to Cart (embedded only) and View Product for one shade.
  // height: the v4 carousel passes a taller phone height (44px, a
  // comfortable touch target); elsewhere the buttons stay 28px.
  const buyButtons = (shade: Shade, height = "h-7") => {
    const productUrl = productUrlFor(shade);
    const cartState = cartStates[shade.variantId];
    return (
      <>
        {embedded && (
          <Button
            size="sm"
            className={`${height} flex-1 min-w-0 font-sans font-medium text-[9px] uppercase tracking-normal rounded-full transition-all duration-300 ${
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
          className={`${height} flex-1 min-w-0 px-2.5 font-sans font-medium text-[9px] uppercase tracking-normal rounded-full bg-background text-foreground border border-foreground hover:bg-foreground hover:text-background`}
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
            View Product
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
      {userFace && shareButtons(shade)}
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

  // No photo (quiz v4): smaller product-only cards in a carousel. Two fit
  // from sm up; on phones the next card peeks in to show there's more.
  // Arrows at every width, and phones can also swipe.
  if (stacked && !userFace) {
    return (
      <div className="w-full flex flex-col gap-4">
        <div className="flex flex-col items-center">
          {title}
          {shippingNote}
        </div>
        <Carousel opts={carouselOpts} className="w-full sm:px-10">
          <CarouselContent className="-ml-3">
            {pickNames.map((name) => {
              const shade = shadesByName[name];
              if (!shade) return null;
              const img = variantImages[shade.variantId];
              const price = formatPrice(img?.price, img?.currencyCode);
              return (
                <CarouselItem key={name} className="pl-3 basis-[78%] sm:basis-1/2">
                  <div className="h-full flex flex-col gap-2.5 bg-background border border-foreground p-3">
                    {/* What the shade was picked as, e.g. "My Lips But Better". */}
                    <p className="font-sans font-medium text-[9px] uppercase tracking-normal text-foreground">
                      {(categoryByName[name] ?? []).join(" · ")}
                    </p>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-[18px] leading-[18px] text-foreground">{shade.name}</span>
                      {price && <span className="shrink-0 font-display text-[12px] leading-[13px] text-foreground">{price}</span>}
                    </div>
                    <span className="-mt-1 font-display text-[12px] leading-[13px] text-muted-foreground">{productTitleFor(shade)}</span>
                    {productOnlyImage(shade)}
                    {/* Side by side on phones, where one card fills the width;
                        stacked from sm up, where two narrower cards share it.
                        The buttons' flex-1 splits a row's width but would squash
                        their height in a column, so it's dropped there. */}
                    <div data-no-drag className="mt-auto flex gap-2 sm:flex-col sm:[&>*]:flex-none">{buyButtons(shade, "h-11 sm:h-7")}</div>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          {/* Centered under the cards on narrow screens; beside them from sm up
              (the wrapper isn't positioned, so there they place against the carousel). */}
          <div className="mt-3 flex justify-center gap-3 sm:mt-0">
            <CarouselPrevious className="static translate-y-0 sm:absolute sm:left-0 sm:top-1/2 sm:-translate-y-1/2 border-foreground disabled:opacity-30" />
            <CarouselNext className="static translate-y-0 sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2 border-foreground disabled:opacity-30" />
          </div>
        </Carousel>
        <div className="flex flex-col items-center gap-1">{conciergeNote}</div>
      </div>
    );
  }

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
              {/* The try-on gets the larger share and a tall 9:16 crop; the
                  product photos stretch to its height. */}
              <div className="grid grid-cols-[11fr_9fr] gap-2">
                {photoCard(shade, "w-full", false, true, "aspect-[9/16]")}
                {productImage(shade)}
              </div>
              {/* Buy buttons in a full-width row under all three images. */}
              <div className="flex gap-2">{buyButtons(shade)}</div>
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

      {userFace && photoCard(active)}

      <div className="flex flex-col items-center gap-1">
        {actionButtons(active)}
        {footer}
      </div>
    </div>
  );
};

export default TryOnOtherShades;
