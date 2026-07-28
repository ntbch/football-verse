export const FOOTBALL_IMAGES = [
  "https://images.unsplash.com/photo-1579952365116-61317f0501cd?q=90&w=1600&auto=format&fit=crop", // Champions League ball on pitch
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=90&w=1600&auto=format&fit=crop", // Football stadium floodlights
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=90&w=1600&auto=format&fit=crop", // Stadium night match
  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=90&w=1600&auto=format&fit=crop", // Empty stadium pitch
  "https://images.unsplash.com/photo-1551958219-acbc608c6377?q=90&w=1600&auto=format&fit=crop", // Football net & grass
  "https://images.unsplash.com/photo-1431324155629-1a6edd1dec1d?q=90&w=1600&auto=format&fit=crop", // Stadium crowd fans
];

export const DEFAULT_FALLBACK_SVG = "data:image/svg+xml;utf8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="600" cy="337" r="120" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="4"/>
  <line x1="600" y1="0" x2="600" y2="675" stroke="rgba(255,255,255,0.15)" stroke-width="4"/>
  <rect x="375" y="187" width="450" height="300" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3" rx="12"/>
  <path d="M 550 337 L 585 302 L 645 362" stroke="rgba(255,255,255,0.2)" stroke-width="4" fill="none"/>
  <text x="50%" y="82%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="800" font-size="28" letter-spacing="4">FOOTBALL VERSE</text>
</svg>`);

/**
 * Automatically upgrades low-resolution image URLs (e.g. YouTube hqdefault -> maxresdefault, Unsplash 800px -> 1600px)
 */
export function upgradeImageUrl(url: string): string {
  if (!url) return url;
  let cleanUrl = url.trim();
  if (cleanUrl.startsWith("//")) {
    cleanUrl = `https:${cleanUrl}`;
  }

  // Upgrade YouTube low-res thumbnails (hqdefault.jpg / mqdefault.jpg / sddefault.jpg -> maxresdefault.jpg)
  if (cleanUrl.includes("i.ytimg.com") || cleanUrl.includes("img.youtube.com")) {
    cleanUrl = cleanUrl.replace(/\/(hqdefault|mqdefault|sddefault|default)\.jpg/i, "/maxresdefault.jpg");
  }

  // Upgrade Unsplash quality parameters to 1600px width & 90% quality
  if (cleanUrl.includes("images.unsplash.com")) {
    cleanUrl = cleanUrl.replace(/w=\d+/, "w=1600").replace(/q=\d+/, "q=90");
  }

  return cleanUrl;
}

export function getArticleImage(id: number, content?: string, preferredImageUrl?: string): string {
  if (preferredImageUrl && preferredImageUrl.trim()) {
    const upgraded = upgradeImageUrl(preferredImageUrl);
    if (upgraded.startsWith("http://") || upgraded.startsWith("https://")) {
      return upgraded;
    }
  }
  if (content) {
    const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match && match[1]) {
      const upgraded = upgradeImageUrl(match[1]);
      if (upgraded.startsWith("http://") || upgraded.startsWith("https://")) {
        return upgraded;
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

  // Fallback from YouTube maxresdefault.jpg to hqdefault.jpg if HD thumbnail is 404
  if (target.src.includes("maxresdefault.jpg")) {
    target.src = target.src.replace("maxresdefault.jpg", "hqdefault.jpg");
    return;
  }

  if (!target.dataset.fallbackTried) {
    target.dataset.fallbackTried = "true";
    target.src = fallbackUrl ? upgradeImageUrl(fallbackUrl) : FOOTBALL_IMAGES[0];
  } else if (target.dataset.fallbackTried === "true") {
    target.dataset.fallbackTried = "done";
    target.src = DEFAULT_FALLBACK_SVG;
  }
}
