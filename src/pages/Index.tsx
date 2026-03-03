import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import teakLogo from "@/assets/teak-logo.png";

type AppState = "idle" | "uploaded" | "processing" | "done";

const LIPSTICK_LOOKS = [
  { id: "classic-red", label: "Color Study Demi-Satin in Jiya", description: "Timeless, bold red — think Old Hollywood glamour" },
  { id: "berry-wine", label: "Sheer Lipstick Balm in Neha", description: "Deep berry-plum with a luxurious, moody vibe" },
  { id: "nude-rose", label: "Nude Rosé", description: "Soft pinkish-nude for a natural, effortless look" },
  { id: "coral-sunset", label: "Soft Matte Lipstick in Riya", description: "Warm terracotta-brick matte with a 90s supermodel vibe" },
] as const;

type LookId = (typeof LIPSTICK_LOOKS)[number]["id"];

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });

const blendLipstickPreservingTeeth = async (originalSrc: string, editedSrc: string, look: LookId) => {
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

  const blendOpacity = look === "berry-wine" ? 0.64 : 1;

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
      outputData.data[i] = Math.round(r0 + (r1 - r0) * blendOpacity);
      outputData.data[i + 1] = Math.round(g0 + (g1 - g0) * blendOpacity);
      outputData.data[i + 2] = Math.round(b0 + (b1 - b0) * blendOpacity);
      outputData.data[i + 3] = originalData.data[i + 3];
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
        finalImage = await blendLipstickPreservingTeeth(originalImage, data.resultImage as string, selectedLook);
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
      <header className="py-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <img src={teakLogo} alt="TEAK" className="h-10 md:h-12 mx-auto" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-muted-foreground font-sans text-[9px] uppercase"
        >
          Virtual Lip Studio
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
                  className="group relative block cursor-pointer border border-border bg-background p-16 text-center transition-all duration-300 hover:border-foreground/40"
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleInputChange}
                  />
                  <div className="flex flex-col items-center gap-6">
                    <Upload className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <div>
                      <p className="font-display text-xl text-foreground">
                        Drop your photo here
                      </p>
                      <p className="mt-2 text-muted-foreground font-sans text-[9px] uppercase">
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
                <div className="w-48 h-48 overflow-hidden border border-border">
                  <img
                    src={originalImage}
                    alt="Your photo"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="w-full max-w-sm flex flex-col gap-5">
                  <label className="font-sans text-[9px] text-muted-foreground text-center uppercase">
                    Choose your lipstick look
                  </label>
                  <Select value={selectedLook} onValueChange={(v) => setSelectedLook(v as LookId)}>
                    <SelectTrigger className="w-full font-sans text-[9px] uppercase border-foreground/20">
                      <SelectValue placeholder="Select a look" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIPSTICK_LOOKS.map((look) => (
                        <SelectItem key={look.id} value={look.id}>
                          <div className="flex flex-col">
                            <span className="font-display text-sm">{look.label}</span>
                            <span className="font-sans text-[9px] text-muted-foreground">{look.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-3 justify-center pt-2">
                    <Button
                      onClick={applyLipstick}
                      size="lg"
                      className="bg-foreground text-background hover:bg-foreground/85 font-sans text-[9px] uppercase gap-2 px-8"
                    >
                      Apply Look
                    </Button>
                    <Button onClick={reset} size="lg" variant="outline" className="font-sans text-[9px] uppercase gap-2 border-foreground/20 hover:bg-foreground/5">
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
                  <div className="relative w-64 h-64 overflow-hidden border border-border">
                    <img src={originalImage} alt="Your photo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-foreground/10 animate-pulse" />
                  </div>
                )}
                <div className="flex flex-col items-center gap-3">
                  <div className="h-px w-48 bg-border overflow-hidden">
                    <div className="h-full w-full bg-foreground/40 animate-shimmer bg-[length:200%_100%]" />
                  </div>
                  <p className="text-muted-foreground font-display text-sm">
                    Applying {currentLookLabel}…
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
                  <div className="flex flex-col items-center gap-3">
                    <span className="font-sans text-[9px] text-muted-foreground uppercase">Before</span>
                    <div className="overflow-hidden border border-border">
                      <img src={originalImage!} alt="Before" className="w-full aspect-square object-cover" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <span className="font-sans text-[9px] text-foreground uppercase">
                      {currentLookLabel}
                    </span>
                    <div className="overflow-hidden border border-foreground/30">
                      <img src={resultImage} alt={`With ${currentLookLabel}`} className="w-full aspect-square object-cover" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 justify-center">
                  <Button onClick={downloadResult} size="lg" className="bg-foreground text-background hover:bg-foreground/85 font-sans text-[9px] uppercase gap-2 px-8">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button onClick={tryAnotherLook} size="lg" variant="outline" className="font-sans text-[9px] uppercase gap-2 border-foreground/20 hover:bg-foreground/5">
                    Try Another Look
                  </Button>
                  <Button onClick={reset} size="lg" variant="outline" className="font-sans text-[9px] uppercase gap-2 border-foreground/20 hover:bg-foreground/5">
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
