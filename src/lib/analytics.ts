import posthog from "posthog-js";

// PostHog only ever initializes after the visitor allows analytics, and the
// stored value records their choice either way (storing the consent decision
// itself is a strictly-necessary use of localStorage).
const CONSENT_KEY = "teak-analytics-consent";

export type AnalyticsConsent = "granted" | "denied" | null;

let initialized = false;

export function getAnalyticsConsent(): AnalyticsConsent {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function initPosthog() {
  if (initialized) return;
  posthog.init("phc_mXFsYGtX6hXPU7BNbdufBiapYPh2BCQQDSw3bKNtzpce", {
    api_host: "https://us.i.posthog.com",
    person_profiles: "identified_only",
  });
  initialized = true;
}

export function initAnalyticsFromStoredConsent() {
  if (getAnalyticsConsent() === "granted") initPosthog();
}

export function setAnalyticsConsent(granted: boolean) {
  try {
    localStorage.setItem(CONSENT_KEY, granted ? "granted" : "denied");
  } catch {
    // consent still applies for this page load
  }
  if (granted) initPosthog();
}

export function captureAnalyticsEvent(name: string, props: Record<string, unknown> = {}) {
  if (initialized) posthog.capture(name, props);
}
