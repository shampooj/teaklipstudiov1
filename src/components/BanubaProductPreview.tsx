import { useEffect, useRef, useState } from "react";
import { zipSync, strToU8 } from "fflate";
import { supabase } from "@/integrations/supabase/client";
import { BANUBA_SDK_BASE, locateBanubaFile } from "@/lib/banubaAssets";

interface Props {
  imageUrl: string;
  hex: string;
  finish: string;
  opacity: number;
  alt?: string;
  className?: string;
  onReady?: () => void;
}

const SDK_BASE = BANUBA_SDK_BASE;
const MODULE_IDS = ["face_tracker", "lips", "skin", "makeup"];

const FINISH_MAP: Record<string, string> = {
  matte: "matte_cream",
  satin: "satin",
  glossy: "shine",
};

function hexToRgbString(hex: string) {
  const normalized = hex.trim().replace(/^#/, "");
  const value = normalized.length === 3
    ? normalized.split("").map((c) => `${c}${c}`).join("")
    : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return "0 0 0";
  const channels = [0, 2, 4].map((s) => parseInt(value.slice(s, s + 2), 16) / 255);
  return channels.map((c) => Number(c.toFixed(4))).join(" ");
}

function buildEffectZip(color: string, finish: string, coverage: number) {
  const config = {
    scene: "teak-lipstick-preview",
    version: "2.0.0",
    camera: {},
    faces: [
      {
        makeup_lipstick: {
          color: hexToRgbString(color),
          finish: FINISH_MAP[finish] ?? "satin",
          coverage,
        },
      },
    ],
  };
  const archive = zipSync({ "config.json": strToU8(JSON.stringify(config)) });
  const bytes = new Uint8Array(archive);
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/zip" });
}

const BanubaProductPreview = ({ imageUrl, hex, finish, opacity, alt, className, onReady }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const sdkRef = useRef<any>(null);
  const imageFileRef = useRef<File | null>(null);
  const readyRef = useRef(false);
  const updateSeqRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [failed, setFailed] = useState(false);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (rendered && onReady && !notifiedRef.current) {
      notifiedRef.current = true;
      onReady();
    }
  }, [rendered]);

  useEffect(() => {
    let cancelled = false;
    let player: any;
    let timeoutId: number | null = null;

    // Poll the canvas until it has rendered a visible frame.
    const startTime = Date.now();
    const RENDER_TIMEOUT_MS = 20_000;
    const POLL_INTERVAL_MS = 250;
    const checkCanvas = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > RENDER_TIMEOUT_MS) return;

      const canvas = containerRef.current?.querySelector("canvas");
      if (canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0) {
        try {
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            const imageData = ctx.getImageData(
              Math.floor(canvas.width / 2),
              Math.floor(canvas.height / 2),
              1,
              1,
            ).data;
            if (imageData[3] > 0) {
              if (!cancelled) setRendered(true);
              return;
            }
          }
        } catch {
          // ignore canvas read errors
        }

        // Fallback for WebGL canvases: read the center pixel directly.
        try {
          const gl =
            (canvas.getContext("webgl2") as WebGL2RenderingContext | null) ||
            (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
            (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
          if (gl) {
            const pixels = new Uint8Array(4);
            gl.readPixels(
              Math.floor(canvas.width / 2),
              canvas.height - 1 - Math.floor(canvas.height / 2),
              1,
              1,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              pixels,
            );
            if (pixels[3] > 0) {
              if (!cancelled) setRendered(true);
              return;
            }
          }
        } catch {
          // ignore WebGL read errors
        }
      }
      if (!cancelled) timeoutId = window.setTimeout(checkCanvas, POLL_INTERVAL_MS);
    };

    (async () => {
      try {
        const { data: tokenData, error: tokenErr } = await supabase.functions.invoke(
          "get-banuba-token",
        );
        if (tokenErr || !tokenData?.token) throw new Error("token");

        const sdk: any = await import(/* @vite-ignore */ `${SDK_BASE}/BanubaSDK.browser.esm.js`);
        if (cancelled) return;
        sdkRef.current = sdk;

        const { Player, Module, Effect, Dom, Image: BanubaImage } = sdk;
        player = await Player.create({
          clientToken: tokenData.token,
          locateFile: locateBanubaFile,
        });
        if (cancelled) {
          await player.destroy();
          return;
        }
        playerRef.current = player;

        await player.addModule(
          ...MODULE_IDS.map((id: string) => new Module(`${SDK_BASE}/modules/${id}.zip`)),
        );

        const effect = new Effect(buildEffectZip(hex, finish, opacity));
        await player.applyEffect(effect);

        if (containerRef.current) Dom.render(player, containerRef.current);

        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const file = new File([blob], "face.png", { type: blob.type || "image/png" });
        imageFileRef.current = file;
        await player.use(new BanubaImage(file));
        player.play({ pauseOnEmpty: false });

        readyRef.current = true;
        setReady(true);
        timeoutId = window.setTimeout(checkCanvas, 100);
      } catch (e) {
        console.error("BanubaProductPreview init failed", e);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (playerRef.current) {
        playerRef.current.destroy().catch(() => {});
        playerRef.current = null;
      }
    };
  }, [imageUrl]);

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
        const nextEffect = new sdk.Effect(buildEffectZip(hex, finish, opacity));
        await p.applyEffect(nextEffect);
        if (cancelled || updateSeqRef.current !== seq) return;
        await p.use(new sdk.Image(file));
        if (cancelled || updateSeqRef.current !== seq) return;
        p.play({ pauseOnEmpty: false });
      } catch (e) {
        console.error(e);
      }
    }, 100);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [hex, finish, opacity, ready]);

  if (failed) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={className ?? "w-full h-full object-cover"}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full [&>canvas]:relative [&>canvas]:z-0 [&>canvas]:w-full [&>canvas]:h-full [&>canvas]:object-cover ${className ?? ""}`}
      aria-label={alt}
    />
  );
};

export default BanubaProductPreview;
