import { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div>
    <p className="font-sans font-medium text-[9px] uppercase tracking-normal text-foreground mb-1.5">
      {title}
    </p>
    <p className="font-display text-[12px] leading-[15px] text-foreground">{children}</p>
  </div>
);

const LearnMoreDialog = ({ open, onOpenChange }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md rounded-none sm:rounded-none border border-foreground bg-background max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="font-display font-normal text-[18px] leading-[18px] text-left tracking-normal">
          How Teak handles your data
        </DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <Section title="What we collect">
          Only if you check the box: a reduced-size copy of your photo, your skin- and lip-tone
          selections, your email, and an anonymous quiz session ID.
        </Section>
        <Section title="What we do with it">
          We use it to design better shades for brown skin. Your photo is analyzed by Google's
          Gemini AI to categorize skin and lip tone; Google processes it on our behalf under
          their API terms. Your email is used once, to send your discount code through our
          store.
        </Section>
        <Section title="What we never do">
          The live try-on runs entirely on your device: if you don't check the box, your photo
          never leaves your browser. We don't sell your data, ever.
        </Section>
        <Section title="How long we keep it">
          We keep saved photos and selections only while our shade research is active, and
          delete them when no longer needed — or immediately on request.
        </Section>
        <Section title="Your rights">
          Ask us anytime to see or delete your data, or to withdraw consent:{" "}
          <a href="mailto:privacy@teakbeauty.com" className="underline">
            privacy@teakbeauty.com
          </a>
          . EU/UK residents have GDPR rights (access, erasure, portability, complaint to a
          supervisory authority); California residents have CCPA/CPRA rights (know, delete,
          correct, limit sensitive-data use). See also our{" "}
          <a
            href="https://teakbeauty.com/pages/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Privacy Policy
          </a>
          .
        </Section>
      </div>
    </DialogContent>
  </Dialog>
);

export default LearnMoreDialog;
