import type { Metadata } from "next";
import { apiBaseUrl } from "@/shared/lib/api-config";

export const runtime = "edge";

type ArticleMetadata = {
  title: string;
  slug: string;
  summary: string;
  imageUrl?: string;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const response = await fetch(`${apiBaseUrl}/news/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
    if (response.ok) {
      const article = (await response.json()).data as ArticleMetadata;
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
  } catch {
    // Render the article client-side even when metadata cannot reach the API.
  }
  return { title: "Article | Football Verse", robots: { index: false, follow: true } };
}

export { default } from "@/features/news/[slug]/page";
