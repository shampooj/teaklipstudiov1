import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Download, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppState = "idle" | "uploaded" | "processing" | "done";

const LIPSTICK_LOOKS = [
  { id: "classic-red", label: "Classic Red", description: "Timeless, bold red — think Old Hollywood glamour" },
  { id: "berry-wine", label: "Berry Wine", description: "Deep berry-plum with a luxurious, moody vibe" },
  { id: "nude-rose", label: "Nude Rosé", description: "Soft pinkish-nude for a natural, effortless look" },
  { id: "coral-sunset", label: "Coral Sunset", description: "Warm coral-orange that radiates summer energy" },
] as const;

type LookId = (typeof LIPSTICK_LOOKS)[number]["id"];

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });

const blendLipstickPreservingTeeth = async (originalSrc: string, editedSrc: string) => {
  const [original, edited] = await Promise.all([loadImage(originalSrc), loadImage(editedSrc)]);

  const width = original.naturalWidth || original.width;
  const height = original.naturalHeight || original.height;

  const originalCanvas = document.createElement("canvas");
  originalCanvas.width = width;
  originalCanvas.height = height;
  const originalCtx = originalCanvas.getContext("2d");

  const editedCanvas = document.createElement("canvas");
  editedCanvas.width = width;
  editedCanvas.height = height;
  const editedCtx = editedCanvas.getContext("2d");

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outputCtx = outputCanvas.getContext("2d");

  if (!originalCtx || !editedCtx || !outputCtx) {
    throw new Error("Canvas context unavailable");
  }

  originalCtx.drawImage(original, 0, 0, width, height);
  editedCtx.drawImage(edited, 0, 0, width, height);

  const originalData = originalCtx.getImageData(0, 0, width, height);
  const editedData = editedCtx.getImageData(0, 0, width, height);
  const outputData = outputCtx.createImageData(width, height);

  for (let i = 0; i < originalData.data.length; i += 4) {
    const r0 = originalData.data[i];
    const g0 = originalData.data[i + 1];
    const b0 = originalData.data[i + 2];

    const r1 = editedData.data[i];
    const g1 = editedData.data[i + 1];
    const b1 = editedData.data[i + 2];

    const diff = Math.abs(r1 - r0) + Math.abs(g1 - g0) + Math.abs(b1 - b0);

    const max0 = Math.max(r0, g0, b0);
    const min0 = Math.min(r0, g0, b0);
    const saturation0 = max0 === 0 ? 0 : (max0 - min0) / max0;
    const lightness0 = (max0 + min0) / 2;

    const isTeethLike = lightness0 > 165 && saturation0 < 0.2;
    const rednessGain = (r1 - Math.max(g1, b1)) - (r0 - Math.max(g0, b0));
    const warmTintGain = (r1 - b1) - (r0 - b0);
    const isLipTintPixel = diff > 28 && (rednessGain > 8 || warmTintGain > 10);

    if (isLipTintPixel && !isTeethLike) {
      outputData.data[i] = r1;
      outputData.data[i + 1] = g1;
      outputData.data[i + 2] = b1;
      outputData.data[i + 3] = 255;
    } else {
      outputData.data[i] = r0;
      outputData.data[i + 1] = g0;
      outputData.data[i + 2] = b0;
      outputData.data[i + 3] = originalData.data[i + 3];
    }
  }

  outputCtx.putImageData(outputData, 0, 0);
  return outputCanvas.toDataURL("image/png");
};

