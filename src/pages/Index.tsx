import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import teakLogo from "@/assets/teak-logo.png";

type AppState = "idle" | "uploaded" | "processing" | "done";

const LIPSTICK_LOOKS = [
  { id: "classic-red", label: "Color Study Demi-Satin in Jiya", description: "Timeless, bold red — think Old Hollywood glamour", color: "#b91c1c", variantId: "45733638373529" },
  { id: "berry-wine", label: "Sheer Lipstick Balm in Neha", description: "Deep berry-plum with a luxurious, moody vibe", color: "#7c2d4b", variantId: "45733508546713" },
  { id: "nude-rose", label: "Color Study Demi-Satin in Amira", description: "Soft mauve-brown nude with a natural demi-satin finish", color: "#b5837a", variantId: "45733638209689" },
  { id: "coral-sunset", label: "Soft Matte Lipstick in Riya", description: "Warm terracotta-brown matte with a 90s supermodel vibe", color: "#a0522d", variantId: "45733638275225" },
  { id: "deep-terracotta", label: "Color Study Demi-Satin in Amrit", description: "Deep rich terracotta-brick with chocolate undertones", color: "#8b4533", variantId: "45733638340761" },
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
  const pixelCount = width * height;

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

  const isNeha = look === "berry-wine";
  const baseBlendOpacity = isNeha ? 0.64 : 1;

  // Pass 1: build a strict lip-candidate mask from strong, lipstick-like color deltas only.
  const candidateMask = new Uint8Array(pixelCount);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = y * width + x;
      const i = pixelIndex * 4;

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

      const rednessGain = (r1 - Math.max(g1, b1)) - (r0 - Math.max(g0, b0));
      const warmTintGain = (r1 - b1) - (r0 - b0);
      const darkeningAmount = (r0 + g0 + b0) - (r1 + g1 + b1);

      const isTeethLike = lightness0 > 170 && saturation0 < 0.20;
      const strongLipShift =
        diff > 25 &&
        (rednessGain > 8 || warmTintGain > 10 || darkeningAmount > 25 || diff > 50);

      // Keep mask restricted to likely mouth region to avoid face-wide drift.
      const inMouthBand = y > height * 0.30 && y < height * 0.88 && x > width * 0.10 && x < width * 0.90;

      if (!isTeethLike && strongLipShift && inMouthBand) {
        candidateMask[pixelIndex] = 1;
      }
    }
  }

  // Pass 2: connected components -> keep only the most lip-like component(s).
  const visited = new Uint8Array(pixelCount);
  const components: Array<{ indices: number[]; area: number; cx: number; cy: number; score: number }> = [];

  const tryVisit = (from: number, to: number, queue: number[]) => {
    if (to < 0 || to >= pixelCount) return;
    if (visited[to] || !candidateMask[to]) return;

    const fromX = from % width;
    const toX = to % width;
    if (Math.abs(fromX - toX) > 1) return; // prevent row wrapping

    visited[to] = 1;
    queue.push(to);
  };

  for (let idx = 0; idx < pixelCount; idx++) {
    if (!candidateMask[idx] || visited[idx]) continue;

    const queue = [idx];
    visited[idx] = 1;

    const indices: number[] = [];
    let sumX = 0;
    let sumY = 0;

    for (let q = 0; q < queue.length; q++) {
      const cur = queue[q];
      indices.push(cur);

      const x = cur % width;
      const y = Math.floor(cur / width);
      sumX += x;
      sumY += y;

      tryVisit(cur, cur - 1, queue);
      tryVisit(cur, cur + 1, queue);
      tryVisit(cur, cur - width, queue);
      tryVisit(cur, cur + width, queue);
    }

    const area = indices.length;
    const areaRatio = area / pixelCount;
    if (areaRatio < 0.00005 || areaRatio > 0.08) continue;

    const cx = sumX / area;
    const cy = sumY / area;

    const centerXAffinity = 1 - Math.min(1, Math.abs(cx / width - 0.5) / 0.5);
    const centerYAffinity = 1 - Math.min(1, Math.abs(cy / height - 0.62) / 0.62);
    const score = area * (0.65 * centerXAffinity + 0.35 * centerYAffinity);

    components.push({ indices, area, cx, cy, score });
  }

  components.sort((a, b) => b.score - a.score);

  // If we cannot isolate lips, return the AI output directly rather than the original.
  if (components.length === 0) {
    return editedSrc;
  }

  const finalMask = new Uint8Array(pixelCount);
  const primary = components[0];
  for (const idx of primary.indices) finalMask[idx] = 1;

  // Often upper/lower lip can split into two nearby components; merge a valid secondary cluster.
  const secondary = components[1];
  if (
    secondary &&
    secondary.area > primary.area * 0.15 &&
    Math.abs(secondary.cx - primary.cx) < width * 0.2 &&
    Math.abs(secondary.cy - primary.cy) < height * 0.14
  ) {
    for (const idx of secondary.indices) finalMask[idx] = 1;
  }

  // Optional tiny dilation, but only into already lipstick-like candidate pixels.
  for (let idx = 0; idx < pixelCount; idx++) {
    if (!finalMask[idx]) continue;
    const x = idx % width;
    const y = Math.floor(idx / width);

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const nIdx = ny * width + nx;
        if (candidateMask[nIdx]) finalMask[nIdx] = 1;
      }
    }
  }

  // Pass 3: blend only inside final lip mask; every other pixel remains byte-for-byte original.
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex++) {
    const i = pixelIndex * 4;

    const r0 = originalData.data[i];
    const g0 = originalData.data[i + 1];
    const b0 = originalData.data[i + 2];

    if (!finalMask[pixelIndex]) {
      outputData.data[i] = r0;
      outputData.data[i + 1] = g0;
      outputData.data[i + 2] = b0;
      outputData.data[i + 3] = originalData.data[i + 3];
      continue;
    }

    const r1 = editedData.data[i];
    const g1 = editedData.data[i + 1];
    const b1 = editedData.data[i + 2];

    const max0 = Math.max(r0, g0, b0);
    const min0 = Math.min(r0, g0, b0);
    const saturation0 = max0 === 0 ? 0 : (max0 - min0) / max0;
    const lightness0 = (max0 + min0) / 2;

    let blendOpacity = baseBlendOpacity;

    if (look === "nude-rose") {
      const isDarkerLip = lightness0 < 140;
      const isBrowny = (r0 - b0) > 20 && saturation0 > 0.15;
      if (isDarkerLip && isBrowny) {
        const darkFactor = Math.max(0, (140 - lightness0) / 100);
        blendOpacity = Math.max(0.45, 1 - darkFactor * 0.55);
      } else if (isDarkerLip) {
        blendOpacity = 0.72;
      }
    }

    if (look === "deep-terracotta") {
      const isDarkerLip = lightness0 < 140;
      const isBrowny = (r0 - b0) > 15 && saturation0 > 0.12;
      if (isDarkerLip && isBrowny) {
        const darkFactor = Math.min(1, Math.max(0, (140 - lightness0) / 100));
        const purpleShift = darkFactor * 0.35;
        outputData.data[i] = Math.round(r0 + (r1 - r0) * blendOpacity * (1 - purpleShift * 0.3));
        outputData.data[i + 1] = Math.round(g0 + (g1 - g0) * blendOpacity * (1 - purpleShift * 0.2));
        outputData.data[i + 2] = Math.round(Math.min(255, b0 + (b1 - b0) * blendOpacity + purpleShift * 18));
        outputData.data[i + 3] = originalData.data[i + 3];
        continue;
      }
    }

    let finalR = Math.round(r0 + (r1 - r0) * blendOpacity);
    let finalG = Math.round(g0 + (g1 - g0) * blendOpacity);
    let finalB = Math.round(b0 + (b1 - b0) * blendOpacity);

    // De-shine pass for matte looks (Jiya / classic-red): suppress specular highlights
    if (look === "classic-red") {
      const maxC = Math.max(finalR, finalG, finalB);
      const minC = Math.min(finalR, finalG, finalB);
      const lum = (maxC + minC) / 2;
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;

      // Detect specular highlight: high luminance + low saturation = white shine
      if (lum > 170 && sat < 0.35) {
        // Pull luminance down aggressively to kill the shine
        const targetLum = 140;
        const factor = targetLum / Math.max(lum, 1);
        finalR = Math.round(Math.min(255, finalR * factor));
        finalG = Math.round(Math.min(255, finalG * factor));
        finalB = Math.round(Math.min(255, finalB * factor));
      } else if (lum > 150 && sat < 0.45) {
        // Mild shine — reduce partially
        const targetLum = 145;
        const factor = targetLum / Math.max(lum, 1);
        finalR = Math.round(Math.min(255, finalR * factor));
        finalG = Math.round(Math.min(255, finalG * factor));
        finalB = Math.round(Math.min(255, finalB * factor));
      }
    }

    // Rosy-pink boost for Neha on brown/darker lips: push toward pink, away from muddy brown
    if (isNeha) {
      const avgOrig = (r0 + g0 + b0) / 3;
      const pinkness = (r0 + b0) / 2 - g0;
      const isBrownish = r0 > b0 + 15 && avgOrig < 160;
      const isDarkBrown = isBrownish && avgOrig < 110 && pinkness < 15;

      if (isDarkBrown) {
        // Very dark brown lips with no pink — go opaque with strong rosy-pink overlay
        const darkness = Math.min(1, Math.max(0, (110 - avgOrig) / 80));
        const opaqueStrength = 0.45 + darkness * 0.25;
        const targetR = 175;
        const targetG = 80;
        const targetB = 110;
        finalR = Math.round(finalR + (targetR - finalR) * opaqueStrength);
        finalG = Math.round(finalG + (targetG - finalG) * opaqueStrength);
        finalB = Math.round(finalB + (targetB - finalB) * opaqueStrength);
      } else if (isBrownish) {
        const boostStrength = Math.min(1, Math.max(0, (160 - avgOrig) / 120)) * 0.35;
        finalR = Math.round(Math.min(255, finalR + boostStrength * 28));
        finalG = Math.round(Math.max(0, finalG - boostStrength * 8));
        finalB = Math.round(Math.min(255, finalB + boostStrength * 12));
      }
    }

    outputData.data[i] = finalR;
    outputData.data[i + 1] = finalG;
    outputData.data[i + 2] = finalB;
    outputData.data[i + 3] = originalData.data[i + 3];
  }

  outputCtx.putImageData(outputData, 0, 0);
  return outputCanvas.toDataURL("image/png");
};

