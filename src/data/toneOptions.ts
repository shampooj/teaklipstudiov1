// Shared quiz-step options: the skin-tone sample strips and lip-tone rows
// used by both the Virtual Lip Studio quiz and the Brown Skin Archive
// submission flow.
import stSanna from "@/assets/skin_tone/web/skin_tone_sanna.jpg";
import stSaira from "@/assets/skin_tone/web/skin_tone_saira.jpg";
import stArris from "@/assets/skin_tone/web/skin_tone_arris.jpg";
import stHareem from "@/assets/skin_tone/web/skin_tone_hareem.jpg";
import stTerushka from "@/assets/skin_tone/web/skin_tone_terushka.jpg";
import stNoreen from "@/assets/skin_tone/web/skin_tone_noreen.jpg";
import stTanvi from "@/assets/skin_tone/web/skin_tone_tanvi.jpg";
import stAashi from "@/assets/skin_tone/web/skin_tone_aashi.jpg";
import stCynthia from "@/assets/skin_tone/web/skin_tone_cynthia.jpg";
import stAnastasia from "@/assets/skin_tone/web/skin_tone_anastasia.jpg";
import stNero from "@/assets/skin_tone/web/skin_tone_nero.jpg";
import stPritt from "@/assets/skin_tone/web/skin_tone_pritt.jpg";
import stMaseray from "@/assets/skin_tone/web/skin_tone_maseray.jpg";
import stAaliyah from "@/assets/skin_tone/web/skin_tone_aaliyah.jpg";
import stDivya from "@/assets/skin_tone/web/skin_tone_divya.jpg";
import stDoe from "@/assets/skin_tone/web/skin_tone_doe.jpg";
import stCharithra from "@/assets/skin_tone/web/skin_tone_charithra.jpg";
import stGeeta from "@/assets/skin_tone/web/skin_tone_geeta.jpg";
import stApoorva from "@/assets/skin_tone/web/skin_tone_apoorva.jpg";
import stLakshmi from "@/assets/skin_tone/web/skin_tone_lakshmi.jpg";
import ltBeige1 from "@/assets/lip-tone/web/beige-1.jpg";
import ltBeige2 from "@/assets/lip-tone/web/beige-2.jpg";
import ltBeige3 from "@/assets/lip-tone/web/beige-3.jpg";
import ltBeige4 from "@/assets/lip-tone/web/beige-4.jpg";
import ltBrownRose1 from "@/assets/lip-tone/web/brown-rose-1.jpg";
import ltBrownRose2 from "@/assets/lip-tone/web/brown-rose-2.jpg";
import ltBrownRose3 from "@/assets/lip-tone/web/brown-rose-3.jpg";
import ltBrownRose4 from "@/assets/lip-tone/web/brown-rose-4.jpg";
import ltChestnut1 from "@/assets/lip-tone/web/chestnut-1.jpg";
import ltChestnut2 from "@/assets/lip-tone/web/chestnut-2.jpg";
import ltChestnut3 from "@/assets/lip-tone/web/chestnut-3.jpg";
import ltChestnut4 from "@/assets/lip-tone/web/chestnut-4.jpg";
import ltDeepBrownRose1 from "@/assets/lip-tone/web/deep-brown-rose-1.jpg";
import ltDeepBrownRose2 from "@/assets/lip-tone/web/deep-brown-rose-2.jpg";
import ltDeepBrownRose3 from "@/assets/lip-tone/web/deep-brown-rose-3.jpg";
import ltDeepBrownRose4 from "@/assets/lip-tone/web/deep-brown-rose-4.jpg";
import ltGreyRose1 from "@/assets/lip-tone/web/grey-rose-1.jpg";
import ltGreyRose2 from "@/assets/lip-tone/web/grey-rose-2.jpg";
import ltGreyRose3 from "@/assets/lip-tone/web/grey-rose-3.jpg";
import ltGreyRose4 from "@/assets/lip-tone/web/grey-rose-4.jpg";
import ltMauve1 from "@/assets/lip-tone/web/mauve-1.jpg";
import ltMauve2 from "@/assets/lip-tone/web/mauve-2.jpg";
import ltMauve3 from "@/assets/lip-tone/web/mauve-3.jpg";
import ltMauve4 from "@/assets/lip-tone/web/mauve-4.jpg";
import ltMostlyDeepBrown1 from "@/assets/lip-tone/web/mostly-deep-brown-1.jpg";
import ltMostlyDeepBrown2 from "@/assets/lip-tone/web/mostly-deep-brown-2.jpg";
import ltMostlyDeepBrown3 from "@/assets/lip-tone/web/mostly-deep-brown-3.jpg";
import ltMostlyDeepBrown4 from "@/assets/lip-tone/web/mostly-deep-brown-4.jpg";
import ltMostlyPurple1 from "@/assets/lip-tone/web/mostly-purple-1.jpg";
import ltMostlyPurple2 from "@/assets/lip-tone/web/mostly-purple-2.jpg";
import ltMostlyPurple3 from "@/assets/lip-tone/web/mostly-purple-3.jpg";
import ltMostlyPurple4 from "@/assets/lip-tone/web/mostly-purple-4.jpg";
import ltMostlyLightBrown1 from "@/assets/lip-tone/web/mostly-light-brown-1.jpg";
import ltMostlyLightBrown2 from "@/assets/lip-tone/web/mostly-light-brown-2.jpg";
import ltMostlyLightBrown3 from "@/assets/lip-tone/web/mostly-light-brown-3.jpg";
import ltMostlyLightBrown4 from "@/assets/lip-tone/web/mostly-light-brown-4.jpg";
import ltMostlyPink1 from "@/assets/lip-tone/web/mostly-pink-1.jpg";
import ltMostlyPink2 from "@/assets/lip-tone/web/mostly-pink-2.jpg";
import ltMostlyPink3 from "@/assets/lip-tone/web/mostly-pink-3.jpg";
import ltMostlyPink4 from "@/assets/lip-tone/web/mostly-pink-4.jpg";

