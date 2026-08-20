import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import LearnMoreDialog from "@/components/LearnMoreDialog";
import { isMobileDevice } from "@/lib/device";
import { isEmbedded } from "@/lib/cartAdd";
import { useEmbedAutoHeight, postEmbedScrollTop } from "@/hooks/useEmbedAutoHeight";
import { SKIN_TONES, LIP_TONE_ROWS } from "@/data/toneOptions";

// Seed content: Teak's curated lip-tone photography. Community photos join
// this grid later, once the public-display consent flow exists — swap the
// glob for a fetch of the approved/published list at that point.
const PORTRAITS = Object.entries(
  import.meta.glob("@/assets/lip-tone/web/*.jpg", { eager: true, import: "default" }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, src]) => src as string);

type View = "about" | "archive" | "submit";
type SubmitStep = "skin" | "lip" | "upload" | "submitting" | "done";

const NAV: { id: View; label: string }[] = [
  { id: "about", label: "About" },
  { id: "archive", label: "The Archive" },
  { id: "submit", label: "Add to the Archive" },
];

const pillButton =
  "font-sans font-medium text-[9px] uppercase h-8 tracking-normal gap-2 rounded-full border-foreground hover:bg-foreground hover:text-background";

const BrownSkinArchive = () => {
  const [view, setView] = useState<View>("archive");

  // Submission flow: the quiz's skin-tone, lip-tone, and upload steps, minus
  // the try-on — submissions land in the same storage as quiz consent uploads.
  const [step, setStep] = useState<SubmitStep>("skin");
  const [skinTone, setSkinTone] = useState("");
  const [lipTone, setLipTone] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Archive pics must be taken in the moment: camera-only, mobile-only.
  const mobile = useMemo(isMobileDevice, []);

  // Framed on the storefront: report content height so the theme sizes the
  // iframe to fit; ask the parent to scroll up when the view or step changes.
  const embedded = useMemo(isEmbedded, []);
  useEmbedAutoHeight(embedded);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (embedded) postEmbedScrollTop();
  }, [view, step, embedded]);

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
      setPhoto(e.target?.result as string);
      // Every new photo starts with a fresh, unchecked consent
      setConsentChecked(false);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const submit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError(true);
      return;
    }
    setStep("submitting");

    // Fire-and-forget: same pipeline as the quiz's consent upload, tagged so
    // archive submissions are distinguishable in the submissions table.
    const sourceImage = photo!;
    void (async () => {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = sourceImage;
        });

        // Store the original file bytes untouched — research wants full
        // resolution, so no downscaling here. (The AI categorization payload
        // below is still resized to keep the edge-function request small.)
        const blob = await (await fetch(sourceImage)).blob();
        const contentType = blob.type || "image/jpeg";
        const ext = contentType.split("/")[1]?.split("+")[0] || "jpg";
        const imageId = crypto.randomUUID();
        const fileName = `${imageId}.${ext === "jpeg" ? "jpg" : ext}`;

        let imageUrl: string | null = null;
        const { data: uploadData, error: uploadError } = await supabase.storage.from("cart-images").upload(fileName, blob, { contentType });
        if (uploadError) {
          console.error("Failed to upload image:", uploadError);
        } else {
          imageUrl = uploadData.path;
        }

        const { data: submissionId, error: insertError } = await supabase.rpc("insert_customer_submission" as any, {
          p_variant_id: "archive-upload",
          p_image_url: imageUrl,
          p_image_id: imageId,
          p_skin_tone: skinTone,
          p_lip_tone: lipTone,
          p_email: trimmedEmail,
          p_shirt: null,
        });

        if (!insertError) {
          if (submissionId) {
            const c = document.createElement("canvas");
            c.width = Math.min(img.width, 1024);
            c.height = Math.round(img.height * (c.width / img.width));
            const cx = c.getContext("2d")!;
            cx.drawImage(img, 0, 0, c.width, c.height);
            const base64 = c.toDataURL("image/jpeg", 0.7);
            supabase.functions.invoke("categorize-skin-lip", {
              body: { imageBase64: base64, submissionId }
            }).catch((err) => console.error("AI categorization failed:", err));
          }
        } else {
          console.error("Failed to save submission:", insertError);
        }
      } catch (e) {
        console.error("Failed to process archive upload:", e);
      }
    })();

    // The code is emailed via Klaviyo rather than shown on-screen — a real
    // address gets the reward, a mistyped one silently doesn't.
    supabase.functions
      .invoke("send-discount-email", {
        body: { email: trimmedEmail, skinTone, lipTone, source: "archive" },
      })
      .then(({ error }) => {
        if (error) console.error("[discount] email dispatch failed:", error);
      });

    setStep("done");
  };

  const resetFlow = () => {
    setStep("skin");
    setSkinTone("");
    setLipTone("");
    setPhoto(null);
    setConsentChecked(false);
    setEmail("");
    setEmailError(false);
  };

  return (
    <div className="bg-background min-h-screen">
      <main className="mx-auto w-full max-w-5xl px-4 pt-10 pb-16">
        <h1 className="font-display text-[28px] leading-[29px] text-foreground text-center">
          The Brown Skin Archive
        </h1>
        <p className="mt-4 font-display text-[18px] leading-[22px] text-foreground text-center max-w-lg mx-auto">
          A growing archive of real brown skin on real brown humans
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-8">
          <nav className="shrink-0 sm:w-44">
            <ul className="flex sm:flex-col flex-wrap justify-center sm:justify-start gap-x-5 gap-y-3 sm:sticky sm:top-8">
              {NAV.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setView(item.id)}
                    className={`font-sans font-medium text-[10px] uppercase tracking-normal transition-colors ${
                      view === item.id
                        ? "text-foreground underline underline-offset-4"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex-1 min-w-0">
            {view === "archive" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {PORTRAITS.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Natural lip tone ${i + 1}`}
                    loading={i < 8 ? "eager" : "lazy"}
                    className="w-full aspect-[3/2] object-cover"
                  />
                ))}
              </div>
            )}
            {view === "about" && (
              <div className="font-display text-[12px] leading-[16px] text-foreground max-w-md mx-auto flex flex-col gap-3">
                <p>
                  The Brown Skin Archive is Teak's ongoing collection of real
                  brown skin and lip tones on real brown humans. The archive
                  serves as the reference our lip shades are designed against,
                  and as a record and reminder of the natural range of brown
                  skin that exists on the ground today.
                </p>
                <ol className="list-decimal pl-4 flex flex-col gap-3">
                  <li>
                    In a world where cosmetic procedures abound, we wanted to pay
                    homage to the natural beauty that exists within variety: lips
                    of varying shapes, colors, and sizes. We see these lips in
                    our work at Teak every day, and we wanted to remind you, too,
                    of the range.
                  </li>
                  <li>
                    In a world where AI and social media are quickly changing our
                    perception of what is real by feeding back to us images of
                    humans that are misrepresentative, we wanted to start
                    recording hard data on what's out there.
                  </li>
                  <li>
                    Right now, there are a lot of cool digital beauty tools we
                    want to build at Teak using AI that would help us bring our
                    customers even better lip colors and experiences for brown
                    skin. But we're a bit stuck, because a lot of AI just simply
                    doesn't work well for brown skin. This is because its
                    training data doesn't appropriately represent brown skin.
                    Knowing the outsize impact AI has on everyone today, properly
                    representing brown skin within AI models is critical to
                    ensuring a future that is both safe and realistic. We will
                    use this archive to train internal AI models that can help us
                    create better beauty for brown skin (like flattering lipstick
                    colors, and easier to use Virtual Try On for brown skin).
                  </li>
                  <li>
                    When collecting image data, we use thoughtful data labeling
                    approaches that carefully consider self-perception of skin
                    tone, visual color bias, and cultural colorism — important
                    factors that a lot of today's AI services ignore, or simply
                    aren't aware of.
                  </li>
                </ol>
                <p className="font-display text-[18px] leading-[18px] mt-2">
                  How it works:
                </p>
                <p>
                  People who self-identify as brown can voluntarily choose to
                  participate and contribute their photo to the archive. People
                  submit photos by taking a selfie on a mobile phone. We collect
                  image data at the point of capture, and store the image
                  securely in our databases for 3 years, using it for various
                  types of brown skin research (including training our custom AI
                  models for brown skin). After 3 years, we delete the pic
                  forever.
                </p>
                <p>
                  We only display a crop of the lips on the website, so your
                  identity stays private. And whenever someone wants their image
                  deleted, all they have to do is ask, by emailing{" "}
                  <a href="mailto:hello@teakbeauty.com" className="underline">
                    hello@teakbeauty.com
                  </a>
                  .
                </p>
                        <p>
                  The archive of full facial images will never be shared or sold
                  externally as a product, and only select authorized individuals
                  at Teak have access to the data.
                </p>
                <p>
                  As a thank you, we email a 10% off discount code on our
                  products to people who submit.
                </p>
                <p>
                  We know AI can sound scary and there can be a lack of trust
                  towards it, generally. But we really believe that with the
                  right communication, transparency, and systems in place, it can
                  help solve tough problems. We aren't trying to trick anyone
                  here — we simply want to build great products for brown skin,
                  with our community, and for our community.
                </p>
              </div>
            )}
            {view === "submit" && (
              <div className="w-full">
                {step === "skin" && (
                  <div className="text-center w-full">
                    <p className="font-display text-[12px] leading-[16px] text-foreground max-w-md mx-auto mb-8">
                      Want your skin tone represented in the archive? Answer the
                      questions below to submit your pictures.
                    </p>
                    <p className="font-display text-[28px] leading-[29px] text-foreground">
                      What's your general skintone?
                    </p>
                    <div className="mt-8 flex flex-col gap-5 w-full max-w-md mx-auto">
                      {SKIN_TONES.map((tone) => (
                        <button
                          key={tone.id}
                          onClick={() => { setSkinTone(tone.id); setStep("lip"); }}
                          className={`group flex flex-col items-center gap-1.5 transition-all duration-200 overflow-hidden ${
                            skinTone === tone.id ? "ring-2 ring-foreground" : ""
                          }`}
                        >
                          <div className="w-full grid grid-cols-4">
                            {tone.samples.map((src, i) => (
                              <img
                                key={i}
                                src={src}
                                alt={`${tone.label} sample ${i + 1}`}
                                className="w-full aspect-[4/5] object-cover"
                              />
                            ))}
                          </div>
                          <span className="font-sans text-[9px] uppercase text-foreground pb-2">{tone.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === "lip" && (
                  <div className="text-center w-full">
                    <p className="font-display text-[18px] leading-[18px] text-foreground">
                      Take a look in the mirror!
                    </p>
                    <p className="mt-3 font-display text-[28px] leading-[29px] text-foreground">
                      What is your current natural lip tone?
                    </p>
                    <p className="font-display text-[12px] leading-[15px] text-foreground mt-3 max-w-md mx-auto">
                      (Tip: Turn your device brightness up. Feel free to ignore lip shape and focus on the natural colors in your lip skin.)
                    </p>
                    <div className="mt-8 flex flex-col gap-5 w-full max-w-md mx-auto">
                      {LIP_TONE_ROWS.map((tone) => (
                        <button
                          key={tone.id}
                          onClick={() => { setLipTone(tone.id); setStep("upload"); }}
                          className={`group flex flex-col items-center gap-1.5 transition-all duration-200 overflow-hidden ${
                            lipTone === tone.id ? "ring-2 ring-foreground" : ""
                          }`}
                        >
                          <div className="w-full grid grid-cols-4">
                            {tone.images.map((src, i) => (
                              <img key={i} src={src} alt={`${tone.label} sample ${i + 1}`} className="w-full aspect-[3/2] object-cover" />
                            ))}
                          </div>
                          <span className="font-sans text-[9px] uppercase text-foreground pb-2">{tone.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-8 flex gap-3 justify-center">
                      <Button onClick={() => setStep("skin")} size="lg" variant="outline" className={pillButton}>
                        Back
                      </Button>
                    </div>
                  </div>
                )}

                {step === "upload" && (
                  <div className="w-full">
                    {!photo ? (
                      <>
                        <h2 className="font-display text-[28px] leading-[29px] text-foreground text-center mb-6">
                          Take your selfie
                        </h2>
                        {mobile ? (
                          <div className="flex flex-col gap-4 max-w-md mx-auto">
                            <div
                              onClick={() => fileInputRef.current?.click()}
                              className="group relative aspect-[4/5] max-w-[240px] w-full mx-auto flex cursor-pointer border border-foreground bg-background text-center transition-colors hover:border-foreground/60">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="user"
                                className="hidden"
                                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }} />
                              <div className="m-auto flex flex-col items-center gap-2.5 px-4 py-4">
                                <Camera className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                <div>
                                  <p className="font-display text-[18px] leading-[18px] text-foreground">
                                    Take a selfie now!
                                  </p>
                                  <p className="mt-2 font-display text-[12px] leading-[16px] text-foreground">
                                    Opens your camera — best in front of a window
                                  </p>
                                </div>
                              </div>
                            </div>
                            <p className="font-sans font-medium text-[9px] uppercase tracking-normal text-muted-foreground text-center">
                              <button type="button" onClick={() => setLearnMoreOpen(true)} className="underline hover:text-foreground transition-colors uppercase">Learn More</button>
                              {" · "}
                              <a href="https://teakbeauty.com/pages/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Privacy Policy</a>
                            </p>
                          </div>
                        ) : (
                          <p className="font-display text-[12px] leading-[16px] text-foreground max-w-md mx-auto text-center">
                            The archive collects selfies taken in the moment, so
                            submissions happen on a phone. Open this page on your
                            mobile device to take your selfie and add your pic.
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-80 aspect-[3/4] mx-auto overflow-hidden relative">
                          <img src={photo} alt="Your selfie" className="w-full h-full object-cover" />
                        </div>
                        <div className="mt-3 flex items-center justify-center gap-4">
                          <button
                            onClick={() => { setPhoto(null); setConsentChecked(false); }}
                            className="font-sans font-medium text-[9px] uppercase tracking-normal text-foreground underline hover:text-muted-foreground transition-colors">
                            Retake
                          </button>
                        </div>
                      </div>
                    )}

                    {photo && (
                      <div className="mt-6 max-w-md mx-auto">
                        <div className="border border-foreground p-5">
                          <label htmlFor="archive-consent" className="flex items-start gap-4 cursor-pointer select-none">
                            <Checkbox
                              id="archive-consent"
                              checked={consentChecked}
                              onCheckedChange={(checked) => setConsentChecked(checked === true)}
                              className="shrink-0 h-4 w-4 mt-1 rounded-none border border-foreground/40 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground" />
                            <span className="block">
                              <span className="block font-display text-[18px] leading-[18px] text-foreground tracking-normal">
                                Great, add this pic to the archive!
                              </span>
                              <span className="mt-2 block font-display text-[12px] leading-[15px] tracking-normal text-foreground">
                                Teak can save my photo, tone selections, and email to help create better products for brown skin, and use AI to analyze my skin tone (which might suggest ethnicity).
                              </span>
                            </span>
                          </label>
                          <div className="mt-5 ml-8 relative">
                            <input
                              id="archive-email"
                              type="email"
                              aria-label="Enter email for 10% off as a thank you!"
                              value={email}
                              onChange={(e) => { setEmail(e.target.value); setEmailError(false); }}
                              className={`w-full px-0 py-2 bg-transparent border-0 border-b ${emailError ? 'border-destructive' : 'border-foreground/20 focus:border-foreground'} text-foreground font-sans font-medium text-[12px] tracking-normal focus:outline-none transition-colors`} />
                            {!email && (
                              <span aria-hidden="true" className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none font-sans font-medium text-[12px] tracking-normal text-foreground/50 truncate w-full text-left">
                                Enter email for <span className="text-green-700">10% off</span> as a thank you!
                              </span>
                            )}
                            {emailError && <p className="text-destructive text-[9px] font-sans font-medium tracking-normal mt-2">Please enter your email address to receive your discount code.</p>}
                            <p className="font-display text-[12px] leading-[15px] text-muted-foreground mt-2">
                              Double-check your email! It's where your code lands, and how we find your pic if you ever ask us to delete it.
                            </p>
                          </div>
                          <div className="mt-6 flex items-center justify-end gap-3">
                            <button type="button" onClick={() => setLearnMoreOpen(true)} className="font-sans font-medium text-[9px] uppercase tracking-normal text-foreground underline hover:text-muted-foreground transition-colors">
                              Learn More
                            </button>
                            <a href="https://teakbeauty.com/pages/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-sans font-medium text-[9px] uppercase tracking-normal text-foreground underline hover:text-muted-foreground transition-colors">
                              Privacy Policy
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={`mt-8 flex items-center ${photo ? "justify-between" : "justify-center"} max-w-md mx-auto w-full`}>
                      <Button
                        onClick={() => { if (photo) { setPhoto(null); } else { setStep("lip"); } }}
                        size="lg"
                        variant="outline"
                        className={pillButton}>
                        Back
                      </Button>
                      {photo && (
                        <Button
                          onClick={submit}
                          size="lg"
                          variant="outline"
                          disabled={!consentChecked}
                          className={pillButton}>
                          Submit My Pic <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {step === "submitting" && (
                  <div className="flex flex-col items-center gap-8 py-16">
                    {photo && (
                      <div className="relative w-64 h-64 overflow-hidden">
                        <img src={photo} alt="Your photo" className="w-full h-full object-cover animate-pulse" />
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-3">
                      <p className="text-foreground font-display text-[18px] leading-[18px] animate-pulse">
                        Adding your pic to the archive…
                      </p>
                      <p className="text-muted-foreground font-sans font-medium text-[9px] uppercase tracking-normal">
                        This won't take long
                      </p>
                    </div>
                  </div>
                )}

                {step === "done" && (
                  <div className="flex flex-col items-center gap-6 text-center">
                    <p className="font-display text-[28px] leading-[29px] text-foreground">
                      You're in — thank you!
                    </p>
                    <p className="font-display text-[12px] leading-[16px] text-foreground max-w-md">
                      Your pic is on its way into the archive, helping us create
                      better products for brown skin. You can email{" "}
                      <a href="mailto:hello@teakbeauty.com" className="underline">
                        hello@teakbeauty.com
                      </a>{" "}
                      to delete it at any time.
                    </p>
                    <div className="w-full max-w-sm bg-background border-2 border-foreground p-4 text-center">
                      <p className="font-sans font-medium text-[9px] text-muted-foreground uppercase tracking-normal mb-1">Your 10% off code</p>
                      <p className="font-display text-[18px] leading-[22px] text-foreground tracking-normal">
                        On its way to <span className="text-green-700">{email.trim()}</span>
                      </p>
                      <p className="font-sans font-medium text-[9px] text-muted-foreground uppercase tracking-normal mt-1">Give it a few minutes · Check spam if it's hiding</p>
                    </div>
                    <Button
                      onClick={() => { resetFlow(); setView("archive"); }}
                      size="lg"
                      variant="outline"
                      className={pillButton}>
                      View The Archive
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mirrors the nav width so the content column centers on the page,
              in line with the title above. */}
          <div className="hidden sm:block sm:w-44 shrink-0" aria-hidden="true" />
        </div>
      </main>
      <LearnMoreDialog open={learnMoreOpen} onOpenChange={setLearnMoreOpen} />
    </div>
  );
};

export default BrownSkinArchive;
