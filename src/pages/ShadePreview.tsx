import { useEffect, useRef, useState } from "react";
import { zipSync, strToU8 } from "fflate";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const BANUBA_TOKEN =
  "Qk5CIDCAu9die9bWDPxjBsDtmyi8ISOuFtz9pR+EiD4bdDnvOH/f4zuqRixTG+SOo4u3ZqQ1UB4qoUnYqeAht/yunk/Ec9rM81q48/zcczj9QLl1hj9+tl7o20rgGHcQ6JGklP3sinbGzZ5gQkHCa4Q7RLl7vDAXnam1v+LkLjDfMJ+ZP+7B5WX687rFCnWdICcOK8eUw1hIsm8afEQ/hFx3n3g01Fsa8m9XbmQ1Q8wtP4hsT9nzu3S7LSWnpWecWvDk4XZaVSESX/2TCfdDaafZMgeiH8gASe3rp8hH2cKvHZGbjYgMeG9l/POpWD3EYxBLNCrXpCYTrIR5B27XQUm5b5JEBgnSoIpygibYkeEbU49q7zvj3zb4ihg4UJRMgDefrW+LjXdQeYXTFA==";

const SDK_BASE = "/banuba";
const MODULE_IDS = ["face_tracker", "face_attributes", "eyes", "lips", "skin", "makeup"];

type Finish = "matte_cream" | "satin" | "shine" | "balm" | "shimmer";
const FINISH_OPTIONS: Finish[] = ["matte_cream", "satin", "shine", "balm", "shimmer"];

function buildConfig(color: string, finish: Finish, coverage: number) {
  return {
    version: "2.0.0",
    scene: "beauty_demo",
    camera: {},
    faces: [
      {
        makeup_base: { mode: "quality", smooth: "0 0" },
        makeup_lipstick: { color, finish, coverage },
      },
    ],
  };
}

function buildBaseEffectZip() {
  const baseCfg = {
    version: "2.0.0",
    scene: "beauty_demo",
    camera: {},
    faces: [{}],
  };
  const archive = zipSync({
    "config.json": strToU8(JSON.stringify(baseCfg, null, 2)),
  });
  return new Blob([archive.buffer as ArrayBuffer], { type: "application/zip" });
}

const ShadePreview = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("Initializing…");
  const [ready, setReady] = useState(false);
  const [color, setColor] = useState("#b91c1c");
  const [finish, setFinish] = useState<Finish>("satin");
  const [coverage, setCoverage] = useState(0.8);

  useEffect(() => {
    let cancelled = false;
    let player: any;

    (async () => {
      try {
        setStatus("Loading SDK…");
        const sdk: any = await import(
          /* @vite-ignore */ `${SDK_BASE}/BanubaSDK.browser.esm.js`
        );
        if (cancelled) return;

        const { Player, Module, Effect, Dom } = sdk;

        setStatus("Creating player…");
        player = await Player.create({
          clientToken: BANUBA_TOKEN,
          locateFile: (fileName: string) => `${SDK_BASE}/${fileName}`,
          logger: console,
        });
        if (cancelled) {
          await player.destroy();
          return;
        }
        playerRef.current = player;

        setStatus("Loading modules…");
        await player.addModule(
          ...MODULE_IDS.map((id) => new Module(`${SDK_BASE}/modules/${id}.zip`)),
        );

        setStatus("Applying base effect…");
        const effectZip = buildBaseEffectZip();
        await player.applyEffect(new Effect(effectZip));

        if (containerRef.current) Dom.render(player, containerRef.current);
        player.pause();

        setReady(true);
        setStatus("Choose camera or upload an image.");
      } catch (e: any) {
        console.error(e);
        setStatus(`Error: ${e?.message || String(e)}`);
      }
    })();

    return () => {
      cancelled = true;
      if (playerRef.current) {
        playerRef.current.destroy().catch(() => {});
        playerRef.current = null;
      }
    };
  }, []);

  // Re-apply config when controls change
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !ready) return;
    const t = window.setTimeout(() => {
      try {
        p._effectManager?.reloadConfig(
          JSON.stringify(buildConfig(color, finish, coverage)),
        );
      } catch (e) {
        console.error(e);
      }
    }, 100);
    return () => window.clearTimeout(t);
  }, [color, finish, coverage, ready]);

  const useCamera = async () => {
    const p = playerRef.current;
    if (!p) return;
    try {
      setStatus("Starting camera…");
      const sdk: any = await import(
        /* @vite-ignore */ `${SDK_BASE}/BanubaSDK.browser.esm.js`
      );
      const cam = new sdk.Webcam();
      await cam.start();
      p.pause();
      await p.use(cam);
      p.play({ pauseOnEmpty: false });
      setStatus("Camera live.");
    } catch (e: any) {
      console.error(e);
      setStatus(`Camera error: ${e?.message || String(e)}`);
    }
  };

  const onImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const p = playerRef.current;
    if (!file || !p) return;
    try {
      setStatus("Loading image…");
      const sdk: any = await import(
        /* @vite-ignore */ `${SDK_BASE}/BanubaSDK.browser.esm.js`
      );
      p.pause();
      await p.use(new sdk.Image(file));
      p.play({ pauseOnEmpty: false });
      setStatus("Image loaded.");
    } catch (err: any) {
      console.error(err);
      setStatus(`Image error: ${err?.message || String(err)}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-display">Shade Preview</h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Banuba lipstick render — self-hosted SDK
          </p>
        </header>

        <div className="grid md:grid-cols-[1fr_280px] gap-6">
          <div
            ref={containerRef}
            className="aspect-square w-full bg-muted rounded-2xl overflow-hidden border border-border"
          />

          <aside className="space-y-4 border border-border rounded-2xl p-5">
            <p className="text-[10px] text-muted-foreground">{status}</p>

            <div className="space-y-2">
              <Button
                onClick={useCamera}
                disabled={!ready}
                className="w-full rounded-full text-[10px]"
              >
                Use camera
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={!ready}
                className="w-full rounded-full text-[10px]"
              >
                Upload image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onImage}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-widest text-muted-foreground">
                Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-12 rounded border border-border bg-transparent"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 text-[10px]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-widest text-muted-foreground">
                Finish
              </label>
              <Select value={finish} onValueChange={(v) => setFinish(v as Finish)}>
                <SelectTrigger className="h-8 text-[10px] rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINISH_OPTIONS.map((f) => (
                    <SelectItem key={f} value={f} className="text-[10px]">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-widest text-muted-foreground">
                Coverage {coverage.toFixed(2)}
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={coverage}
                onChange={(e) => setCoverage(Number(e.target.value))}
                className="w-full accent-foreground"
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ShadePreview;
