import { toast } from "sonner";

// Opens the native share sheet with the try-on image when the platform can
// share files (mobile), falling back to a URL share, then to the clipboard.
// Saves the try-on image to the user's device.
export async function downloadLook(imageUrl: string, filename: string) {
  try {
    const blob = await (await fetch(imageUrl)).blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Couldn't download the image — please try again.");
  }
}

export async function shareLook({
  text,
  url,
  imageUrl,
}: {
  text: string;
  url: string;
  imageUrl?: string | null;
}) {
  try {
    if (imageUrl && typeof navigator.canShare === "function") {
      try {
        const blob = await (await fetch(imageUrl)).blob();
        const file = new File([blob], "teak-look.jpg", { type: blob.type || "image/jpeg" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "TEAK Virtual Lip Studio", text });
          return;
        }
      } catch {
        // image unavailable — fall through to URL share
      }
    }
    if (typeof navigator.share === "function") {
      await navigator.share({ title: "TEAK Virtual Lip Studio", text, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied — send it to a friend!");
  } catch {
    // user dismissed the share sheet
  }
}
