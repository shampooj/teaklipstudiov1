import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getAnalyticsConsent, setAnalyticsConsent } from "@/lib/analytics";

const buttonClass =
  "font-sans font-medium text-[9px] uppercase tracking-normal rounded-none px-5 bg-background text-foreground border border-foreground hover:bg-foreground hover:text-background";

const AnalyticsConsentBanner = () => {
  const [visible, setVisible] = useState(() => getAnalyticsConsent() === null);

  if (!visible) return null;

  const choose = (granted: boolean) => {
    setAnalyticsConsent(granted);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-foreground px-4 py-3">
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
        <p className="font-display text-[12px] leading-[13px] text-foreground flex-1">
          Teak uses an analytics cookie to understand how the Lip Studio is used — never your
          photos or quiz answers.
        </p>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" className={buttonClass} onClick={() => choose(true)}>
            Allow
          </Button>
          <Button size="sm" className={buttonClass} onClick={() => choose(false)}>
            No Thanks
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsConsentBanner;
