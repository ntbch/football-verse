import { useAuthStore } from "./auth-store";
import { sanitizeEventFields, type ProductEventName } from "./analytics-contract";

export type { ProductEventName } from "./analytics-contract";

/** Provider-neutral event bus: inspect `footballverse:analytics` in development. */
export function trackEvent(name: ProductEventName, fields: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const event = {
    name,
    ...sanitizeEventFields(name, fields),
    authenticated: Boolean(useAuthStore.getState().auth),
    route: window.location.pathname,
    timestamp: new Date().toISOString(),
  };
  window.dispatchEvent(new CustomEvent("footballverse:analytics", { detail: event }));
  if (process.env.NODE_ENV !== "production") console.debug("[footballverse:analytics]", event);
}
