import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { captureAnalyticsEvent } from "@/lib/analytics";

// In-memory only — no device storage is touched, which keeps the anonymous
// first-party funnel events outside cookie-consent requirements. The quiz is a
// single page, so losing the id on a full reload is acceptable.
let sessionId: string | null = null;
const getSessionId = (): string => {
  if (!sessionId) sessionId = crypto.randomUUID();
  return sessionId;
};

export const useQuizTracking = () => {
  const sessionIdRef = useRef(getSessionId());
  const firedEvents = useRef(new Set<string>());

  const trackEvent = useCallback(
    (eventName: string, eventData: Record<string, unknown> = {}, dedupe = false) => {
      if (dedupe && firedEvents.current.has(eventName)) return;
      if (dedupe) firedEvents.current.add(eventName);

      captureAnalyticsEvent(eventName, { ...eventData, quiz_session_id: sessionIdRef.current });

      supabase
        .from("quiz_events" as any)
        .insert({
          session_id: sessionIdRef.current,
          event_name: eventName,
          event_data: eventData,
        } as any)
        .then(({ error }) => {
          if (error) console.error("Failed to track event:", eventName, error);
        });
    },
    []
  );

  return { trackEvent, sessionId: sessionIdRef.current };
};
