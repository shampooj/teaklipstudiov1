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
const VERSION_PAGES: Record<string, ComponentType> = {
  v1: Index,
};

// Picked once per page load, so navigating away and back keeps the version.
// With only one version built there is nothing to split: serve it right away
// instead of waiting on the settings read.
let resolved: string | null = QUIZ_VERSIONS.length === 1 ? QUIZ_VERSIONS[0].key : null;
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
