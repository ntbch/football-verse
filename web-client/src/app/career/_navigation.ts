export type Tab = "overview" | "fixtures" | "squad" | "tactics" | "transfers" | "manager" | "table" | "history";
export type SubTab = "schedule" | "results" | "list" | "depth" | "compare" | "starting-xi" | "instructions" | "match-squad" |
  "market" | "negotiations" | "standings" | "player-stats" | "profile" | "board" | "decisions" | "jobs";

export const TABS: readonly { id: Tab; label: string }[] = [
  { id: "overview", label: "Portal" }, { id: "fixtures", label: "Fixtures" }, { id: "squad", label: "Squad" },
  { id: "tactics", label: "Tactics" }, { id: "transfers", label: "Transfers" }, { id: "table", label: "Table" },
  { id: "manager", label: "Manager" }, { id: "history", label: "History" },
];

export const SUB_TABS: Partial<Record<Tab, readonly { id: SubTab; label: string }[]>> = {
  fixtures: [{ id: "schedule", label: "Schedule" }, { id: "results", label: "Results" }],
  squad: [{ id: "list", label: "List" }, { id: "depth", label: "Depth" }, { id: "compare", label: "Compare" }],
  tactics: [{ id: "starting-xi", label: "Starting XI" }, { id: "instructions", label: "Instructions" }, { id: "match-squad", label: "Match squad" }],
  transfers: [{ id: "market", label: "Market" }, { id: "negotiations", label: "Negotiations" }],
  table: [{ id: "standings", label: "Standings" }, { id: "player-stats", label: "Player stats" }],
  manager: [{ id: "profile", label: "Profile" }, { id: "board", label: "Board" }, { id: "decisions", label: "Decisions" }, { id: "jobs", label: "Jobs" }],
};

export function readCareerLocation(search: string) {
  const params = new URLSearchParams(search);
  const requestedTab = params.get("tab") as Tab | null;
  const tab = requestedTab && TABS.some((item) => item.id === requestedTab) ? requestedTab : "overview";
  const available = SUB_TABS[tab] ?? [];
  const requestedSub = params.get("sub") as SubTab | null;
  const subTab = available.some((item) => item.id === requestedSub) ? requestedSub! : available[0]?.id ?? "";
  const [detailKind, detailId] = (params.get("detail") ?? "").split(":");
  const filterable = tab === "fixtures" || (tab === "transfers" && ["market", "negotiations"].includes(subTab)) ||
    (tab === "table" && subTab === "player-stats");
  const paged = (tab === "transfers" && ["market", "negotiations"].includes(subTab)) ||
    (tab === "table" && subTab === "player-stats");
  return {
    tab,
    subTab,
    query: filterable ? params.get("q")?.trim() ?? "" : "",
    page: paged ? Math.max(0, Number.parseInt(params.get("page") ?? "0", 10) || 0) : 0,
    fixtureId: detailKind === "fixture" ? detailId ?? "" : "",
    marketId: detailKind === "market" ? detailId ?? "" : "",
  };
}
