// A minimal face: skin oval with a lip shape. Deliberately abstract so the
// only thing the eye compares is colour.
interface Props {
  skin: string;
  lip: string;
  size?: number;
  label?: string;
  sublabel?: string;
}

const FaceOval = ({ skin, lip, size = 150, label, sublabel }: Props) => (
  <div className="flex flex-col items-center gap-2">
    <svg
      width={size}
      height={Math.round(size * 1.3)}
      viewBox="0 0 100 130"
      role="img"
      aria-label={label ? `${label}: lips ${lip} on skin ${skin}` : `lips ${lip} on skin ${skin}`}
    >
      <ellipse cx="50" cy="65" rx="46" ry="62" fill={skin} />
      {/* eyes as faint dashes keep it a face without adding colour */}
      <path d="M30 52 q6 -3 12 0" stroke="rgba(0,0,0,0.28)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M58 52 q6 -3 12 0" stroke="rgba(0,0,0,0.28)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* lips */}
      <path
        d="M31 88 C36 82, 44 81, 50 84 C56 81, 64 82, 69 88 C64 96, 56 100, 50 100 C44 100, 36 96, 31 88 Z"
        fill={lip}
      />
      <path d="M31 88 C38 88, 44 88, 50 87.5 C56 88, 62 88, 69 88" stroke="rgba(0,0,0,0.22)" strokeWidth="0.8" fill="none" />
    </svg>
    {label && <p className="font-sans font-medium text-[9px] lg:text-[10px] uppercase tracking-normal text-foreground text-center">{label}</p>}
    {sublabel && <p className="font-mono text-[10px] text-muted-foreground -mt-1">{sublabel}</p>}
  </div>
);

export default FaceOval;
