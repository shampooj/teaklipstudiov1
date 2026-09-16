import { useEffect, useRef, useState } from "react";
import { snapshotShade, type ShadeSnapshotSpec } from "@/lib/banubaSnapshots";

// All ten lip-tone "after" renders for the selected shade, side by side, so
// the whole complexion set can be judged without opening the per-row live
// preview. Uses the shared snapshot queue (one Banuba engine, sequential
// renders, cached by image + settings), and waits for the sliders to settle
// before asking for new frames.

export interface GalleryItem {
  id: string;
  label: string;
  image: string;
  spec: ShadeSnapshotSpec;
}

const SETTLE_MS = 500;

interface Props {
  items: GalleryItem[];
  onSelect?: (id: string) => void;
  /** row: one horizontal scrolling strip (default). grid: wrap into rows. */
  layout?: "row" | "grid";
  title?: string;
  hint?: string;
}

const ShadeRenderGallery = ({ items, onSelect, layout = "row", title = "Final renders, all lip tones", hint }: Props) => {
  // id -> blob URL; absent = rendering, null = failed
  const [renders, setRenders] = useState<Record<string, string | null>>({});
  const [showBefore, setShowBefore] = useState(false);
  const seq = useRef(0);
  const settingsKey = items.map((i) => `${i.id}|${i.image}|${JSON.stringify(i.spec)}`).join(";");

  useEffect(() => {
    const mySeq = ++seq.current;
    const t = window.setTimeout(() => {
      for (const item of items) {
        snapshotShade(item.image, item.spec).then(
          (url) => {
            if (seq.current !== mySeq) return;
            setRenders((prev) => (prev[item.id] === url ? prev : { ...prev, [item.id]: url }));
          },
          () => {
            if (seq.current !== mySeq) return;
            setRenders((prev) => ({ ...prev, [item.id]: null }));
          },
        );
      }
    }, SETTLE_MS);
    return () => window.clearTimeout(t);
    // settingsKey captures everything that should trigger a re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey]);

  const pending = items.filter((i) => renders[i.id] === undefined).length;
  // The strip stays compact; the grid gets roomier tiles since it's the
  // view for judging renders side by side.
  const tile = layout === "grid" ? "w-44" : "w-28";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
          {title}
          {pending > 0 && <span className="normal-case tracking-normal"> · rendering {pending}…</span>}
        </p>
        <button
          type="button"
          onClick={() => setShowBefore((v) => !v)}
          className="text-[9px] uppercase tracking-normal underline text-muted-foreground hover:text-foreground"
        >
          {showBefore ? "Show after" : "Show before"}
        </button>
      </div>
      <div className={layout === "row" ? "overflow-x-auto -mx-1 px-1" : ""}>
        <div className={layout === "row" ? "flex gap-2 min-w-max" : "flex flex-wrap gap-3"}>
          {items.map((item) => {
            const url = renders[item.id];
            const src = showBefore ? item.image : url ?? null;
            return (
              <figure key={item.id} className={`${tile} shrink-0`}>
                <button
                  type="button"
                  onClick={() => onSelect?.(item.id)}
                  title={`Jump to ${item.label} settings`}
                  className={`relative block ${tile} aspect-[4/5] rounded-md overflow-hidden bg-muted border border-border hover:border-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground transition-colors`}>
                  {src ? (
                    <img src={src} alt={`${item.label}: ${showBefore ? "before" : "after"}`} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <img src={item.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                  )}
                  {!showBefore && url === undefined && (
                    <span className="absolute inset-x-0 bottom-1 text-center text-[9px] uppercase tracking-normal text-foreground/70">rendering…</span>
                  )}
                  {!showBefore && url === null && (
                    <span className="absolute inset-x-0 bottom-1 text-center text-[9px] uppercase tracking-normal text-destructive">failed</span>
                  )}
                </button>
                <figcaption className={`mt-1 uppercase tracking-normal text-muted-foreground text-center truncate ${layout === "grid" ? "text-[10px]" : "text-[9px]"}`}>{item.label}</figcaption>
              </figure>
            );
          })}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {hint ?? "Click a tile to jump to that lip tone's settings. Updates about half a second after you stop moving a slider; renders use the same pipeline as the quiz results."}
      </p>
    </div>
  );
};

export default ShadeRenderGallery;