const Index = () => {
  const [state, setState] = useState<AppState>("idle");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [selectedLook, setSelectedLook] = useState<LookId>("classic-red");

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
      setState("uploaded");
    };
    reader.readAsDataURL(file);
  }, []);

  const applyLipstick = useCallback(async () => {
    if (!originalImage) return;
    setState("processing");

    try {
      const { data, error } = await supabase.functions.invoke("apply-lipstick", {
        body: { imageBase64: originalImage, look: selectedLook },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.resultImage) throw new Error("No edited image returned.");

      let finalImage = data.resultImage as string;
      try {
        finalImage = await blendLipstickPreservingTeeth(originalImage, data.resultImage as string);
      } catch (blendError) {
        console.warn("Blend step failed, using AI output directly:", blendError);
      }

      setResultImage(finalImage);
      setState("done");
      toast.success("Lipstick applied!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong. Please try again.");
      setState("uploaded");
    }
  }, [originalImage, selectedLook]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const reset = () => {
    setState("idle");
    setOriginalImage(null);
    setResultImage(null);
    setSelectedLook("classic-red");
  };

  const tryAnotherLook = () => {
    setState("uploaded");
    setResultImage(null);
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `lipstick-${selectedLook}.png`;
    link.click();
  };

  const currentLookLabel = LIPSTICK_LOOKS.find((l) => l.id === selectedLook)?.label ?? "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-8 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-5xl md:text-7xl font-bold text-foreground tracking-tight"
        >
          Lip <span className="text-primary italic">Studio</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-3 text-muted-foreground font-sans text-lg"
        >
          Upload your photo. Pick a look. See the magic.
        </motion.p>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {/* Step 1: Upload */}
            {state === "idle" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <label
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="group relative block cursor-pointer rounded-2xl border-2 border-dashed border-primary/30 bg-card p-16 text-center transition-all duration-300 hover:border-primary/60 hover:bg-primary/5"
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleInputChange}
                  />
                  <div className="flex flex-col items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-5 transition-colors group-hover:bg-primary/20">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-display text-2xl font-semibold text-foreground">
                        Drop your photo here
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        or click to browse · JPG, PNG up to 10MB
                      </p>
                    </div>
                  </div>
                </label>
              </motion.div>
            )}

            {/* Step 2: Pick a look */}
            {state === "uploaded" && originalImage && (
              <motion.div
                key="pick-look"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-8"
              >
                <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-xl border border-border">
                  <img
                    src={originalImage}
                    alt="Your photo"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="w-full max-w-sm flex flex-col gap-4">
                  <label className="font-display text-lg font-semibold text-foreground text-center">
                    Choose your lipstick look
                  </label>
                  <Select value={selectedLook} onValueChange={(v) => setSelectedLook(v as LookId)}>
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder="Select a look" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIPSTICK_LOOKS.map((look) => (
                        <SelectItem key={look.id} value={look.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{look.label}</span>
                            <span className="text-xs text-muted-foreground">{look.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-3 justify-center pt-2">
                    <Button
                      onClick={applyLipstick}
                      size="lg"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-sans gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Apply Look
                    </Button>
                    <Button onClick={reset} size="lg" variant="outline" className="font-sans gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Start Over
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Processing */}
            {state === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-8 py-12"
              >
                {originalImage && (
                  <div className="relative w-64 h-64 rounded-2xl overflow-hidden shadow-xl">
                    <img src={originalImage} alt="Your photo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-primary/20 animate-pulse" />
                  </div>
                )}
                <div className="flex flex-col items-center gap-3">
                  <div className="h-1.5 w-48 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-primary via-accent to-primary rounded-full animate-shimmer bg-[length:200%_100%]" />
                  </div>
                  <p className="text-muted-foreground font-sans flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Applying {currentLookLabel}...
                  </p>
                </div>
              </motion.div>
            )}

            {/* Result */}
            {state === "done" && resultImage && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-sans text-muted-foreground uppercase tracking-widest">Before</span>
                    <div className="rounded-2xl overflow-hidden shadow-lg border border-border">
                      <img src={originalImage!} alt="Before" className="w-full aspect-square object-cover" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-sans text-primary uppercase tracking-widest font-semibold">
                      {currentLookLabel}
                    </span>
                    <div className="rounded-2xl overflow-hidden shadow-lg border border-primary/30 animate-pulse-glow">
                      <img src={resultImage} alt={`With ${currentLookLabel}`} className="w-full aspect-square object-cover" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 justify-center">
                  <Button onClick={downloadResult} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-sans gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button onClick={tryAnotherLook} size="lg" variant="outline" className="font-sans gap-2">
                    <Sparkles className="h-4 w-4" />
                    Try Another Look
                  </Button>
                  <Button onClick={reset} size="lg" variant="outline" className="font-sans gap-2">
                    <RotateCcw className="h-4 w-4" />
                    New Photo
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Index;
