import { useEffect, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isEmbedded } from "@/lib/cartAdd";
import { useEmbedAutoHeight } from "@/hooks/useEmbedAutoHeight";
import ContrastDemo from "@/components/whyitworks/ContrastDemo";
import LipToneDemo from "@/components/whyitworks/LipToneDemo";
import MultiTonalFace from "@/components/whyitworks/MultiTonalFace";
import ComplexionGrid from "@/components/whyitworks/ComplexionGrid";

// /whyitworks: the colour-theory story behind Teak, rebuilt from
// teakbeauty.com/pages/color-theory as an embeddable page with interactive
// demos in place of the old static diagrams. Framed on the store it reports
// its own height (no inner scroll) and store links escape the iframe with
// target="_top"; standalone it behaves like a normal page.

const CDN = "https://teakbeauty.com/cdn/shop/files";
const STORE = "https://teakbeauty.com";
const cdn = (file: string, width: number) => `${CDN}/${file}?width=${width}`;

const TIKTOKS = [
  {
    views: "21.7M views",
    title: "Lipstick Color Theory Part 4",
    blurb: "Nupoora and her friend Britney try on the same lipstick, only to discover it looks drastically different on each of them.",
    href: "https://www.tiktok.com/@nupoora/video/7215212153379310853",
    image: "Screen_Shot_2023-08-22_at_8.26.49_AM.png",
  },
  {
    views: "9.4M views",
    title: "Lipstick Color Theory Part 2",
    blurb: "Nupoora and her friend Sarah try on the same set of lipsticks, some of them wilder than others.",
    href: "https://www.tiktok.com/@nupoora/video/7145484616185433350",
    image: "Screen_Shot_2023-08-22_at_8.31.23_AM.png",
  },
  {
    views: "2.4M views",
    title: "Lipstick Color Theory Part 1",
    blurb: "The video that started it all: Nupoora and Sarah try on lipsticks together.",
    href: "https://www.tiktok.com/@nupoora/video/7141073223352896795",
    image: "Screen_Shot_2023-08-22_at_8.38.57_AM.png",
  },
];

const PRODUCTS = [
  { name: "Demi-Satin Color Study Lipstick", price: "$28", href: "/products/color-study-lipsticks", image: "Farrah_with_box.png" },
  { name: "Soft Matte Lipstick", price: "$28", href: "/products/soft-matte-lipstick", image: "Screen_Shot_2025-09-17_at_12.07.46.png" },
  { name: "Sheer Lipstick Balm", price: "$28", href: "/products/sheer-lipstick-balm", image: "Neha_Packshot.jpg" },
  { name: "Color Study Lip Sets", price: "$49", href: "/products/holiday-lip-sets", image: "Screen_Shot_2025-10-20_at_09.43.09.png" },
];

const h2 = "font-display text-[18px] leading-[22px] lg:text-[24px] lg:leading-[30px] text-foreground";
const body = "font-display text-[12px] leading-[16px] lg:text-[15px] lg:leading-[21px] text-foreground";
const eyebrow = "font-sans font-medium text-[9px] lg:text-[10px] uppercase tracking-normal text-muted-foreground";
const pill =
  "font-sans font-medium text-[9px] lg:text-[10px] uppercase tracking-normal h-8 lg:h-9 px-5 gap-2 rounded-full border border-foreground";

const Section = ({
  n,
  title,
  children,
  demo,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
  demo: React.ReactNode;
}) => (
  <section className="mt-14 lg:mt-20 border-t border-foreground pt-8 grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 lg:gap-12 items-start">
    <div className="max-w-md">
      <p className={eyebrow}>{n}</p>
      <h2 className={`mt-2 ${h2}`}>{title}</h2>
      <div className={`mt-4 ${body} flex flex-col gap-3`}>{children}</div>
    </div>
    <div className="min-w-0">{demo}</div>
  </section>
);

