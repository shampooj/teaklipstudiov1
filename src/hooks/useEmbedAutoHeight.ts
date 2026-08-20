import { useEffect } from "react";

// Auto-height embed plumbing: when framed on the Shopify storefront, the app
// reports its content height so the theme can size the iframe to fit exactly.
// The inner page then never scrolls — every swipe scrolls the parent store
// page, which is what a visitor expects. If the theme listener is missing the
// messages are simply ignored and the iframe keeps its fallback fixed height,
// so this degrades gracefully to the old scroll-in-a-box behavior.
export function useEmbedAutoHeight(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let lastHeight = 0;
    const post = () => {
      const height = Math.ceil(document.documentElement.scrollHeight);
      if (Math.abs(height - lastHeight) < 2) return;
      lastHeight = height;
      window.parent?.postMessage({ type: "embed-resize", height }, "*");
    };
    const observer = new ResizeObserver(post);
    observer.observe(document.documentElement);
    observer.observe(document.body);
    post();
    // Belt and braces for growth ResizeObserver can miss (late fonts, images
    // decoding); the lastHeight guard makes idle ticks free.
    const interval = window.setInterval(post, 1500);
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, [enabled]);
}

// Ask the parent page to scroll back to the top of the iframe — the embedded
// replacement for window.scrollTo(0, 0) on step changes, since an auto-height
// iframe has no inner scroll position of its own.
export const postEmbedScrollTop = () => {
  window.parent?.postMessage({ type: "embed-scroll-top" }, "*");
};
