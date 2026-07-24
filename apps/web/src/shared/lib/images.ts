export const FOOTBALL_IMAGES = [
  "https://images.unsplash.com/photo-1579952365116-61317f0501cd?q=80&w=800&auto=format&fit=crop", // Champions League ball on pitch
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop", // Football stadium floodlights
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop", // Stadium night match
  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=800&auto=format&fit=crop", // Empty stadium pitch
  "https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=800&auto=format&fit=crop", // Football net & grass
  "https://images.unsplash.com/photo-1431324155629-1a6edd1dec1d?q=80&w=800&auto=format&fit=crop", // Stadium crowd fans
];

export const DEFAULT_FALLBACK_SVG = "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="400" cy="225" r="80" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="4"/>
  <line x1="400" y1="0" x2="400" y2="450" stroke="rgba(255,255,255,0.15)" stroke-width="4"/>
  <rect x="250" y="125" width="300" height="200" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3" rx="12"/>
  <path d="M 370 225 L 390 205 L 430 245" stroke="rgba(255,255,255,0.2)" stroke-width="4" fill="none"/>
  <text x="50%" y="82%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="800" font-size="22" letter-spacing="4">FOOTBALL VERSE</text>
</svg>`);

export function getArticleImage(id: number, content?: string, preferredImageUrl?: string): string {
  if (preferredImageUrl && preferredImageUrl.trim()) {
    let url = preferredImageUrl.trim();
    if (url.startsWith('//')) {
      url = `https:${url}`;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
  }
  if (content) {
    const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match && match[1]) {
      let url = match[1].trim();
      if (url.startsWith('//')) {
        url = `https:${url}`;
      }
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
    }
  }
  const index = Math.abs(id) % FOOTBALL_IMAGES.length;
  return FOOTBALL_IMAGES[index];
}

export function getPlaceholderImage(): string {
  return FOOTBALL_IMAGES[0];
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackUrl?: string) {
  const target = e.currentTarget;
  if (!target.dataset.fallbackTried) {
    target.dataset.fallbackTried = "true";
    target.src = fallbackUrl || FOOTBALL_IMAGES[0];
  } else if (target.dataset.fallbackTried === "true") {
    target.dataset.fallbackTried = "done";
    target.src = DEFAULT_FALLBACK_SVG;
  }
}
