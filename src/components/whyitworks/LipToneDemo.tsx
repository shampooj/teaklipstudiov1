import { useState } from "react";
import FaceOval from "./FaceOval";
import { DEMO_SHADES, LIP_TONES, SKIN, wornLip } from "./tones";

// Lipstick is translucent: what you see is the shade blended with the
// natural lip underneath. Pick a lip tone and a shade; the second face
// shows the color that actually lands.
// One fixed translucency for the demo: roughly a demi-satin's coverage.
const COVERAGE = 0.7;

const LIP_PATH =
  "M2 30 C14 16, 34 12, 50 20 C66 12, 86 16, 98 30 C86 48, 66 58, 50 58 C34 58, 14 48, 2 30 Z";

// The layering itself: natural lip underneath, lipstick on top at
// `coverage` opacity, slid sideways by `offset` (1 = fully off, 0 = worn).
// Where they overlap the browser paints exactly the worn colour.
const LipLayers = ({
  natural,
  lipstick,
  coverage,
  offset,
  onOffset,
}: {
  natural: string;
  lipstick: string;
  coverage: number;
  offset: number;
  onOffset: (v: number) => void;
}) => {
  const dx = 70 * offset;
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <svg viewBox="-4 0 180 70" className="w-full max-w-[300px]" role="img" aria-label="A translucent lipstick layer sliding over a natural lip">
        <g transform="translate(6 4)">
          <path d={LIP_PATH} fill={natural} />
          <path d={LIP_PATH} fill={lipstick} fillOpacity={coverage} transform={`translate(${dx} 0)`} />
          <path d={LIP_PATH} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
          <path d={LIP_PATH} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" transform={`translate(${dx} 0)`} />
        </g>
      </svg>
      <div className="flex items-center justify-between w-full max-w-[300px] font-sans font-medium text-[9px] uppercase tracking-normal text-muted-foreground">
        <span>Natural lip</span>
        <span>{Math.round(coverage * 100)}% opaque lipstick</span>
      </div>
      <label className="w-full max-w-[300px] flex flex-col items-center gap-1">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={1 - offset}
          onChange={(e) => onOffset(1 - Number(e.target.value))}
          aria-label="Slide the lipstick onto the lip"
          className="w-full accent-foreground"
        />
        <span className="font-sans font-medium text-[9px] uppercase tracking-normal text-muted-foreground">Slide the lipstick on</span>
      </label>
    </div>
  );
};

const LipToneDemo = () => {
  const [tone, setTone] = useState<(typeof LIP_TONES)[number]>(LIP_TONES[1]);
  const [shade, setShade] = useState(DEMO_SHADES[2]);
  const [offset, setOffset] = useState(0.55);
  const skin = SKIN[1].hex;
  const worn = wornLip(shade.hex, tone.hex, COVERAGE);

  return (
    <div className="border border-foreground p-4 lg:p-6">
      <div className="space-y-4">
        <div>
          <p className="font-sans font-medium text-[9px] lg:text-[10px] uppercase tracking-normal text-muted-foreground mb-2">Your natural lip tone</p>
          <div className="flex flex-wrap gap-2">
            {LIP_TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTone(t)}
                aria-pressed={tone.id === t.id}
                title={t.label}
                className={`flex items-center gap-1.5 border px-2 py-1 transition-colors ${
                  tone.id === t.id ? "border-foreground" : "border-border hover:border-foreground/60"
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: t.hex }} />
                <span className="font-sans font-medium text-[9px] uppercase tracking-normal text-foreground">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div>
            <p className="font-sans font-medium text-[9px] lg:text-[10px] uppercase tracking-normal text-muted-foreground mb-2">Lipstick</p>
            <div className="flex gap-3">
              {DEMO_SHADES.map((s) => (
                <button key={s.name} type="button" onClick={() => setShade(s)} aria-pressed={shade.name === s.name} className="flex flex-col items-center gap-1 group">
                  <span
                    className={`w-6 h-6 rounded-full border-2 transition-all ${shade.name === s.name ? "border-foreground scale-110" : "border-transparent group-hover:border-muted-foreground"}`}
                    style={{ backgroundColor: s.hex }}
                  />
                  <span className="font-sans font-medium text-[9px] uppercase tracking-normal text-muted-foreground">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] gap-4 items-center">
        <FaceOval skin={skin} lip={tone.hex} size={120} label="Bare lips" sublabel={tone.hex} />
        <div className="col-span-2 sm:col-span-1 order-last sm:order-none">
          <LipLayers natural={tone.hex} lipstick={shade.hex} coverage={COVERAGE} offset={offset} onOffset={setOffset} />
        </div>
        <FaceOval skin={skin} lip={worn} size={120} label={`With ${shade.name}`} sublabel={worn} />
      </div>

      <p className="mt-5 text-center font-display text-[12px] leading-[16px] lg:text-[15px] lg:leading-[21px] text-foreground">
        {shade.name} in the tube is <span className="font-mono">{shade.hex}</span>. Worn over{" "}
        {tone.label.toLowerCase()} lips it lands as <span className="font-mono">{worn}</span>. Change the
        lip tone and the same shade lands somewhere else.
      </p>
    </div>
  );
};

export default LipToneDemo;
