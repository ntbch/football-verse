export const FOOTBALL_IMAGES = [
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop", // Stadium lights / action
  "https://images.unsplash.com/photo-1540747737956-3787293a9fc1?q=80&w=800&auto=format&fit=crop", // Soccer ball on pitch close-up
  "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=800&auto=format&fit=crop", // Match celebration / motion
  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=800&auto=format&fit=crop", // Empty stadium / pitch
  "https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=800&auto=format&fit=crop", // Ball on grass
  "https://images.unsplash.com/photo-1431324155629-1a6edd1dec1d?q=80&w=800&auto=format&fit=crop", // Stadium crowd / fans
  "https://images.unsplash.com/photo-1579952365116-61317f0501cd?q=80&w=800&auto=format&fit=crop", // Match kickoff / ball
  "https://images.unsplash.com/photo-1518063319789-7217e6706b04?q=80&w=800&auto=format&fit=crop", // Player running
  "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?q=80&w=800&auto=format&fit=crop", // Referee blowing whistle
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop", // Player boots / pitch
];

export function getArticleImage(id: number, content?: string, preferredImageUrl?: string): string {
  if (preferredImageUrl) {
    return preferredImageUrl;
  }
  if (content) {
    const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match && match[1]) {
      return match[1];
    }
  }
  const index = Math.abs(id) % FOOTBALL_IMAGES.length;
  return FOOTBALL_IMAGES[index];
}

export function getPlaceholderImage(): string {
  return FOOTBALL_IMAGES[0];
}
