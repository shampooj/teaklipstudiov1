import { supabase } from "@/integrations/supabase/client";

// Quiz versions are built in code; the admin panel switches them on/off and
// sets each one's share of traffic (quiz_versions table). To add a version:
// build its page, add it here, and map its key in src/pages/Quiz.tsx. It stays
// off until an admin turns it on.

export interface QuizVersionDef {
  key: string;
  label: string;
  description: string;
  // Steps this version adds to the Analytics funnel, shown when filtering to it.
  extraFunnelSteps?: { key: string; label: string; after: string }[];
}

export const QUIZ_VERSIONS: QuizVersionDef[] = [
  { key: "v1", label: "Version 1", description: "The original quiz: skin tone, lip tone, then a selfie or model." },
  {
    key: "v2",
    label: "Version 2",
    description: "Version 1 plus a required lip shape question (Shape A–C) after lip tone.",
    extraFunnelSteps: [{ key: "lip_shape_selected", label: "Lip Shape Selected", after: "lip_tone_selected" }],
  },
];

// Served when nothing is on, the settings can't be read, or a session's events
// predate versioning (analytics treats untagged sessions as this version).
export const DEFAULT_QUIZ_VERSION = "v1";

export interface QuizVersionSetting {
  key: string;
  enabled: boolean;
  weight: number;
  notes: string | null;
}

export const fetchQuizVersionSettings = async (): Promise<QuizVersionSetting[]> => {
  const { data, error } = await (supabase.from as any)("quiz_versions").select("key, enabled, weight, notes");
  if (error) throw error;
  return (data ?? []) as QuizVersionSetting[];
};

// The versions a visitor can be served: on, and built in this deploy. A row
// for a key the code doesn't know is ignored rather than served blank.
export const liveVersions = (settings: QuizVersionSetting[]): QuizVersionSetting[] => {
  const known = new Set(QUIZ_VERSIONS.map((v) => v.key));
  return settings.filter((s) => s.enabled && known.has(s.key));
};

// Each live version's share of traffic, 0–1. Weights are relative (they need
// not sum to 100); if every live weight is 0 the split falls back to even.
export const trafficShares = (live: QuizVersionSetting[]): Map<string, number> => {
  const total = live.reduce((sum, v) => sum + Math.max(0, v.weight), 0);
  return new Map(live.map((v) => [v.key, total > 0 ? Math.max(0, v.weight) / total : 1 / live.length]));
};

export const pickQuizVersion = (settings: QuizVersionSetting[], rand = Math.random()): string => {
  const live = liveVersions(settings);
  if (live.length === 0) return DEFAULT_QUIZ_VERSION;
  let acc = 0;
  for (const [key, share] of trafficShares(live)) {
    acc += share;
    if (rand < acc) return key;
  }
  return live[live.length - 1].key;
};

// The version this page load was assigned. In memory only, like the tracking
// session id, so a full reload may land on a different version.
let currentVersion = DEFAULT_QUIZ_VERSION;
export const setCurrentQuizVersion = (key: string) => {
  currentVersion = key;
};
export const getCurrentQuizVersion = () => currentVersion;
