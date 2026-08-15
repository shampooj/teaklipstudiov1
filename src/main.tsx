import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAnalyticsFromStoredConsent } from "@/lib/analytics";

// PostHog starts only for visitors who already allowed analytics; first-time
// visitors decide via the consent banner.
initAnalyticsFromStoredConsent();

createRoot(document.getElementById("root")!).render(<App />);