const Index = () => {
  const [state, setState] = useState<AppState>("idle");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [selectedLook, setSelectedLook] = useState<LookId>("classic-red");
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const startProgress = useCallback(() => {
    setProgress(0);
    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 8;
      });
    }, 500);
  }, []);

  const stopProgress = useCallback(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = null;
    setProgress(100);
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image must be under 15MB");
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
    startProgress();

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
      stopProgress();
      setState("done");
      toast.success("Lipstick applied!");
    } catch (err: any) {
      console.error(err);
      stopProgress();
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
          className="mt-4 text-foreground font-display text-lg tracking-wide"
        >
          Virtual Lip Studio
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-2 text-foreground font-sans text-sm max-w-md mx-auto"
        >
          BETA
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
                        Drop your selfie here
                      </p>
                      <p className="mt-2 text-muted-foreground font-sans text-[9px] uppercase">
                        or click to browse · JPG, PNG up to 15MB
                      </p>
                      <p className="mt-3 text-muted-foreground font-sans text-[10px]">
                        Please make sure you aren't wearing a white t-shirt in the photo, as it confuses the technology.
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
                <div className="w-64 h-64 overflow-hidden">
                  <img
                    src={originalImage}
                    alt="Your photo"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="w-full max-w-sm flex flex-col gap-5">
                   <label className="font-display text-lg text-foreground text-center">
                     Choose your lipstick look
                   </label>
                  <Select value={selectedLook} onValueChange={(v) => setSelectedLook(v as LookId)}>
                    <SelectTrigger className="w-full font-sans text-[9px] border-foreground/20 text-left">
                      <SelectValue placeholder="Select a look" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIPSTICK_LOOKS.map((look) => (
                        <SelectItem key={look.id} value={look.id}>
                          <div className="flex items-start gap-2.5">
                            <span
                              className="mt-1 h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: look.color }}
                            />
                            <div className="flex flex-col">
                              <span className="font-display text-sm">{look.label}</span>
                              <span className="font-sans text-[9px] text-muted-foreground">{look.description}</span>
                            </div>
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
                  <div className="relative w-64 h-64 overflow-hidden">
                    <img src={originalImage} alt="Your photo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-foreground/10 animate-pulse" />
                  </div>
                )}
                <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                  <Progress value={progress} className="h-2 w-full" />
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
                    <span className="font-sans text-[9px] text-foreground uppercase">Before</span>
                    <div className="w-64 h-64 overflow-hidden">
                      <img src={originalImage!} alt="Before" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <span className="font-sans text-[9px] text-foreground uppercase">
                      {currentLookLabel}
                    </span>
                    <div className="w-64 h-64 overflow-hidden">
                      <img src={resultImage} alt={`With ${currentLookLabel}`} className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
                  <Select value="" onValueChange={(v) => {
                    if (!v) return;
                    setSelectedLook(v as LookId);
                    setResultImage(null);
                    setState("uploaded");
                  }}>
                    <SelectTrigger className="w-full font-sans text-[9px] border-foreground/20 text-left">
                      <SelectValue placeholder="Try another look" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIPSTICK_LOOKS.map((look) => (
                        <SelectItem key={look.id} value={look.id}>
                          <div className="flex items-start gap-2.5">
                            <span
                              className="mt-1 h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: look.color }}
                            />
                            <div className="flex flex-col">
                              <span className="font-display text-sm">{look.label}</span>
                              <span className="font-sans text-[9px] text-muted-foreground">{look.description}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

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
