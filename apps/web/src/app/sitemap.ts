import type { MetadataRoute } from "next";

type Page<T> = { content: T[] };

async function publicJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}${path}`, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return null;
    return ((await response.json()) as { data: T }).data;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const staticPaths = ["/", "/news", "/forum", "/matchday", "/games", "/predictions", "/terms", "/privacy", "/community-guidelines", "/contact"];
  const news = await publicJson<Page<{ slug: string }>>("/news?page=0&size=100");
  const categories = await publicJson<Array<{ slug: string }>>("/forum/categories");
  const threadPages = await Promise.all((categories ?? []).slice(0, 20).map((category) =>
    publicJson<Page<{ slug: string }>>(`/forum/categories/${encodeURIComponent(category.slug)}/threads?page=0&size=100`)
  ));
  const dynamicPaths = [
    ...(news?.content ?? []).map((article) => `/news/${encodeURIComponent(article.slug)}`),
    ...threadPages.flatMap((page) => (page?.content ?? []).map((thread) => `/forum/threads/${encodeURIComponent(thread.slug)}`)),
  ];
  return [...new Set([...staticPaths, ...dynamicPaths])].map((path) => ({ url: `${base}${path}` }));
}
