import { useEffect, useRef, useState } from "react";
import { zipSync, strToU8 } from "fflate";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  lipToneLabel: string;
  lipToneImage: string;
  hex: string;
  finish: string;
  opacity: number;
}

const SDK_BASE = "/banuba";
const MODULE_IDS = ["face_tracker", "face_attributes", "eyes", "lips", "skin", "makeup"];

// Map admin finish values to Banuba finish values
const FINISH_MAP: Record<string, string> = {
  matte: "matte_cream",
  satin: "satin",
  glossy: "shine",
};

function buildConfig(color: string, finish: string, coverage: number) {
  return {
    version: "2.0.0",
    scene: "beauty_demo",
    camera: {},
    faces: [
      {
        makeup_base: { mode: "quality", smooth: "0 0" },
        makeup_lipstick: {
          color,
          finish: FINISH_MAP[finish] ?? "satin",
          coverage,
        },
      },
    ],
  };
}

function buildEffectZip(color: string, finish: string, coverage: number) {
  const archive = zipSync({
    "config.json": strToU8(JSON.stringify(buildConfig(color, finish, coverage), null, 2)),
  });
  return new Blob([archive.buffer as ArrayBuffer], { type: "application/zip" });
}


const BanubaInlinePreview = ({ lipToneLabel, lipToneImage, hex, finish, opacity }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const sdkRef = useRef<any>(null);
  const imageFileRef = useRef<File | null>(null);
  const readyRef = useRef(false);
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
          locateFile: (fileName: string) => `${SDK_BASE}/${fileName}`,
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
        await player.applyEffect(new Effect(effectZip));

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
        setStatus("Live preview");
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

  // Re-apply effect (with fresh config baked in) when controls change
  useEffect(() => {
    const p = playerRef.current;
    const sdk = sdkRef.current;
    const file = imageFileRef.current;
    if (!p || !sdk || !file || !readyRef.current) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const zip = buildEffectZip(hex, finish, opacity);
        p.pause();
        await p.applyEffect(new sdk.Effect(zip));
        if (cancelled) return;
        // Re-feed the image so the player has a frame to render with the new effect
        await p.use(new sdk.Image(file));
        p.play({ pauseOnEmpty: false });
      } catch (e) {
        console.error(e);
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
            />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
            After (Banuba)
          </p>
          <div
            ref={containerRef}
            className="rounded-xl overflow-hidden border border-border bg-muted w-full max-w-[560px] aspect-square mx-auto"
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
