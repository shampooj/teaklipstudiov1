import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Public, domain-locked Banuba Web AR client token
const CLIENT_TOKEN =
  "Qk5CIDCAu9die9bWDPxjBsDtmyi8ISOuFtz9pR+EiD4bdDnvOH/f4zuqRixTG+SOo4u3ZqQ1UB4qoUnYqeAht/yunk/Ec9rM81q48/zcczj9QLl1hj9+tl7o20rgGHcQ6JGklP3sinbGzZ5gQkHCa4Q7RLl7vDAXnam1v+LkLjDfMJ+ZP+7B5WX687rFCnWdICcOK8eUw1hIsm8afEQ/hFx3n3g01Fsa8m9XbmQ1Q8wtP4hsT9nzu3S7LSWnpWecWvDk4XZaVSESX/2TCfdDaafZMgeiH8gASe3rp8hH2cKvHZGbjYgMeG9l/POpWD3EYxBLNCrXpCYTrIR5B27XQUm5b5JEBgnSoIpygibYkeEbU49q7zvj3zb4ihg4UJRMgDefrW+LjXdQeYXTFA==";

const SDK_VERSION = "1.17.5";
const CDN_BASE = `https://cdn.jsdelivr.net/npm/@banuba/webar@${SDK_VERSION}/dist`;
const MODULES_BASE = `${CDN_BASE}/modules`;
const MODULE_IDS = ["face_tracker", "lips", "makeup"];
const FFLATE_URL = "https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js";

// Map our finish vocabulary -> Banuba lipstick finish
function mapFinish(finish: string): string {
  if (finish === "matte") return "matte_cream";
  if (finish === "glossy") return "shine";
  return "satin";
}

function loadFflate(): Promise<any> {
  if ((window as any).fflate) return Promise.resolve((window as any).fflate);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = FFLATE_URL;
    s.onload = () => resolve((window as any).fflate);
    s.onerror = () => reject(new Error("Failed to load fflate"));
    document.head.appendChild(s);
  });
}

async function buildBaseEffectZip(): Promise<Blob> {
  const fflate = await loadFflate();
  const cfg = { version: "2.0.0", scene: "beauty_demo", camera: {}, faces: [{}] };
  const archive = fflate.zipSync({
    "config.json": fflate.strToU8(JSON.stringify(cfg, null, 2)),
  });
  return new Blob([archive], { type: "application/zip" });
}

function buildConfig(colorHex: string, finish: string, coverage: number) {
  return {
    version: "2.0.0",
    scene: "beauty_demo",
    camera: {},
    faces: [
      {
        makeup_base: { mode: "quality", smooth: "0 0" },
        makeup_lipstick: { color: colorHex, finish: mapFinish(finish), coverage },
      },
    ],
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  lipToneLabel: string;
  lipToneImage: string;
  hex: string;
  finish: string;
  opacity: number;
}

const BanubaPreviewModal = ({
  open,
  onClose,
  lipToneLabel,
  lipToneImage,
  hex,
  finish,
  opacity,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const sdkRef = useRef<any>(null);
  const [status, setStatus] = useState<string>("Initializing…");
  const [error, setError] = useState<string | null>(null);

  // Init player when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setStatus("Loading Banuba SDK…");
        // Dynamic import from CDN; vite-ignore so it doesn't try to resolve at build time
        const sdk = await import(
          /* @vite-ignore */ `${CDN_BASE}/BanubaSDK.browser.esm.js`
        );
        if (cancelled) return;
        sdkRef.current = sdk;

        setStatus("Creating player…");
        const locateFile = (fileName: string) =>
          new URL(fileName, `${CDN_BASE}/`).toString();
        const player = await sdk.Player.create({
          clientToken: CLIENT_TOKEN,
          locateFile,
        });
        if (cancelled) {
          player.destroy?.();
          return;
        }
        playerRef.current = player;

        setStatus("Loading modules…");
        const moduleUrls = MODULE_IDS.map((id) => `${MODULES_BASE}/${id}.zip`);
        await player.addModule(...moduleUrls.map((u: string) => new sdk.Module(u)));

        setStatus("Applying effect…");
        const effectZip = await buildBaseEffectZip();
        await player.applyEffect(new sdk.Effect(effectZip));

        if (containerRef.current) {
          sdk.Dom.render(player, containerRef.current);
        }
        player.pause();

        setStatus("Loading lip tone image…");
        const res = await fetch(lipToneImage);
        const blob = await res.blob();
        const file = new File([blob], "lip-tone.webp", { type: blob.type });
        const imageInput = new sdk.Image(file);
        await player.use(imageInput);
        player.play({ pauseOnEmpty: false });

        // Apply current settings
        applySettings(hex, finish, opacity);
        setStatus("Ready");
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError(e?.message || String(e));
          setStatus("Error");
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        playerRef.current?.pause?.();
        playerRef.current?.destroy?.();
      } catch {
        // ignore
      }
      playerRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lipToneImage]);

  // Re-apply when settings change
  const applySettings = (h: string, f: string, o: number) => {
    const player = playerRef.current;
    if (!player?._effectManager) return;
    try {
      player._effectManager.reloadConfig(JSON.stringify(buildConfig(h, f, o)));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (open) applySettings(hex, finish, opacity);
  }, [hex, finish, opacity, open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[12px] uppercase tracking-widest">
            {lipToneLabel} — Banuba Preview
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Before</p>
            <div className="rounded-xl overflow-hidden border border-border bg-muted aspect-square">
              <img
                src={lipToneImage}
                alt={`${lipToneLabel} before`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
              After (Banuba)
            </p>
            <div
              ref={containerRef}
              className="rounded-xl overflow-hidden border border-border bg-muted aspect-square relative [&_canvas]:!w-full [&_canvas]:!h-full [&_canvas]:!object-cover [&>*]:!w-full [&>*]:!h-full"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2">
          <span>
            Hex <span className="font-mono">{hex}</span> · Finish {finish} · Opacity{" "}
            {opacity.toFixed(2)} (→ Banuba {mapFinish(finish)})
          </span>
          <span className={error ? "text-destructive" : ""}>
            {error ? `Error: ${error}` : status}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BanubaPreviewModal;
