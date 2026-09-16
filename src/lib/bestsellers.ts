// "Homepage bestsellers" web feature: the saved config shape and the Custom
// Liquid snippet that renders it on the Shopify storefront.
//
// The snippet is self-contained (markup + CSS + a small renderer). It paints
// the config baked in at copy time immediately, then fetches the latest
// config from Supabase (public read on web_features) so admin edits reach
// the site without re-pasting. Card styling mirrors the Be Yours theme's
// featured-collection product cards on teakbeauty.com (measured values).
// The root forces width:100% / flex:1 1 100% because the theme's Custom
// Liquid section places its content inside a flex slider row, where a grid
// would otherwise shrink to the width of its wrapped titles.
import { SHOP_URL } from "@/lib/shopify";

export const BESTSELLERS_KEY = "homepage_bestsellers";

export interface BestsellerItem {
  variantId: string;
  productHandle: string;
  productTitle: string;
  variantTitle: string;
  price: string;
  compareAtPrice: string | null;
  currencyCode: string;
  /** Image shown on the card: an admin upload or the variant/product photo. */
  imageUrl: string;
  /** Storage path when imageUrl is an admin upload, else null. */
  imagePath: string | null;
  rating: { value: number; max: number; count: number } | null;
}

export type BestsellersLayout = "grid" | "scroll";

export interface BestsellersConfig {
  heading: string;
  /** grid: wrapping rows (2-up mobile, 3-up desktop). scroll: one row that scrolls sideways. */
  layout: BestsellersLayout;
  /** Grid only: cards per row from 750px up (phones always show two). */
  desktopColumns: 2 | 3 | 4 | 5;
  items: BestsellerItem[];
}

export const EMPTY_BESTSELLERS: BestsellersConfig = { heading: "", layout: "grid", desktopColumns: 3, items: [] };

export interface SnippetOptions {
  supabaseUrl: string;
  anonKey: string;
  /** true: fetch the latest saved config after painting the baked one. */
  live: boolean;
  /** Extra <style> for the admin preview only (font aliases). */
  previewFontCss?: string;
}

const CSS = `
.teak-bs{font-family:WolpePegasus,"Wolpe Pegasus",Georgia,serif;color:#1a1b18;margin:0;padding:0;display:block;width:100%;min-width:0;flex:1 1 100%;box-sizing:border-box}
.teak-bs *{box-sizing:border-box}
.teak-bs__heading{font-family:WolpePegasus,"Wolpe Pegasus",Georgia,serif;font-weight:400;font-size:24px;line-height:1.15;letter-spacing:0;margin:0 0 20px;color:#000}
.teak-bs__grid{display:grid;width:100%;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:15px;row-gap:30px;list-style:none;margin:0;padding:0}
@media (min-width:750px){.teak-bs__grid{grid-template-columns:repeat(var(--teak-bs-cols,3),minmax(0,1fr));column-gap:25px;row-gap:46px}}
.teak-bs__item{margin:0;padding:0;min-width:0}
.teak-bs__card{position:relative;display:block;background:#f3f3f3;border-radius:4px;overflow:hidden;text-decoration:none;color:inherit}
.teak-bs__media{position:relative;width:100%;padding-bottom:100%;overflow:hidden}
.teak-bs__media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 50%;transition:transform .5s ease;display:block}
@media (hover:hover){.teak-bs__card:hover .teak-bs__media img{transform:scale(1.05)}}
.teak-bs__badge{position:absolute;top:10px;left:10px;z-index:1;background:#d72c0d;color:#fff;font-family:ABCROM,"ABC ROM",Helvetica,Arial,sans-serif;font-size:9.35px;letter-spacing:.51px;text-transform:uppercase;padding:4.25px 8.5px;border-radius:1.7px}
.teak-bs__info{padding-top:6px;text-align:center}
.teak-bs__title{display:inline;font-size:15.2px;line-height:16.72px;letter-spacing:.57px;color:#000;text-decoration:none;background-image:linear-gradient(to top,#000 0 0);background-repeat:no-repeat;background-position:right bottom;background-size:0 1px;transition:background-size .3s ease}
.teak-bs__card-link:hover .teak-bs__title{background-position:left bottom;background-size:100% 1px}
.teak-bs__price{display:flex;justify-content:center;align-items:baseline;gap:8px;margin-top:4px;font-size:11.9px;letter-spacing:.85px;color:#1a1b18}
.teak-bs__price bdi{font-size:17.1px;letter-spacing:.85px}
.teak-bs__price .teak-bs__prefix{font-size:70%;margin:0 .3rem 0 0}
.teak-bs__price sup{font-size:60%;margin-left:.1rem;line-height:0;vertical-align:baseline;position:relative;top:-.5em}
.teak-bs__price .teak-bs__compare{text-decoration:line-through;color:rgba(26,27,24,.55)}
.teak-bs__price .teak-bs__compare bdi{font-size:13px}
.teak-bs__price .teak-bs__sale{color:#d72c0d}
.teak-bs--scroll .teak-bs__grid{display:flex;overflow-x:auto;column-gap:15px;row-gap:0;padding-bottom:10px;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:rgba(26,27,24,.35) transparent}
.teak-bs--scroll .teak-bs__grid::-webkit-scrollbar{height:4px}
.teak-bs--scroll .teak-bs__grid::-webkit-scrollbar-thumb{background:rgba(26,27,24,.35);border-radius:2px}
.teak-bs--scroll .teak-bs__item{flex:0 0 calc(62vw - 3rem);max-width:340px}
@media (min-width:750px){.teak-bs--scroll .teak-bs__grid{column-gap:25px}.teak-bs--scroll .teak-bs__item{flex-basis:calc((100% - 50px) / 3);max-width:none}}
.teak-bs__stars{display:block;margin-top:2px;font-size:12.75px;letter-spacing:2.55px;line-height:1.4;color:transparent;-webkit-background-clip:text;background-clip:text;background-image:linear-gradient(90deg,#ffb503 var(--p,0%),rgba(33,35,38,.15) var(--p,0%));white-space:nowrap}
`;

