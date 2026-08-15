import { useEffect, useMemo, useState } from "react";
import { snapshotShade, ShadeSnapshotSpec } from "@/lib/banubaSnapshots";

// Maps spec.key → snapshot blob URL. Key absent = still rendering, null = failed
// (callers should fall back to the bare photo, matching the old per-card behavior).
export function useBanubaSnapshots(imageUrl: string | null, shades: ShadeSnapshotSpec[]) {
  const [snapshots, setSnapshots] = useState<Record<string, string | null>>({});

  const shadesKey = useMemo(
    () => shades.map((s) => `${s.key}|${s.hex}|${s.finish}|${s.opacity}`).join(";"),
    [shades],
  );

  useEffect(() => {
    setSnapshots({});
  }, [imageUrl]);

  useEffect(() => {
    if (!imageUrl || shades.length === 0) return;
    let cancelled = false;
    for (const spec of shades) {
      snapshotShade(imageUrl, spec).then(
        (url) => {
          if (cancelled) return;
          setSnapshots((prev) => (prev[spec.key] === url ? prev : { ...prev, [spec.key]: url }));
        },
        (err) => {
          console.error("Banuba snapshot failed", err);
          if (!cancelled) setSnapshots((prev) => ({ ...prev, [spec.key]: null }));
        },
      );
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, shadesKey]);

  return snapshots;
}
