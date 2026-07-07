import { useEffect, useRef, useState } from "react";
import { zipSync, strToU8 } from "fflate";
import { supabase } from "@/integrations/supabase/client";
import { BANUBA_SDK_BASE, locateBanubaFile } from "@/lib/banubaAssets";

interface Props {
  lipToneLabel: string;
  lipToneImage: string;
  hex: string;
  finish: string;
  opacity: number;
  scale?: number;
}

const SDK_BASE = BANUBA_SDK_BASE;
const MODULE_IDS = ["face_tracker", "lips", "skin", "makeup"];

const FINISH_MAP: Record<string, string> = {
  matte: "matte_cream",
  satin: "satin",
  glossy: "shine",
};

function buildConfig(color: string, finish: string, opacity: number) {
  return {
    scene: "teak-lipstick-preview",
    version: "2.0.0",
    camera: {},
    faces: [
      {
        makeup_lipstick: {
          color: hexToRgbString(color),
          finish: FINISH_MAP[finish] ?? "satin",
          coverage: opacity,
        },
      },
    ],
  };
}


function hexToRgbString(hex: string) {
  const normalized = hex.trim().replace(/^#/, "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(value)) return "0 0 0";

  const channels = [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16) / 255);
  return channels.map((channel) => Number(channel.toFixed(4))).join(" ");
}

function buildEffectZip(color: string, finish: string, coverage: number) {
  const archive = zipSync({
    "config.json": strToU8(JSON.stringify(buildConfig(color, finish, coverage), null, 2)),
  });
  const bytes = new Uint8Array(archive);
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/zip" });
}




const BanubaInlinePreview = ({ lipToneLabel, lipToneImage, hex, finish, opacity, scale = 1 }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const sdkRef = useRef<any>(null);
  const imageFileRef = useRef<File | null>(null);
  const activeEffectRef = useRef<any>(null);
  const readyRef = useRef(false);
  const updateSeqRef = useRef(0);
  const faceDetectedRef = useRef(false);
  const frameCountRef = useRef(0);
  const [status, setStatus] = useState("Initializing Banuba…");
  const [ready, setReady] = useState(false);


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
        const effectZip = buildEffectZip(hex, finish, opacity);
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

        if (containerRef.current) Dom.render(player, containerRef.current);

        setStatus("Loading image…");
        const res = await fetch(lipToneImage);
        const blob = await res.blob();
        const file = new File([blob], "lip.png", { type: blob.type || "image/png" });
        imageFileRef.current = file;
        await player.use(new BanubaImage(file));
        player.play({ pauseOnEmpty: false });


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
      if (playerRef.current) {
        playerRef.current.destroy().catch(() => {});
        playerRef.current = null;
      }
    };
  }, [lipToneImage]);

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
        const nextEffect = new sdk.Effect(buildEffectZip(hex, finish, opacity));
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
  }, [hex, finish, opacity, ready]);



  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Before</p>
          <div className="rounded-xl overflow-hidden border border-border bg-muted w-full max-w-[560px] aspect-square mx-auto">
            <img
              src={lipToneImage}
              alt={`${lipToneLabel} before`}
              className="w-full h-full object-cover"
              style={scale !== 1 ? { transform: `scale(${scale})` } : undefined}
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
            style={scale !== 1 ? { transform: `scale(${scale})` } : undefined}
          />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {status} · Hex <span className="font-mono">{hex}</span> · Finish {finish} · Opacity{" "}
        {opacity.toFixed(2)}
      </p>
    </div>
  );
};

export default BanubaInlinePreview;
