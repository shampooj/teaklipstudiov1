import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BANUBA_SDK_BASE, locateBanubaFile } from "@/lib/banubaAssets";
import { buildEffectZip, type ShineSpec } from "@/lib/banubaEffect";

interface Props {
  lipToneLabel: string;
  lipToneImage: string;
  hex: string;
  finish: string;
  opacity: number;
  gloss?: number;
  shine?: ShineSpec | null;
  scale?: number;
}

const SDK_BASE = BANUBA_SDK_BASE;
const MODULE_IDS = ["face_tracker", "lips", "skin", "makeup"];

async function cropImageFile(file: File, scale: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas context not available"));
        return;
      }
      const cropWidth = img.width / scale;
      const cropHeight = img.height / scale;
      const sx = (img.width - cropWidth) / 2;
      const sy = (img.height - cropHeight) / 2;
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      ctx.drawImage(img, sx, sy, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }
          resolve(new File([blob], file.name, { type: file.type || "image/png" }));
        },
        file.type || "image/png",
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for crop"));
    };
    img.src = url;
  });
}




const BanubaInlinePreview = ({ lipToneLabel, lipToneImage, hex, finish, opacity, gloss = 0, shine = null, scale = 1 }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const sdkRef = useRef<any>(null);
  const imageFileRef = useRef<File | null>(null);
  const activeEffectRef = useRef<any>(null);
  const readyRef = useRef(false);
  const updateSeqRef = useRef(0);
  const faceDetectedRef = useRef(false);
  const frameCountRef = useRef(0);
  const croppedUrlRef = useRef<string | null>(null);
  const [status, setStatus] = useState("Initializing Banuba…");
  const [ready, setReady] = useState(false);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);


  // Init player + load the lip tone image once
  useEffect(() => {
    let cancelled = false;
    let player: any;

    (async () => {
      try {
        setStatus("Fetching token…");
        const { data: tokenData, error: tokenErr } = await supabase.functions.invoke(
          "get-banuba-token",
        );
        if (tokenErr || !tokenData?.token) {
          throw new Error(tokenErr?.message || "Failed to load Banuba token");
        }
        const clientToken = tokenData.token as string;

        setStatus("Loading SDK…");
        const sdk: any = await import(/* @vite-ignore */ `${SDK_BASE}/BanubaSDK.browser.esm.js`);
        if (cancelled) return;
        sdkRef.current = sdk;

        const { Player, Module, Effect, Dom, Image: BanubaImage } = sdk;

        setStatus("Creating player…");
        player = await Player.create({
          clientToken,
          locateFile: locateBanubaFile,
        });
        if (cancelled) {
          await player.destroy();
          return;
        }
        playerRef.current = player;

        setStatus("Loading modules…");
        await player.addModule(
          ...MODULE_IDS.map((id: string) => new Module(`${SDK_BASE}/modules/${id}.zip`)),
        );

        setStatus("Applying effect…");
        const effectZip = buildEffectZip({ hex, finish, opacity, gloss, shine });
        const initialEffect = new Effect(effectZip);
        await player.applyEffect(initialEffect);
        activeEffectRef.current = initialEffect;

        player.addEventListener(Player.FRAME_DATA_EVENT, ({ detail: frameData }: any) => {
          frameCountRef.current += 1;
          const hasFace = Boolean(frameData?.get?.("frxRecognitionResult.faces.0.hasFace"));
          faceDetectedRef.current = hasFace;
          if (!hasFace && frameCountRef.current === 12) {
            setStatus("Live preview · No lips detected in this crop");
          }
        });

        setStatus("Loading image…");
        const res = await fetch(lipToneImage);
        const blob = await res.blob();
        const file = new File([blob], "lip.png", { type: blob.type || "image/png" });
        const processedFile = scale > 1 ? await cropImageFile(file, scale) : file;
        const processedUrl = URL.createObjectURL(processedFile);
        if (croppedUrlRef.current) URL.revokeObjectURL(croppedUrlRef.current);
        croppedUrlRef.current = processedUrl;
        setCroppedImageUrl(processedUrl);
        imageFileRef.current = processedFile;
        await player.use(new BanubaImage(processedFile));
        player.play({ pauseOnEmpty: false });
        // Attach the renderer only after the player has an input: rendering an
        // input-less player rejects with "Cannot destructure property 'frame'".
        if (containerRef.current) Dom.render(player, containerRef.current);


        readyRef.current = true;
        setReady(true);
        setStatus(faceDetectedRef.current ? "Live preview" : "Live preview · Detecting lips…");
      } catch (e: any) {
        console.error(e);
        setStatus(`Error: ${e?.message || String(e)}`);
      }
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      if (croppedUrlRef.current) {
        URL.revokeObjectURL(croppedUrlRef.current);
        croppedUrlRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.destroy().catch(() => {});
        playerRef.current = null;
      }
    };
  }, [lipToneImage, scale]);

  // Re-apply a freshly built Banuba effect when controls change.
  // SDK 1.18.x does not expose a public reloadConfig API on the player/effect manager,
  // so mutating the private manager was a no-op. Applying a new Effect is the stable path.
  useEffect(() => {
    const p = playerRef.current;
    const sdk = sdkRef.current;
    const file = imageFileRef.current;
    if (!p || !sdk || !file || !readyRef.current) return;
    let cancelled = false;
    const seq = updateSeqRef.current + 1;
    updateSeqRef.current = seq;
    const t = window.setTimeout(async () => {
      try {
        setStatus("Updating preview…");
        const nextEffect = new sdk.Effect(buildEffectZip({ hex, finish, opacity, gloss, shine }));
        await p.applyEffect(nextEffect);
        activeEffectRef.current = nextEffect;
        if (cancelled || updateSeqRef.current !== seq) return;
        await p.use(new sdk.Image(file));
        if (cancelled || updateSeqRef.current !== seq) return;
        p.play({ pauseOnEmpty: false });
        if (!cancelled && updateSeqRef.current === seq) {
          setStatus(faceDetectedRef.current ? "Live preview" : "Live preview · No lips detected in this crop");
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setStatus("Preview update failed");
      }
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex, finish, opacity, gloss, shine ? JSON.stringify(shine) : null, ready]);



  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Before</p>
          <div className="rounded-xl overflow-hidden border border-border bg-muted w-full max-w-[560px] aspect-square mx-auto">
            <img
              src={croppedImageUrl ?? lipToneImage}
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
            className="relative rounded-xl overflow-hidden border border-border bg-muted w-full max-w-[560px] aspect-square mx-auto [&>canvas]:relative [&>canvas]:z-0 [&>canvas]:w-full [&>canvas]:h-full"
          />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {status} · Hex <span className="font-mono">{hex}</span> · Finish {finish} · Opacity{" "}
        {opacity.toFixed(2)} · Gloss {gloss.toFixed(2)}
        {shine && shine.intensity > 0 ? ` · Shine ${shine.intensity.toFixed(2)} / scale ${shine.scale.toFixed(2)}` : ""}
      </p>
    </div>
  );
};

export default BanubaInlinePreview;
