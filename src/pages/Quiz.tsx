import { useEffect, useState, type ComponentType } from "react";
import Index from "./Index";
import {
  DEFAULT_QUIZ_VERSION,
  QUIZ_VERSIONS,
  fetchQuizVersionSettings,
  pickQuizVersion,
  setCurrentQuizVersion,
} from "@/lib/quizVersions";

// The quiz route. Picks this visitor's version from the admin's on/off switches
// and traffic weights, then renders that version's page. Every tracked event is
// tagged with the version (see useQuizTracking).
// Model tiles Version 2 offers (roster image names).
const V2_MODELS = ["aashi", "charithra", "cynthia", "maseray", "nero", "sanna", "tanvi", "terushka"] as const;

const VERSION_PAGES: Record<string, ComponentType> = {
  v1: Index,
  v2: () => <Index askLipShape askColorLook stackedResults inlineBack discountConsentTitle modelNames={V2_MODELS} />,
};

// ?quiz_version=v2 forces a built version, on or off, so it can be reviewed
// before it gets traffic. Its events are tagged with that version as usual.
const previewVersion = (): string | null => {
  const key = new URLSearchParams(window.location.search).get("quiz_version");
  return key && VERSION_PAGES[key] ? key : null;
};

// Picked once per page load, so navigating away and back keeps the version.
// With only one version built there is nothing to split: serve it right away
// instead of waiting on the settings read.
let resolved: string | null = previewVersion() ?? (QUIZ_VERSIONS.length === 1 ? QUIZ_VERSIONS[0].key : null);
if (resolved) setCurrentQuizVersion(resolved);

const Quiz = () => {
  const [version, setVersion] = useState(resolved);

  useEffect(() => {
    if (resolved) return;
    let cancelled = false;
    fetchQuizVersionSettings()
      .then(pickQuizVersion)
      .catch((e) => {
        console.error("Failed to load quiz versions, serving the default:", e);
        return DEFAULT_QUIZ_VERSION;
      })
      .then((key) => {
        resolved = VERSION_PAGES[key] ? key : DEFAULT_QUIZ_VERSION;
        setCurrentQuizVersion(resolved);
        if (!cancelled) setVersion(resolved);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!version) return null;
  const Page = VERSION_PAGES[version];
  return <Page />;
};

export default Quiz;
