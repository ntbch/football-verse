import type { StoryKeyPointResponse, StorySourceResponse } from "../types";

export type StoryTimelineEntry = StorySourceResponse & {
  claims: { relation: "SUPPORT" | "CONTRADICTION" | "CONTEXT"; keyPoint: string }[];
};

const relationOrder = { CONTRADICTION: 0, SUPPORT: 1, CONTEXT: 2 } as const;

function timeValue(value?: string) {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(time) ? null : time;
}

function compareText(left: string, right: string) {
  return left === right ? 0 : left < right ? -1 : 1;
}

export function buildSourceTimeline(sources: StorySourceResponse[], keyPoints: StoryKeyPointResponse[] = []): StoryTimelineEntry[] {
  return sources.map((source) => {
    const claims = keyPoints.flatMap((keyPoint) => keyPoint.evidence
      .filter((evidence) => evidence.originalUrl === source.url || evidence.sourceName === source.name)
      .map((evidence) => ({ relation: evidence.relation, keyPoint: keyPoint.text })));
    const uniqueClaims = [...new Map(claims.map((claim) => [`${claim.relation}:${claim.keyPoint}`, claim])).values()];

    return {
      ...source,
      claims: uniqueClaims.sort((left, right) => relationOrder[left.relation] - relationOrder[right.relation] || compareText(left.keyPoint, right.keyPoint)),
    };
  }).sort((left, right) => {
    const leftTime = timeValue(left.publishedAt);
    const rightTime = timeValue(right.publishedAt);
    if (leftTime !== null && rightTime !== null && leftTime !== rightTime) return leftTime - rightTime;
    if (leftTime !== null && rightTime === null) return -1;
    if (leftTime === null && rightTime !== null) return 1;
    return compareText(left.name, right.name) || compareText(left.url, right.url);
  });
}
