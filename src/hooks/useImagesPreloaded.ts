import { useEffect, useMemo, useState } from "react";

const settledUrls = new Set<string>();

// True once every given URL has finished loading (or failed — a broken image
// shouldn't hold the page hostage). Results are cached for the session.
export function useImagesPreloaded(urls: string[]): boolean {
  const key = useMemo(() => urls.join("|"), [urls]);
  const [, bump] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const pending = urls.filter((u) => !settledUrls.has(u));
    if (pending.length === 0) return;
    for (const url of pending) {
      const img = new Image();
      const settle = () => {
        settledUrls.add(url);
        if (!cancelled) bump((n) => n + 1);
      };
      img.onload = settle;
      img.onerror = settle;
      img.src = url;
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return urls.every((u) => settledUrls.has(u));
}
