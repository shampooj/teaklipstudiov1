import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import posthog from "posthog-js";

const getSessionId = (): string => {
  const key = "quiz_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
};

export const useQuizTracking = () => {
  const sessionId = useRef(getSessionId());
  const firedEvents = useRef(new Set<string>());

  const trackEvent = useCallback(
    (eventName: string, eventData: Record<string, unknown> = {}, dedupe = false) => {
      if (dedupe && firedEvents.current.has(eventName)) return;
      if (dedupe) firedEvents.current.add(eventName);

      posthog.capture(eventName, { ...eventData, quiz_session_id: sessionId.current });

      supabase
        .from("quiz_events" as any)
        .insert({
          session_id: sessionId.current,
          event_name: eventName,
          event_data: eventData,
        } as any)
        .then(({ error }) => {
          if (error) console.error("Failed to track event:", eventName, error);
        });
    },
    []
  );

  return { trackEvent, sessionId: sessionId.current };
};
