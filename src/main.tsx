import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import App from "./App.tsx";
import "./index.css";

posthog.init("phc_mXFsYGtX6hXPU7BNbdufBiapYPh2BCQQDSw3bKNtzpce", {
  api_host: "https://us.i.posthog.com",
  person_profiles: "identified_only",
});

createRoot(document.getElementById("root")!).render(<App />);
