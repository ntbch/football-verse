export type ContextualContentStatus = "loading" | "error" | "success";

export type ContextualContentStateInput = {
  status: ContextualContentStatus;
  news: readonly unknown[];
  threads: readonly unknown[];
};

export type ContextualContentState = "loading" | "unavailable" | "empty" | "content";

export function contextualContentState({ status, news, threads }: ContextualContentStateInput): ContextualContentState {
  if (status === "loading") return "loading";
  if (status === "error") return "unavailable";
  return news.length || threads.length ? "content" : "empty";
}
