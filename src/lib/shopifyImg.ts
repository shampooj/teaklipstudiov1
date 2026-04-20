/**
 * Append Shopify CDN resize params to an image URL.
 * Shopify CDN supports `?width=` (and `&height=`) for on-the-fly resizing,
 * which dramatically reduces payload size vs. serving the original.
 *
 * Safely no-ops for non-Shopify URLs.
 */
export function shopifyImg(url: string | null | undefined, width: number, height?: number): string {
  if (!url) return "";
  // Only transform Shopify CDN URLs
  if (!/cdn\.shopify\.com/.test(url)) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("width", String(width));
    if (height) u.searchParams.set("height", String(height));
    return u.toString();
  } catch {
    return url;
  }
}