export const SKIN_TONES = [
  { id: "light-brown", label: "Light Brown", color: "#C68642", samples: [stSanna, stSaira, stArris, stHareem] },
  { id: "medium-brown", label: "Medium Brown", color: "#8D5524", samples: [stTerushka, stNoreen, stTanvi, stAashi] },
  { id: "deep-brown", label: "Deep Brown", color: "#5C3317", samples: [stCynthia, stDoe, stNero, stAnastasia] },
  { id: "rich-brown", label: "Rich Brown", color: "#3B1E08", samples: [stDivya, stAaliyah, stCharithra, stPritt] },
  { id: "full-brown", label: "Full Brown", color: "#2A1505", samples: [stMaseray, stGeeta, stApoorva, stLakshmi] },
] as const;

export const LIP_TONE_ROWS = [
  { id: "mostly-pink", label: "Mostly Pink", images: [ltMostlyPink1, ltMostlyPink2, ltMostlyPink3, ltMostlyPink4] },
  { id: "beige", label: "Beige", images: [ltBeige1, ltBeige2, ltBeige3, ltBeige4] },
  { id: "chestnut", label: "Chestnut", images: [ltChestnut1, ltChestnut2, ltChestnut3, ltChestnut4] },
  { id: "mauve", label: "Mauve", images: [ltMauve1, ltMauve2, ltMauve3, ltMauve4] },
  { id: "brown-rose", label: "Brown Rose", images: [ltBrownRose1, ltBrownRose2, ltBrownRose3, ltBrownRose4] },
  { id: "grey-rose", label: "Grey Rose", images: [ltGreyRose1, ltGreyRose2, ltGreyRose3, ltGreyRose4] },
  { id: "deep-brown-rose", label: "Deep Brown Rose", images: [ltDeepBrownRose1, ltDeepBrownRose2, ltDeepBrownRose3, ltDeepBrownRose4] },
  { id: "mostly-light-brown", label: "Mostly Light Brown", images: [ltMostlyLightBrown1, ltMostlyLightBrown2, ltMostlyLightBrown3, ltMostlyLightBrown4] },
  { id: "mostly-deep-brown", label: "Mostly Deep Brown", images: [ltMostlyDeepBrown1, ltMostlyDeepBrown2, ltMostlyDeepBrown3, ltMostlyDeepBrown4] },
  { id: "mostly-purple", label: "Mostly Purple", images: [ltMostlyPurple1, ltMostlyPurple2, ltMostlyPurple3, ltMostlyPurple4] },
] as const;
