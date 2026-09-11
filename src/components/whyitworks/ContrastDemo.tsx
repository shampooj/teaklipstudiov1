import { useState } from "react";
import FaceOval from "./FaceOval";
import { DEMO_SHADES, skinAt, skinLabelAt } from "./tones";

// Simultaneous contrast: the SAME lipstick hex on two faces whose skin the
// visitor controls. The lips never change; the perception does.
const ContrastDemo = () => {
  const [shade, setShade] = useState(DEMO_SHADES[0]);
  const [left, setLeft] = useState(0.05);
  const [right, setRight] = useState(0.95);

  const Slider = ({ value, onChange, name }: { value: number; onChange: (v: number) => void; name: string }) => (
    <label className="flex flex-col items-center gap-1 w-full max-w-[180px]">
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${name} skin tone`}
        className="w-full accent-foreground"
      />
      <span className="font-sans font-medium text-[9px] uppercase tracking-normal text-muted-foreground">{skinLabelAt(value)}</span>
    </label>
  );

  return (
    <div className="border border-foreground p-4 lg:p-6">
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <span className="font-sans font-medium text-[9px] lg:text-[10px] uppercase tracking-normal text-muted-foreground">Lipstick</span>
        {DEMO_SHADES.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => setShade(s)}
            aria-label={`Use ${s.name}`}
            aria-pressed={shade.name === s.name}
            className="flex flex-col items-center gap-1 group"
          >
            <span
              className={`w-6 h-6 rounded-full border-2 transition-all ${shade.name === s.name ? "border-foreground scale-110" : "border-transparent group-hover:border-muted-foreground"}`}
              style={{ backgroundColor: s.hex }}
            />
            <span className="font-sans font-medium text-[9px] uppercase tracking-normal text-muted-foreground">{s.name}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 items-start">
        <div className="flex flex-col items-center gap-3">
          <FaceOval skin={skinAt(left)} lip={shade.hex} />
          <Slider value={left} onChange={setLeft} name="Left face" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <FaceOval skin={skinAt(right)} lip={shade.hex} />
          <Slider value={right} onChange={setRight} name="Right face" />
        </div>
      </div>

      <p className="mt-5 text-center font-display text-[12px] leading-[16px] lg:text-[15px] lg:leading-[21px] text-foreground">
        Both pairs of lips are exactly <span className="font-mono">{shade.hex}</span>. Slide either face
        across the skin tones and watch the same lipstick warm up, cool down, or fade.
      </p>
    </div>
  );
};

export default ContrastDemo;
