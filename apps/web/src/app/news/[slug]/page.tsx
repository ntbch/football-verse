import type { Metadata } from "next";
import { apiBaseUrl } from "@/shared/lib/api-config";
import NewsDetailPage from "@/features/news/[slug]/page";
import type { NewsArticleResponse } from "@/features/news/types";

export const runtime = "edge";

async function articleForSlug(slug: string): Promise<NewsArticleResponse | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/news/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    return ((await response.json()) as { data: NewsArticleResponse }).data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await articleForSlug(slug);
  if (article) {
    return {
      title: `${article.title} | Football Verse`,
      description: article.summary,
      alternates: { canonical: `/news/${article.slug}` },
      openGraph: {
        title: article.title,
        description: article.summary,
        type: "article",
        images: article.imageUrl ? [{ url: article.imageUrl, alt: article.title }] : undefined,
      },
    };
  }
  return { title: "Article | Football Verse", robots: { index: false, follow: true } };
}

export default async function NewsArticleRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await articleForSlug(slug);
  return <NewsDetailPage initialArticle={article ?? undefined} initialSlug={slug} />;
}