const WhyItWorks = () => {
  const embedded = useMemo(isEmbedded, []);
  useEmbedAutoHeight(embedded);
  useEffect(() => {
    document.title = "Why It Works · TEAK";
  }, []);
  // Store pages leave the iframe and take the whole tab; the quiz and shop
  // links only make sense as full store pages. Standalone, same-tab is fine.
  const storeTarget = embedded ? "_top" : undefined;
  const quizHref = embedded ? `${STORE}/pages/r-d` : "/";

  return (
    <div className={embedded ? "bg-background" : "bg-background min-h-screen"}>
      <main className="mx-auto w-full max-w-5xl lg:max-w-6xl px-4 pt-10 pb-16">
        {/* Intro */}
        <h1 className="font-display text-[28px] leading-[29px] lg:text-[40px] lg:leading-[42px] text-foreground text-center">
          Why It Works
        </h1>
        <p className="mt-4 font-display text-[18px] leading-[22px] lg:text-[24px] lg:leading-[30px] text-foreground text-center max-w-lg lg:max-w-2xl mx-auto">
          Ever wonder why your friend's lipstick looks great on them but terrible on you?
        </p>
        <p className={`mt-4 ${body} text-center max-w-md lg:max-w-xl mx-auto`}>
          The answer is color theory. It sits at the heart of everything we do at Teak, from
          formulating new lip shades to building the Virtual Lip Studio. The four ideas below are
          the whole story, and each one is something you can try for yourself.
        </p>

        <Section n="01" title="A color is never seen on its own" demo={<ContrastDemo />}>
          <p>
            Color theory's first rule: how we perceive a color depends on the colors around it. A
            lipstick is never seen in isolation. It's seen against the skin beside it, so the same
            tube can read warm on one face and cool on another, bold on one and faded on the next.
          </p>
          <p>
            The two faces in the demo are wearing the identical shade. Move the sliders and the
            lipstick appears to change, even though its color never does.
          </p>
        </Section>

        <Section n="02" title="Your natural lip tone shows through" demo={<LipToneDemo />}>
          <p>
            Lipstick isn't paint. Every formula is at least a little translucent, so the color you
            end up wearing is the shade blended with the lip underneath it. Pink lips push a shade
            one way, purple-brown lips push it another.
          </p>
          <p>
            Brown-skinned lips span a wide range of natural tones, which is why the same shade can
            be a favorite for one person and a miss for another. Pick your lip tone and a shade to
            see where the color actually lands.
          </p>
        </Section>

        <Section n="03" title="Brown complexions are made of many colors" demo={<MultiTonalFace />}>
          <p>
            A brown complexion isn't one color. Skin tone shifts from the forehead to the cheek to the
            jaw, undertones surface around the mouth, and the lips themselves are two colors, top and
            bottom. Together they make a large, varied palette that a lipstick has to work with.
          </p>
          <p>
            That complexity is what makes flattering shades so hard to find by guessing, and it's the
            reason we test every shade on as many real complexions as we can.
          </p>
        </Section>

        <Section n="04" title="So the Lip Studio starts with both" demo={<ComplexionGrid quizHref={quizHref} quizTarget={storeTarget} />}>
          <p>
            Put the first three ideas together and one lipstick behaves differently on every pairing
            of skin tone and lip tone. Five skin tones by ten lip tones is fifty complexions.
          </p>
          <p>
            The Virtual Lip Studio begins by placing you on this grid, and then shows you the top
            recommended colors for your complexion on your own photo. The recommendations are
            personally selected by the founders based on their extensive user testing and expertise
            of brown complexion types, along with their intimate knowledge of each shade and how it
            behaves on different complexions.
          </p>
        </Section>

        {/* TikToks */}
        <section className="mt-14 lg:mt-20 border-t border-foreground pt-8">
          <h2 className={`${h2} text-center`}>See it for yourself</h2>
          <p className={`mt-3 ${body} text-center max-w-md mx-auto`}>
            Our color theory videos have been watched more than 30 million times. Same lipstick, two
            friends, very different results.
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-8">
            {TIKTOKS.map((t) => (
              <a key={t.href} href={t.href} target="_blank" rel="noopener noreferrer" className="group block">
                <div className="relative aspect-[9/16] max-h-[420px] w-full overflow-hidden bg-muted">
                  <img
                    src={cdn(t.image, 600)}
                    alt={t.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <span className="absolute bottom-2 left-2 bg-background/90 px-2 py-0.5 font-sans font-medium text-[9px] uppercase tracking-normal text-foreground">
                    {t.views}
                  </span>
                </div>
                <p className="mt-3 font-display text-[12px] leading-[16px] lg:text-[15px] lg:leading-[21px] text-foreground underline underline-offset-4 decoration-foreground/40 group-hover:decoration-foreground">
                  {t.title}
                </p>
                <p className="mt-1 font-display text-[12px] leading-[16px] text-muted-foreground">{t.blurb}</p>
              </a>
            ))}
          </div>
        </section>

        {/* Products */}
        <section className="mt-14 lg:mt-20 border-t border-foreground pt-8">
          <div className="max-w-xl mx-auto text-center">
            <h2 className={h2}>Lipsticks made for brown complexions</h2>
            <p className={`mt-4 ${body}`}>
              People with brown skin come in an endless number of skin and lip tone combinations. We
              test every shade on as many of them as we can, because we know how much of a difference
              color theory makes on the lips.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {PRODUCTS.map((p) => (
              <a key={p.href} href={`${STORE}${p.href}`} target={storeTarget} className="group block">
                <div className="w-full aspect-[4/5] overflow-hidden bg-white">
                  <img
                    src={cdn(p.image, 700)}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <p className="mt-3 font-display text-[12px] leading-[16px] lg:text-[15px] lg:leading-[21px] text-foreground">{p.name}</p>
                <p className={`mt-1 ${eyebrow}`}>{p.price}</p>
              </a>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Button asChild variant="outline" className={`${pill} bg-background text-foreground hover:bg-foreground hover:text-background`}>
              <a href={`${STORE}/collections/all-lipsticks`} target={storeTarget}>
                Shop all lipsticks <ArrowRight className="w-3 h-3" />
              </a>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default WhyItWorks;
