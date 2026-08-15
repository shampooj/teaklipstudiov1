import { toast } from "sonner";

export interface LookBrand {
  logoUrl: string;
  shadeName: string;
  productTitle?: string;
}

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });

// Appends a white bar below the try-on image with the TEAK logo,
// "Virtual Lip Studio", and the shade / product names. All dimensions are
// proportional to the image width so any input size composes consistently.
async function composeBrandedImage(imageUrl: string, brand: LookBrand): Promise<Blob> {
  const [photo, logo] = await Promise.all([loadImg(imageUrl), loadImg(brand.logoUrl)]);
  try {
    await document.fonts.ready;
  } catch {
    // draw with fallback fonts
  }
  const w = photo.naturalWidth || photo.width;
  const h = photo.naturalHeight || photo.height;
  const pad = Math.round(w * 0.05);
  const barH = Math.round(w * 0.19);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h + barH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.drawImage(photo, 0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, h, w, barH);

  // Left block: TEAK logo with "Virtual Lip Studio" beneath, like the app header.
  const logoH = Math.round(w * 0.05);
  const logoW = Math.round(logoH * ((logo.naturalWidth || 1) / (logo.naturalHeight || 1)));
  const topY = h + Math.round(barH * 0.24);
  ctx.drawImage(logo, pad, topY, logoW, logoH);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.font = `${Math.round(w * 0.028)}px "Wolpe Pegasus", serif`;
  ctx.fillText("Virtual Lip Studio", pad, topY + logoH + Math.round(w * 0.018));

  // Right block: shade name with the product line beneath.
  ctx.textAlign = "right";
  ctx.font = `${Math.round(w * 0.042)}px "Wolpe Pegasus", serif`;
  ctx.fillText(brand.shadeName, w - pad, topY);
  if (brand.productTitle) {
    ctx.fillStyle = "#595959";
    ctx.font = `${Math.round(w * 0.026)}px "Wolpe Pegasus", serif`;
    ctx.fillText(brand.productTitle, w - pad, topY + Math.round(w * 0.058));
  }

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.92),
  );
}

async function brandedOrOriginalBlob(imageUrl: string, brand?: LookBrand): Promise<Blob> {
  if (brand) {
    try {
      return await composeBrandedImage(imageUrl, brand);
    } catch {
      // fall back to the unbranded image
    }
  }
  return await (await fetch(imageUrl)).blob();
}

// Saves the try-on image (branded when brand info is given) to the user's device.
export async function downloadLook({
  imageUrl,
  filename,
  brand,
}: {
  imageUrl: string;
  filename: string;
  brand?: LookBrand;
}) {
  try {
    const blob = await brandedOrOriginalBlob(imageUrl, brand);
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

// Opens the native share sheet with the try-on image when the platform can
// share files (mobile), falling back to a URL share, then to the clipboard.
export async function shareLook({
  text,
  url,
  imageUrl,
  brand,
}: {
  text: string;
  url: string;
  imageUrl?: string | null;
  brand?: LookBrand;
}) {
  try {
    if (imageUrl && typeof navigator.canShare === "function") {
      try {
        const blob = await brandedOrOriginalBlob(imageUrl, brand);
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
