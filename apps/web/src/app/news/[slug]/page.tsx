import type { Metadata } from "next";
import NewsDetailPage from "@/features/news/[slug]/page";
import type { NewsArticleResponse } from "@/features/news/types";
import { publicData } from "@/shared/lib/api-server";

export const runtime = "edge";

const articleForSlug = (slug: string) =>
  publicData<NewsArticleResponse>(`/news/${encodeURIComponent(slug)}`, 300);

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
        publishedTime: article.publishedAt ?? undefined,
        modifiedTime: article.lastMaterialChangeAt ?? undefined,
        images: article.imageUrl ? [{ url: article.imageUrl, alt: article.title }] : undefined,
      },
    };
  }
  return { title: "Article | Football Verse", robots: { index: false, follow: true } };
}

export default async function NewsArticleRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await articleForSlug(slug);
  return <NewsDetailPage initialArticle={article} initialSlug={slug} />;
}
