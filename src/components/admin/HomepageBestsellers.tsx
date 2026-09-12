import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Copy, Check, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchLiveProducts, type LiveProduct } from "@/lib/shopify";
import {
  BESTSELLERS_KEY,
  EMPTY_BESTSELLERS,
  buildBestsellersSnippet,
  type BestsellerItem,
  type BestsellersConfig,
} from "@/lib/bestsellers";

// Web feature: "Homepage bestsellers". Pick live variants, give each card a
// photo, see the block exactly as the storefront will render it, and copy the
// Custom Liquid that puts it on the Shopify homepage.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const BUCKET = "web-features";

// The preview iframe is served from this app's origin, so alias the theme's
// font names to the app's own font files.
const PREVIEW_FONT_CSS = `
@font-face{font-family:WolpePegasus;src:url(${window.location.origin}/fonts/WolpePegasus-Regular.otf) format("opentype");font-weight:400}
@font-face{font-family:ABCROM;src:url(${window.location.origin}/fonts/ABCROM-Medium.woff2) format("woff2");font-weight:500}
body{margin:0;padding:24px;background:#fff}
`;

const configKey = (c: BestsellersConfig) => JSON.stringify(c);

const HomepageBestsellers = () => {
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ["shopify-live-products"], queryFn: fetchLiveProducts, staleTime: 5 * 60 * 1000 });
  const saved = useQuery({
    queryKey: ["web-features", BESTSELLERS_KEY],
    queryFn: async (): Promise<BestsellersConfig> => {
      const { data, error } = await (supabase.from as any)("web_features").select("config").eq("key", BESTSELLERS_KEY).maybeSingle();
      if (error) throw error;
      const cfg = (data?.config ?? null) as Partial<BestsellersConfig> | null;
      return {
        heading: cfg?.heading ?? "",
        layout: cfg?.layout === "scroll" ? "scroll" : "grid",
        desktopColumns: ([2, 3, 4, 5] as const).find((n) => n === cfg?.desktopColumns) ?? 3,
        items: Array.isArray(cfg?.items) ? cfg!.items! : [],
      };
    },
  });

  const [config, setConfig] = useState<BestsellersConfig>(EMPTY_BESTSELLERS);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  useEffect(() => {
    if (saved.data && loadedKey === null) {
      setConfig(saved.data);
      setLoadedKey(configKey(saved.data));
    }
  }, [saved.data, loadedKey]);
  const dirty = loadedKey !== null && configKey(config) !== loadedKey;

  const [productId, setProductId] = useState<string>("");
  const [variantId, setVariantId] = useState<string>("");
  const product = products.data?.find((p) => p.id === productId);
  useEffect(() => {
    setVariantId("");
  }, [productId]);

  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [previewWidth, setPreviewWidth] = useState<"desktop" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(480);

  const update = (patch: Partial<BestsellersConfig>) => setConfig((c) => ({ ...c, ...patch }));
  const updateItem = (id: string, patch: Partial<BestsellerItem>) =>
    setConfig((c) => ({ ...c, items: c.items.map((it) => (it.variantId === id ? { ...it, ...patch } : it)) }));
  const move = (index: number, dir: -1 | 1) =>
    setConfig((c) => {
      const items = [...c.items];
      const j = index + dir;
      if (j < 0 || j >= items.length) return c;
      [items[index], items[j]] = [items[j], items[index]];
      return { ...c, items };
    });
  const remove = (id: string) => setConfig((c) => ({ ...c, items: c.items.filter((it) => it.variantId !== id) }));

  const addVariant = (p: LiveProduct, vId: string) => {
    const v = p.variants.find((x) => x.id === vId);
    if (!v) return;
    if (config.items.some((it) => it.variantId === v.id)) {
      toast.error("That variant is already in the block");
      return;
    }
    const item: BestsellerItem = {
      variantId: v.id,
      productHandle: p.handle,
      productTitle: p.title,
      variantTitle: v.title,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      currencyCode: v.currencyCode,
      imageUrl: v.imageUrl ?? p.imageUrl ?? "",
      imagePath: null,
      rating: p.rating,
    };
    setConfig((c) => ({ ...c, items: [...c.items, item] }));
    setVariantId("");
  };

  const upload = async (item: BestsellerItem, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setUploadingId(item.variantId);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `bestsellers/${item.variantId}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      if (item.imagePath) await supabase.storage.from(BUCKET).remove([item.imagePath]).catch(() => {});
      updateItem(item.variantId, { imageUrl: url, imagePath: path });
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  const revertToProductPhoto = async (item: BestsellerItem) => {
    const p = products.data?.find((x) => x.handle === item.productHandle);
    const v = p?.variants.find((x) => x.id === item.variantId);
    const url = v?.imageUrl ?? p?.imageUrl ?? "";
    if (item.imagePath) await supabase.storage.from(BUCKET).remove([item.imagePath]).catch(() => {});
    updateItem(item.variantId, { imageUrl: url, imagePath: null });
  };

  const save = async () => {
    if (config.items.some((it) => !it.imageUrl)) {
      toast.error("Every card needs an image");
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from as any)("web_features").upsert(
      { key: BESTSELLERS_KEY, config, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    setSaving(false);
    if (error) {
      toast.error(`Failed to save: ${error.message}`);
      return;
    }
    setLoadedKey(configKey(config));
    qc.setQueryData(["web-features", BESTSELLERS_KEY], config);
    toast.success("Bestsellers saved. The storefront picks it up on the next page load.");
  };

  // Preview: same snippet, baked with the CURRENT (possibly unsaved) config
  // and no live fetch, so what you see is exactly what you're editing.
  const previewHtml = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${buildBestsellersSnippet(
        config,
        { supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_KEY, live: false, previewFontCss: PREVIEW_FONT_CSS },
      )}</body></html>`,
    [config],
  );
  // Snippet to paste: baked with the SAVED config and live-refreshing.
  const snippet = useMemo(
    () => buildBestsellersSnippet(saved.data ?? EMPTY_BESTSELLERS, { supabaseUrl: SUPABASE_URL, anonKey: SUPABASE_KEY, live: true }),
    [saved.data],
  );

  const fitIframe = () => {
    const doc = iframeRef.current?.contentDocument;
    if (doc?.body) setIframeHeight(Math.max(240, doc.body.scrollHeight + 8));
  };
  useEffect(() => {
    const t = window.setTimeout(fitIframe, 400);
    return () => window.clearTimeout(t);
  }, [previewHtml, previewWidth]);

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  };

  const envNote = SUPABASE_URL.includes("haeacwyg") ? "staging" : "production";

  return (
    <div className="space-y-5">
      <div className="border border-border rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Homepage bestsellers</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            A block of product cards styled like the homepage's featured collection. Choose the variants,
            give each card a photo, save, then paste the Custom Liquid once. Later edits appear on the site
            without re-pasting.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Block heading (optional)</p>
          <Input
            value={config.heading}
            onChange={(e) => update({ heading: e.target.value })}
            placeholder="e.g. Bestsellers"
            className="h-8 max-w-sm text-[11px] rounded-md"
          />
        </div>

        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Layout</p>
          <div className="flex gap-1">
            {(["grid", "scroll"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => update({ layout: l })}
                aria-pressed={config.layout === l}
                className={`text-[9px] uppercase tracking-normal px-3 h-7 rounded-full border ${config.layout === l ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                {l === "scroll" ? "Horizontal scroll" : "Grid"}
              </button>
            ))}
            <span className="ml-2 self-center text-[10px] text-muted-foreground">
              {config.layout === "scroll" ? "One row that scrolls sideways." : `Wrapping rows: two across on phones, ${config.desktopColumns} on larger screens.`}
            </span>
          </div>
          {config.layout === "grid" && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Desktop columns</span>
              <div className="flex gap-1">
                {([2, 3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => update({ desktopColumns: n })}
                    aria-pressed={config.desktopColumns === n}
                    className={`text-[9px] w-7 h-7 rounded-full border ${config.desktopColumns === n ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Add a variant</p>
          {products.isLoading && <p className="text-[10px] text-muted-foreground">Loading live products from Shopify…</p>}
          {products.error && <p className="text-[10px] text-destructive">Couldn't load products: {(products.error as Error).message}</p>}
          {products.data && (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="h-8 w-72 text-[11px] rounded-md border-foreground/20">
                  <SelectValue placeholder="Product…" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-80">
                  {products.data.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-[11px]">{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={variantId} onValueChange={setVariantId} disabled={!product}>
                <SelectTrigger className="h-8 w-72 text-[11px] rounded-md border-foreground/20">
                  <SelectValue placeholder={product ? "Variant…" : "Pick a product first"} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-80">
                  {product?.variants.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-[11px]" disabled={!v.availableForSale}>
                      {v.title}{v.availableForSale ? "" : " (sold out)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={() => product && addVariant(product, variantId)}
                disabled={!product || !variantId}
                className="h-8 rounded-full bg-foreground text-background hover:bg-foreground/85 text-[9px] uppercase tracking-normal px-4"
              >
                Add to block
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Cards ({config.items.length})</p>
          {config.items.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">No cards yet. Add a variant above.</p>
          ) : (
            <ul className="space-y-2">
              {config.items.map((it, i) => (
                <li key={it.variantId} className="border border-border rounded-xl p-3 flex items-center gap-3">
                  <div className="w-16 h-16 shrink-0 rounded-md overflow-hidden bg-muted border border-border">
                    {it.imageUrl ? <img src={it.imageUrl} alt="" className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium truncate">{it.productTitle}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {it.variantTitle} · ${Number(it.price).toFixed(2)}
                      {it.rating ? ` · ${it.rating.value.toFixed(2)} ★ (${it.rating.count})` : ""}
                      {it.imagePath ? " · custom photo" : " · product photo"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <input
                        ref={(el) => { fileRefs.current[it.variantId] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void upload(it, f);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileRefs.current[it.variantId]?.click()}
                        disabled={uploadingId === it.variantId}
                        className="h-7 rounded-full text-[9px] uppercase tracking-normal border-foreground gap-1.5 px-3"
                      >
                        <Upload className="w-3 h-3" /> {uploadingId === it.variantId ? "Uploading…" : "Upload photo"}
                      </Button>
                      {it.imagePath && (
                        <button type="button" onClick={() => void revertToProductPhoto(it)} className="text-[9px] uppercase tracking-normal underline text-muted-foreground hover:text-foreground">
                          Use product photo
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-border hover:bg-muted disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === config.items.length - 1} aria-label="Move down" className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-border hover:bg-muted disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => remove(it.variantId)} aria-label="Remove" className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-border hover:bg-muted"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="h-8 rounded-full bg-foreground text-background hover:bg-foreground/85 text-[9px] uppercase tracking-normal px-4"
          >
            {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </Button>
          {dirty && <span className="text-[10px] text-muted-foreground">Unsaved changes. The preview below shows them; the snippet uses what's saved.</span>}
        </div>
      </div>

      <div className="border border-border rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Preview</p>
          <div className="flex gap-1">
            {(["desktop", "mobile"] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setPreviewWidth(w)}
                className={`text-[9px] uppercase tracking-normal px-3 h-7 rounded-full border ${previewWidth === w ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-muted/40 rounded-xl p-3 overflow-x-auto">
          <iframe
            ref={iframeRef}
            title="Bestsellers block preview"
            srcDoc={previewHtml}
            onLoad={fitIframe}
            style={{ width: previewWidth === "mobile" ? 375 : "100%", height: iframeHeight, border: 0, background: "#fff", display: "block", margin: "0 auto" }}
          />
        </div>
      </div>

      <div className="border border-border rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Custom Liquid</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Shopify admin → Online Store → Themes → Customize → Home page → Add section → Custom Liquid → paste.
              This copy reads the <span className="font-medium">{envNote}</span> database
              {envNote === "staging" ? "; copy it from the production admin before pasting into the live theme." : "."}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={copySnippet} className="h-8 rounded-full text-[9px] uppercase tracking-normal border-foreground gap-1.5 px-4">
            {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy snippet</>}
          </Button>
        </div>
        <textarea
          readOnly
          value={snippet}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full h-56 font-mono text-[10px] leading-snug rounded-md border border-border bg-background p-3"
        />
      </div>
    </div>
  );
};

export default HomepageBestsellers;
