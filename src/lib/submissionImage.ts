import { supabase } from "@/integrations/supabase/client";

// Admin view of a stored submission photo. Uploads keep the original file
// untouched, so an iPhone library pick is often HEIC, which Chrome and
// Firefox can't display (and the lip crop can't read). Signed URLs also
// expire after an hour. This fetches the photo (re-signing if the link has
// expired), converts HEIC to JPEG in the browser for display only, and
// returns an object URL the caller must revoke. The stored file never
// changes.

// HEIC/HEIF files start with an ISO-BMFF "ftyp" box naming the brand.
const HEIC_BRANDS = ["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1", "mif2"];

const isHeicBlob = async (blob: Blob): Promise<boolean> => {
  const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const text = String.fromCharCode(...head);
  return text.slice(4, 8) === "ftyp" && HEIC_BRANDS.includes(text.slice(8, 12));
};

const fetchStored = async (path: string, signedUrl: string | null): Promise<Blob> => {
  if (signedUrl) {
    const res = await fetch(signedUrl);
    if (res.ok) return res.blob();
  }
  // Missing or expired link: sign a fresh one.
  const { data, error } = await supabase.storage.from("cart-images").createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) throw error ?? new Error("Could not sign image URL");
  const res = await fetch(data.signedUrl);
  if (!res.ok) throw new Error(`Image fetch failed (${res.status})`);
  return res.blob();
};

export const loadSubmissionImage = async (path: string, signedUrl: string | null): Promise<string> => {
  const blob = await fetchStored(path, signedUrl);
  if (!(await isHeicBlob(blob))) return URL.createObjectURL(blob);
  // Only HEIC photos pay for the decoder (~3 MB), loaded on first use.
  const { heicTo } = await import("heic-to");
  const jpeg = await heicTo({ blob, type: "image/jpeg", quality: 0.95 });
  return URL.createObjectURL(jpeg);
};
