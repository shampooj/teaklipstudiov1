import { useEffect, useRef } from "react";

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
      // Box height, NOT scrollHeight: scrollHeight is floored at the viewport,
      // and the iframe viewport is whatever height we last posted — measuring
      // it would ratchet upward forever. The html box height follows content.
      const height = Math.ceil(document.documentElement.getBoundingClientRect().height);
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

// Each step should open at the top: scroll there when the step changes.
// Not on first load: embedded, that would yank the store page down to the
// iframe as soon as a shopper lands on the page. Compares against the last
// step (not a first-run flag) so StrictMode's double effect doesn't fire it.
export function useScrollTopOnStepChange(embedded: boolean, step: string) {
  const lastStep = useRef(step);
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    window.scrollTo(0, 0);
    if (embedded) postEmbedScrollTop();
  }, [step, embedded]);
}
