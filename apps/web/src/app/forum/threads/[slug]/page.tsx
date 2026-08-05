import type { Metadata } from "next";

export const runtime = "edge";

async function threadForSlug(slug: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/forum/threads/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    return ((await response.json()) as { data: { thread: { title: string; categoryName?: string; createdAt?: string } } }).data.thread;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const thread = await threadForSlug(slug);
  return thread
    ? { title: `${thread.title} | Football Verse`, description: `${thread.categoryName ?? "Football community"} discussion on Football Verse.`, alternates: { canonical: `/forum/threads/${slug}` }, openGraph: { type: "article", title: thread.title, description: `${thread.categoryName ?? "Football community"} discussion on Football Verse.` } }
    : { title: "Discussion | Football Verse", robots: { index: false, follow: true } };

}

export { default } from "@/features/forum/threads/[slug]/page";