// Renderer runs inside the store page: plain ES5-ish, no dependencies.
const RENDERER = `
function money(amount, code){
  var n = Number(amount); if (!isFinite(n)) return "";
  var sym = code === "USD" || !code ? "$" : code + " ";
  var whole = Math.floor(n), cents = Math.round((n - whole) * 100);
  return '<bdi><span class="teak-bs__prefix">' + sym + '</span>' + whole + '<sup>.' + (cents < 10 ? "0" + cents : cents) + '</sup></bdi>';
}
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function render(root, cfg){
  var items = (cfg && cfg.items) || [];
  var scroll = cfg && cfg.layout === "scroll";
  root.className = "teak-bs" + (scroll ? " teak-bs--scroll" : "");
  var cols = Number(cfg && cfg.desktopColumns);
  root.style.setProperty("--teak-bs-cols", String(cols >= 2 && cols <= 5 ? cols : 3));
  var html = "";
  if (cfg && cfg.heading) html += '<h2 class="teak-bs__heading">' + esc(cfg.heading) + '</h2>';
  html += '<ul class="teak-bs__grid">';
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var href = SHOP + "/products/" + encodeURIComponent(it.productHandle) + "?variant=" + encodeURIComponent(it.variantId);
    var onSale = it.compareAtPrice && Number(it.compareAtPrice) > Number(it.price);
    var stars = "";
    if (it.rating && it.rating.value) {
      var pct = Math.max(0, Math.min(100, (it.rating.value / (it.rating.max || 5)) * 100));
      stars = '<span class="teak-bs__stars" style="--p:' + pct.toFixed(2) + '%" role="img" aria-label="' + esc(it.rating.value) + ' out of ' + esc(it.rating.max || 5) + ' stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>';
    }
    html += '<li class="teak-bs__item"><a class="teak-bs__card-link" href="' + href + '" style="text-decoration:none;color:inherit;display:block">'
      + '<div class="teak-bs__card"><div class="teak-bs__media">'
      + (onSale ? '<span class="teak-bs__badge">Sale</span>' : "")
      + '<img src="' + esc(it.imageUrl) + '" alt="' + esc(it.productTitle + (it.variantTitle && it.variantTitle !== "Default Title" ? " – " + it.variantTitle : "")) + '" loading="lazy">'
      + '</div></div>'
      + '<div class="teak-bs__info">'
      + '<span class="teak-bs__title">' + esc(it.variantTitle && it.variantTitle !== "Default Title" ? it.variantTitle : it.productTitle) + '</span>'
      + '<div class="teak-bs__price">'
      + (onSale ? '<span class="teak-bs__compare">' + money(it.compareAtPrice, it.currencyCode) + '</span><span class="teak-bs__sale">' + money(it.price, it.currencyCode) + '</span>' : money(it.price, it.currencyCode))
      + '</div>' + stars + '</div></a></li>';
  }
  html += '</ul>';
  root.innerHTML = html;
}
`;

const safeJson = (value: unknown) => JSON.stringify(value).replace(/<\//g, "<\\/");

export function buildBestsellersSnippet(config: BestsellersConfig, opts: SnippetOptions): string {
  const endpoint = `${opts.supabaseUrl.replace(/\/$/, "")}/rest/v1/web_features?key=eq.${BESTSELLERS_KEY}&select=config`;
  const fontCss = opts.previewFontCss ? `\n${opts.previewFontCss}` : "";
  // Each pasted copy gets its own id so two blocks on one page never repaint
  // each other; the id is fixed at copy time and travels with the snippet.
  const instance = `tbs-${Math.random().toString(36).slice(2, 8)}`;
  return `<!-- TEAK homepage bestsellers. Managed in the Lip Studio admin (Web Features tab).
     Paste once: the cards below repaint from the latest saved selection on every page load. -->
<div class="teak-bs" data-teak-bestsellers="${instance}"></div>
<style>${fontCss}${CSS}</style>
<script>
(function(){
  var SHOP = ${JSON.stringify(SHOP_URL)};
  var BAKED = ${safeJson(config)};
  var ENDPOINT = ${JSON.stringify(endpoint)};
  var KEY = ${JSON.stringify(opts.anonKey)};
  var LIVE = ${opts.live ? "true" : "false"};
  ${RENDERER}
  var roots = document.querySelectorAll('[data-teak-bestsellers="${instance}"]');
  for (var r = 0; r < roots.length; r++) render(roots[r], BAKED);
  if (LIVE && typeof fetch === "function") {
    fetch(ENDPOINT, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } })
      .then(function(res){ return res.ok ? res.json() : null; })
      .then(function(rows){
        var cfg = rows && rows[0] && rows[0].config;
        if (cfg && cfg.items) for (var r = 0; r < roots.length; r++) render(roots[r], cfg);
      })
      .catch(function(){});
  }
})();
</script>`;
}
