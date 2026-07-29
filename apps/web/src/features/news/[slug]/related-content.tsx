import Link from "next/link";
import type { SearchResponse } from "@/features/search/types";
import { ErrorBlock } from "@/shared/components/state-blocks";
import { formatDate } from "@/shared/lib/format";

type RelatedContentProps = {
  articleId: number;
  results?: SearchResponse;
  isLoading: boolean;
  error: boolean;
  onRetry: () => void;
};

export function RelatedContent({ articleId, results, isLoading, error, onRetry }: RelatedContentProps) {
  const articles = (results?.news.content ?? []).filter((article) => article.id !== articleId).slice(0, 3);
  const threads = (results?.forum.content ?? []).slice(0, 3);
  const state = isLoading ? <p className="m-0 text-sm text-[var(--color-text-secondary)]">Looking for matching coverage…</p>
    : error ? <ErrorBlock message="Related content is unavailable." onRetry={onRetry} />
      : null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-labelledby="related-news-title" className="editorial-panel p-5">
        <h2 id="related-news-title" className="m-0 font-serif-title text-xl font-black text-[var(--color-text-primary)]">Related News</h2>
        <div className="mt-4 grid gap-3">
          {state ?? (articles.length ? articles.map((article) => (
            <Link className="rounded-xl border border-[var(--color-border)] p-3 transition-colors hover:border-[var(--color-accent)]" href={`/news/${article.slug}`} key={article.id}>
              <p className="m-0 text-xs font-semibold text-[var(--color-text-secondary)]">{formatDate(article.publishedAt)}</p>
              <h3 className="m-0 mt-1 font-serif-title text-base font-black text-[var(--color-text-primary)]">{article.title}</h3>
            </Link>
          )) : <p className="m-0 text-sm text-[var(--color-text-secondary)]">No matching news found.</p>)}
        </div>
      </section>

      <section aria-labelledby="related-discussion-title" className="editorial-panel p-5">
        <h2 id="related-discussion-title" className="m-0 font-serif-title text-xl font-black text-[var(--color-text-primary)]">Related Discussion</h2>
        <div className="mt-4 grid gap-3">
          {state ?? (threads.length ? threads.map((thread) => (
            <Link className="rounded-xl border border-[var(--color-border)] p-3 transition-colors hover:border-[var(--color-accent)]" href={`/forum/threads/${thread.slug}`} key={thread.id}>
              <p className="m-0 text-xs font-semibold text-[var(--color-text-secondary)]">{thread.categoryName} · {thread.replyCount} replies</p>
              <h3 className="m-0 mt-1 font-serif-title text-base font-black text-[var(--color-text-primary)]">{thread.title}</h3>
            </Link>
          )) : <p className="m-0 text-sm text-[var(--color-text-secondary)]">No matching discussions found.</p>)}
        </div>
      </section>
    </div>
  );
}
