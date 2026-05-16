interface Props {
  lipToneLabel: string;
  lipToneImage: string;
  hex: string;
  finish: string;
  opacity: number;
}

const BanubaInlinePreview = ({ lipToneLabel, lipToneImage, hex, finish, opacity }: Props) => {
  const blend =
    finish === "matte" ? "multiply" : finish === "glossy" ? "overlay" : "multiply";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Before</p>
          <div className="rounded-xl overflow-hidden border border-border bg-muted aspect-square">
            <img
              src={lipToneImage}
              alt={`${lipToneLabel} before`}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">After</p>
          <div className="relative rounded-xl overflow-hidden border border-border bg-muted aspect-square">
            <img
              src={lipToneImage}
              alt={`${lipToneLabel} after`}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: hex,
                opacity,
                mixBlendMode: blend as any,
              }}
            />
            {finish === "glossy" && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(120deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 45%)",
                  mixBlendMode: "screen",
                }}
              />
            )}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Hex <span className="font-mono">{hex}</span> · Finish {finish} · Opacity {opacity.toFixed(2)}
      </p>
    </div>
  );
};

export default BanubaInlinePreview;
