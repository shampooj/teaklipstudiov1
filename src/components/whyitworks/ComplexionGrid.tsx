import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getComplexionType } from "@/data/lipstickRecommendations";
import { LIP_TONES, SKIN } from "./tones";

interface Props {
  quizHref: string;
  quizTarget?: string;
}

// The quiz's own taxonomy as a grid: 5 skin tones across, 10 lip tones down,
// 50 complexions. Tap a cell to see its number and the pairing it stands for.
const ComplexionGrid = ({ quizHref, quizTarget }: Props) => {
  const [picked, setPicked] = useState<{ skin: string; lip: string } | null>(null);
  const skin = picked ? SKIN.find((s) => s.id === picked.skin) : null;
  const lip = picked ? LIP_TONES.find((l) => l.id === picked.lip) : null;
  const n = picked ? getComplexionType(picked.skin, picked.lip) : null;

  return (
    <div className="border border-foreground p-4 lg:p-6">
      <div className="overflow-x-auto">
        <table className="mx-auto border-separate" style={{ borderSpacing: 4 }}>
          <thead>
            <tr>
              <th className="align-bottom pr-2 text-right font-sans font-medium text-[9px] uppercase tracking-normal text-muted-foreground whitespace-nowrap">
                Lip tone ↓ Skin →
              </th>
              {SKIN.map((s) => (
                <th key={s.id} className="pb-1 align-bottom">
                  <div className="flex flex-col items-center gap-1">
                    <span className="w-5 h-5 rounded-full" style={{ backgroundColor: s.hex }} />
                    <span className="font-sans font-medium text-[8px] lg:text-[9px] uppercase tracking-normal text-muted-foreground leading-tight text-center max-w-[60px]">{s.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LIP_TONES.map((l) => (
              <tr key={l.id}>
                <th className="pr-2 text-right align-middle">
                  <span className="inline-flex items-center gap-1.5 justify-end">
                    <span className="font-sans font-medium text-[8px] lg:text-[9px] uppercase tracking-normal text-muted-foreground whitespace-nowrap">{l.label}</span>
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: l.hex }} />
                  </span>
                </th>
                {SKIN.map((s) => {
                  const on = picked?.skin === s.id && picked?.lip === l.id;
                  const dim = picked && !on && picked.skin !== s.id && picked.lip !== l.id;
                  return (
                    <td key={s.id} className="p-0">
                      <button
                        type="button"
                        onClick={() => setPicked(on ? null : { skin: s.id, lip: l.id })}
                        aria-pressed={on}
                        aria-label={`${s.label}, ${l.label} lips, complexion ${getComplexionType(s.id, l.id)}`}
                        className={`block transition-all ${on ? "ring-2 ring-foreground scale-110" : "hover:ring-1 hover:ring-foreground/60"} ${dim ? "opacity-35" : ""}`}
                      >
                        <svg width="34" height="40" viewBox="0 0 34 40" aria-hidden="true">
                          <ellipse cx="17" cy="20" rx="15" ry="19" fill={s.hex} />
                          <path d="M9 26 C11.5 23.5, 15 23, 17 24.5 C19 23, 22.5 23.5, 25 26 C23 29.5, 20 31, 17 31 C14 31, 11 29.5, 9 26 Z" fill={l.hex} />
                        </svg>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 text-center min-h-[64px]">
        {picked && skin && lip && n ? (
          <>
            <p className="font-display text-[18px] leading-[22px] text-foreground">
              Complexion <span className="text-green-700">{n}</span> of 50
            </p>
            <p className="mt-1 font-display text-[12px] leading-[16px] lg:text-[15px] lg:leading-[21px] text-foreground">
              {skin.label} with {lip.label.toLowerCase()} lips. Every one of these squares gets its own tested shade picks.
            </p>
          </>
        ) : (
          <p className="font-display text-[12px] leading-[16px] lg:text-[15px] lg:leading-[21px] text-foreground">
            Five skin tones by ten lip tones is fifty complexions, and the same lipstick reads differently on every one.
            Tap the square that looks most like you.
          </p>
        )}
        <div className="mt-4 flex justify-center">
          <Button asChild className="font-sans font-medium text-[9px] lg:text-[10px] uppercase tracking-normal h-8 lg:h-9 px-5 gap-2 rounded-full border border-foreground bg-foreground text-background hover:bg-background hover:text-foreground">
            <a href={quizHref} target={quizTarget}>
              Find your complexion in the Lip Studio <ArrowRight className="w-3 h-3" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ComplexionGrid;
