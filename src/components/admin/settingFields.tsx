import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";

// Labelled controls shared by the shade-setting editors (Shade Settings tab,
// Try-On Studio).

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block space-y-1">
    <span className="block text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
    {children}
  </label>
);

export const SliderField = ({
  label,
  value,
  onChange,
  max = 1,
  step = 0.05,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
  step?: number;
  disabled?: boolean;
}) => (
  <Field label={label}>
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 min-w-0 accent-foreground disabled:opacity-40"
      />
      <Input
        type="number"
        min={0}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-7 w-16 shrink-0 text-[10px] rounded-md"
      />
    </div>
  </Field>
);
