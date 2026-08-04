import { useAuthStore } from "./auth-store";

export type ProductEventName =
  | "onboarding_completed"
  | "story_evidence_viewed"
  | "prediction_submitted"
  | "daily_game_completed";

type ProductEventFields = {
  storyId?: number;
  fixtureId?: number;
  gameId?: string;
  sourceCount?: number;
};

/** Provider-neutral event bus: inspect `footballverse:analytics` in development. */
export function trackEvent(name: ProductEventName, fields: ProductEventFields = {}) {
  if (typeof window === "undefined") return;
  const event = {
    name,
    ...fields,
    authenticated: Boolean(useAuthStore.getState().auth),
    route: window.location.pathname,
    timestamp: new Date().toISOString(),
  };
  window.dispatchEvent(new CustomEvent("footballverse:analytics", { detail: event }));
  if (process.env.NODE_ENV !== "production") console.debug("[footballverse:analytics]", event);
}
