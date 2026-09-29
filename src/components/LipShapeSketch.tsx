import { useId } from "react";

// Hand-drawn style lip outlines for the lip shape question (quiz v2). Each
// shape is the same mouth width with a taller or shorter upper and lower lip.
// A slight displacement filter plus a second, offset pass of every stroke
// gives the pencil-sketch wobble.

export type LipShape = "thin" | "medium" | "full";

// label is the front-end name; visitors never see the descriptive name,
// which is for the admin panel.
export const LIP_SHAPES: { id: LipShape; label: string; name: string }[] = [
  { id: "thin", label: "Shape A", name: "Thin" },
  { id: "medium", label: "Shape B", name: "Medium" },
  { id: "full", label: "Shape C", name: "Full" },
];

// Upper and lower lip heights in viewBox units.
const HEIGHTS: Record<LipShape, { upper: number; lower: number }> = {
  thin: { upper: 6, lower: 7 },
  medium: { upper: 11, lower: 14 },
  full: { upper: 17, lower: 24 },
};

const Y = 30; // mouth line

const upperLip = (u: number) => {
  const peak = Y - u;
  const bow = peak + u * 0.3; // cupid's bow dip
  return `M10 ${Y} C 22 ${Y - u * 0.3}, 38 ${peak}, 48 ${peak} C 54 ${peak}, 57 ${bow}, 60 ${bow} C 63 ${bow}, 66 ${peak}, 72 ${peak} C 82 ${peak}, 98 ${Y - u * 0.3}, 110 ${Y}`;
};
const lowerLip = (l: number) =>
  `M110 ${Y} C 100 ${Y + l * 0.8}, 80 ${Y + l}, 60 ${Y + l} C 40 ${Y + l}, 20 ${Y + l * 0.8}, 10 ${Y}`;
const mouthLine = `M10 ${Y} C 30 ${Y + 1.5}, 45 ${Y + 2}, 60 ${Y + 1} C 75 ${Y + 2}, 90 ${Y + 1.5}, 110 ${Y}`;
const highlight = (l: number) => `M50 ${Y + l * 0.55} Q 60 ${Y + l * 0.63} 70 ${Y + l * 0.55}`;

const LipShapeSketch = ({ shape, className }: { shape: LipShape; className?: string }) => {
  const filterId = `sketch-${useId().replace(/:/g, "")}`;
  const { upper, lower } = HEIGHTS[shape];
  const strokes = [upperLip(upper), lowerLip(lower), mouthLine];

  return (
    <svg viewBox="4 9 112 48" className={className} role="img" aria-hidden="true">
      <defs>
        <filter id={filterId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed={upper + lower} />
          <feDisplacementMap in="SourceGraphic" scale="1.8" />
        </filter>
      </defs>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${filterId})`}>
        {strokes.map((d, i) => (
          <path key={i} d={d} strokeWidth={1.5} />
        ))}
        {/* Second, lighter pass slightly off the first, like a re-traced pencil line. */}
        <g transform="translate(0.6 0.5)" opacity={0.45}>
          {strokes.map((d, i) => (
            <path key={i} d={d} strokeWidth={0.9} />
          ))}
        </g>
        <path d={highlight(lower)} strokeWidth={0.9} opacity={0.5} />
      </g>
    </svg>
  );
};

export default LipShapeSketch;
