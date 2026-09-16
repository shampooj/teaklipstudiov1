import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import goodPhotoExample from "@/assets/photo-examples/web/good-photo-example.jpg";
import badPhotoExample from "@/assets/photo-examples/web/bad-photo-example.jpg";

// Shown once per visit, the first time the quiz-taker reaches for the camera
// or the file picker: what a try-on selfie should look like, and what it
// shouldn't. "Got it!" is the click that then opens the picker, so the
// file input still opens from a user gesture (iOS requires that).

const EXAMPLES = [
  { src: goodPhotoExample, ok: true, tag: "Use a photo like this", caption: "Daytime window light, evenly lit" },
  { src: badPhotoExample, ok: false, tag: "Not like this", caption: "Indoor lamp light, shadows across the face, warm color cast" },
];

interface Props {
  open: boolean;
  embedded: boolean;
  onGotIt: () => void;
  onDismiss: () => void;
}

const PhotoTipsDialog = ({ open, embedded, onGotIt, onDismiss }: Props) => (
  <Dialog open={open} onOpenChange={(o) => { if (!o) onDismiss(); }}>
    <DialogContent
      className={`max-w-md rounded-none sm:rounded-none border border-foreground bg-background overflow-y-auto ${
        embedded ? "top-6 translate-y-0 max-h-[560px]" : "max-h-[85vh]"
      }`}
    >
      <DialogHeader>
        <DialogTitle className="font-display font-normal text-[18px] leading-[18px] text-left tracking-normal">
          Quick tip for an accurate try-on
        </DialogTitle>
      </DialogHeader>
      <p className="font-display text-[12px] leading-[15px] text-foreground">
        The lipstick colors render most accurately on a photo taken in daytime window light.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {EXAMPLES.map((ex) => (
          <figure key={ex.tag}>
            <div className={`relative aspect-[3/4] overflow-hidden border ${ex.ok ? "border-foreground" : "border-foreground/30"}`}>
              <img src={ex.src} alt={ex.caption} className={`w-full h-full object-cover ${ex.ok ? "" : "grayscale-[35%]"}`} />
              <span className={`absolute top-2 left-2 px-2 py-0.5 font-sans font-medium text-[9px] uppercase tracking-normal ${ex.ok ? "bg-foreground text-background" : "bg-background/90 text-foreground"}`}>
                {ex.tag}
              </span>
            </div>
            <figcaption className="mt-1.5 font-display text-[12px] leading-[15px] text-foreground text-center">{ex.caption}</figcaption>
          </figure>
        ))}
      </div>
      <div className="flex justify-center pt-1">
        <Button
          type="button"
          onClick={onGotIt}
          size="lg"
          className="font-sans font-medium text-[9px] uppercase h-8 tracking-normal gap-2 rounded-full bg-foreground text-background border border-foreground hover:bg-background hover:text-foreground">
          Got it!
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default PhotoTipsDialog;
