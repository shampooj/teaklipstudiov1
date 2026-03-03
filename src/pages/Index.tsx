import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Download, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AppState = "idle" | "uploading" | "processing" | "done";

const Index = () => {
  const [state, setState] = useState<AppState>("idle");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    setState("uploading");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setOriginalImage(base64);
      setState("processing");

      try {
        const { data, error } = await supabase.functions.invoke("apply-lipstick", {
          body: { imageBase64: base64 },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setResultImage(data.resultImage);
        setState("done");
        toast.success("Lipstick applied!");
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Something went wrong. Please try again.");
        setState("idle");
      }
    };
    reader.readAsDataURL(file);
  }, []);

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
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = "red-lipstick-result.png";
    link.click();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-8 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-5xl md:text-7xl font-bold text-foreground tracking-tight"
        >
          Red <span className="text-primary italic">Lip</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-3 text-muted-foreground font-sans text-lg"
        >
          Upload your photo. Get the perfect red lip.
        </motion.p>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
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
                    <img
                      src={originalImage}
                      alt="Your photo"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-primary/20 animate-pulse" />
                  </div>
                )}
                <div className="flex flex-col items-center gap-3">
                  <div className="h-1.5 w-48 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-primary via-accent to-primary rounded-full animate-shimmer bg-[length:200%_100%]" />
                  </div>
                  <p className="text-muted-foreground font-sans flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Applying the perfect red lip...
                  </p>
                </div>
              </motion.div>
            )}

            {state === "done" && resultImage && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-8"
              >
                {/* Before / After */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-sans text-muted-foreground uppercase tracking-widest">
                      Before
                    </span>
                    <div className="rounded-2xl overflow-hidden shadow-lg border border-border">
                      <img
                        src={originalImage!}
                        alt="Before"
                        className="w-full aspect-square object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-sans text-primary uppercase tracking-widest font-semibold">
                      After
                    </span>
                    <div className="rounded-2xl overflow-hidden shadow-lg border border-primary/30 animate-pulse-glow">
                      <img
                        src={resultImage}
                        alt="With red lipstick"
                        className="w-full aspect-square object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <Button
                    onClick={downloadResult}
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-sans gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    onClick={reset}
                    size="lg"
                    variant="outline"
                    className="font-sans gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Try Another
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
