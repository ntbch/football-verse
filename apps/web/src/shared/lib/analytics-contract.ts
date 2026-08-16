export const eventFields = {
  onboarding_completed: [],
  story_evidence_viewed: ["storyId", "sourceCount"],
  daily_hub_opened: [],
  story_opened: ["storyId", "sourceCount"],
  matchday_opened: ["fixtureId"],
  context_opened: ["contextId", "fixtureId"],
  context_thread_started: ["contextId", "fixtureId"],
  prediction_submitted: ["fixtureId"],
  daily_game_completed: ["gameId"],
} as const;

export type ProductEventName = keyof typeof eventFields;
export type AnalyticsField = "storyId" | "fixtureId" | "contextId" | "gameId" | "sourceCount";

export function allowedFields(name: ProductEventName): readonly AnalyticsField[] {
  return eventFields[name] as readonly AnalyticsField[];
}

export function sanitizeEventFields(name: ProductEventName, fields: Record<string, unknown>): Partial<Record<AnalyticsField, number | string>> {
  return Object.fromEntries(
    allowedFields(name)
      .filter((field) => typeof fields[field] === (field === "gameId" ? "string" : "number"))
      .map((field) => [field, fields[field]]),
  ) as Partial<Record<AnalyticsField, number | string>>;
}
