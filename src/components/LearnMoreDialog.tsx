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
    <div className="font-display text-[12px] leading-[15px] text-foreground flex flex-col gap-1.5">
      {children}
    </div>
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
        <p className="font-display text-[12px] leading-[15px] text-green-700">
          If any of the following doesn't make sense, please reach out to us at{" "}
          <a href="mailto:hello@teakbeauty.com" className="underline">
            hello@teakbeauty.com
          </a>
          , and we'd be happy to walk you through it! We think it's super important that our
          customers understand how we plan to use and process their data, especially in the
          world of AI. Generally speaking, we are only collecting, storing, and analyzing your
          data to help us learn what your skin needs and what you like, so we can keep working
          to create better products for brown skin. We won't share it externally, and you can
          email us to delete it at any time. More details follow:
        </p>
        <Section title="What we collect">
          <p>
            <strong className="font-medium">If you use a model image:</strong> we don't collect
            any photos or personal details from your session. Standard, non-identifying site
            analytics may apply, as described in our Privacy Policy.
          </p>
          <p>
            <strong className="font-medium">If you use your own photo without checking any
            other boxes:</strong> we don't keep a copy of your photo. The try-on is designed to
            process your photo on your device, and we don't save it or your results on our
            servers — the only copy that exists afterward is any download or screenshot you
            choose to make yourself. Standard, non-identifying site analytics may apply, as
            described in our Privacy Policy.
          </p>
          <p>
            <strong className="font-medium">If you use your own photo and opt in for your 10%
            discount:</strong> we store a reduced-size copy of your photo, your skin and lip
            tone selections, your email address, and a randomly generated session ID, in a
            secure database.
          </p>
          <p>
            Because skin tone information can reveal or suggest ethnic origin, this is treated
            as sensitive data. By checking the discount box, you explicitly consent to Teak
            storing your photo for up to 3 years and processing it, along with your tone
            selections, for the research purposes described below. You can withdraw this
            consent at any time.
          </p>
        </Section>
        <Section title="What we do with it">
          <p>
            If you've opted in to us storing your photo, we use your photo and selections to
            design better shades for brown skin — it helps us understand who our customers are
            and what they need. Your photo may be reviewed by authorized Teak staff, or
            analyzed by AI services that process it on our behalf under data processing
            agreements that prohibit them from using your data to train their models. Your data
            may be used to train Teak's own internal models only, in service of building better
            products for brown skin.
          </p>
          <p>
            Where your data is collected from within the EU/UK, we rely on appropriate
            safeguards such as Standard Contractual Clauses.
          </p>
          <p>
            Your email is used to send your discount code, to invite you (with an unsubscribe
            option in every message) to share feedback on your experience or review Teak
            products you've purchased — we may connect your quiz responses with your order
            history for this — and to locate your image if you ask us to delete it.
          </p>
        </Section>
        <Section title="What we never do">
          <p>
            We never sell your data to third parties as a product, share it for advertising, or
            publicly share your photos or anything collected through the Virtual Lip Studio.
            Access is limited to authorized individuals at Teak.
          </p>
        </Section>
        <Section title="How long we keep it">
          <p>
            We keep saved photos and selections for up to 3 years from collection to support
            our ongoing shade research, including re-analyzing images as measurement methods
            improve. We review the data periodically and delete anything we no longer need
            before then — or immediately on request, at any time. Withdrawing consent doesn't
            undo processing that already happened, but it stops all future use.
          </p>
        </Section>
        <Section title="Your rights">
          <p>
            Ask us anytime to see, correct, or delete your data, or to withdraw consent:{" "}
            <a href="mailto:hello@teakbeauty.com" className="underline">
              hello@teakbeauty.com
            </a>
            . EU/UK residents have GDPR rights (access, erasure, portability, and complaint to
            a supervisory authority); California residents have CCPA/CPRA rights (know, delete,
            correct, and limit use of sensitive data). Because the discount is offered in
            exchange for data, California residents can also review our{" "}
            <a
              href="https://teakbeauty.com/pages/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Notice of Financial Incentive
            </a>{" "}
            explaining the program and how to opt out or withdraw. See also our{" "}
            <a
              href="https://teakbeauty.com/pages/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Privacy Policy
            </a>
            .
          </p>
          <p>The Virtual Lip Studio isn't intended for anyone under 16.</p>
        </Section>
      </div>
    </DialogContent>
  </Dialog>
);

export default LearnMoreDialog;
