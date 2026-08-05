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
 * Automatically upgrades low-resolution image URLs when the provider exposes a larger original.
 */
export function upgradeImageUrl(url: string, width = 800): string {
  if (!url) return url;
  let cleanUrl = url.trim();
  const height = Math.round(width * 9 / 16);
  if (cleanUrl.startsWith("//")) {
    cleanUrl = `https:${cleanUrl}`;
  }

  // BBC iChef serves responsive renditions by path segment.
  if (cleanUrl.includes("ichef.bbci.co.uk")) {
    cleanUrl = cleanUrl.replace(/(\/ace\/(?:standard|ws)\/|\/news\/)\d+\//i, `$1${width}/`);
  }

  // Sky Sports / 365dm expose explicit responsive dimensions in the path.
  if (cleanUrl.includes("365dm.com") || cleanUrl.includes("skysports.com")) {
    cleanUrl = cleanUrl.replace(/\/\d{2,4}x\d{2,4}\//i, `/${width}x${height}/`);
  }

  // Use the smallest YouTube thumbnail that fits the rendered slot.
  if (cleanUrl.includes("i.ytimg.com") || cleanUrl.includes("img.youtube.com")) {
    const thumbnail = width >= 1200 ? "maxresdefault" : width >= 640 ? "sddefault" : "hqdefault";
    cleanUrl = cleanUrl.replace(/\/(maxresdefault|hqdefault|mqdefault|sddefault|default)\.jpg/i, `/${thumbnail}.jpg`);
  }

  // Keep card images small; only hero/detail callers request a large rendition.
  if (cleanUrl.includes("images.unsplash.com")) {
    cleanUrl = cleanUrl.replace(/w=\d+/, `w=${width}`).replace(/q=\d+/, "q=80");
  }

  // Google News / googleusercontent often serves small renditions like =w120-h120, =s0-w300-h200
  if (cleanUrl.includes("googleusercontent.com") || cleanUrl.includes("ggpht.com")) {
    cleanUrl = cleanUrl.replace(/=(?:s|w)\d+(?:-h\d+)?(?:-[a-z0-9]+)*/i, `=w${width}-h${height}`);
  }

  // WordPress feeds commonly expose a generated 300x169 thumbnail while the original is available beside it.
  if (cleanUrl.includes("/wp-content/uploads/")) {
    cleanUrl = cleanUrl.replace(/-\d{2,4}x\d{2,4}(?=\.(?:avif|jpe?g|png|webp)(?:[?#]|$))/i, "");
  }

  // TalkSport / Mirror / Sun / Reach PLC alternates
  if (cleanUrl.includes("/alternates/")) {
    cleanUrl = cleanUrl.replace(/\/alternates\/s\d+b?\//i, `/alternates/s${width}/`);
  }

  // Generic width / resize query parameters (e.g. ?w=300, ?width=300, ?resize=300)
  if (/[?&](?:w|width|resize)=\d+/i.test(cleanUrl) && !cleanUrl.includes("images.unsplash.com")) {
    cleanUrl = cleanUrl
      .replace(/([?&])(?:w|width|resize)=\d+/gi, `$1w=${width}`)
      .replace(/([?&])q=\d+/gi, "$1q=80");
  }

  return cleanUrl;
}

export function getArticleImage(_id: number, content?: string, preferredImageUrl?: string, width = 800): string {
  if (preferredImageUrl && preferredImageUrl.trim()) {
    const upgraded = upgradeImageUrl(preferredImageUrl, width);
    if (upgraded.startsWith("http://") || upgraded.startsWith("https://")) {
      return upgraded;
    }
  }
  if (content) {
    const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match && match[1]) {
      const upgraded = upgradeImageUrl(match[1], width);
      if (upgraded.startsWith("http://") || upgraded.startsWith("https://")) {
        return upgraded;
      }
    }
  }
  return DEFAULT_FALLBACK_SVG;
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackUrl?: string) {
  const target = e.currentTarget;

  // Fallback from YouTube maxresdefault.jpg to hqdefault.jpg if HD thumbnail is 404
  if (target.src.includes("maxresdefault.jpg")) {
    target.src = target.src.replace("maxresdefault.jpg", "sddefault.jpg");
    return;
  }

  if (target.src.includes("sddefault.jpg")) {
    target.src = target.src.replace("sddefault.jpg", "hqdefault.jpg");
    return;
  }

  if (!target.dataset.fallbackTried) {
    target.dataset.fallbackTried = "true";
    target.src = fallbackUrl || DEFAULT_FALLBACK_SVG;
  } else if (target.dataset.fallbackTried === "true") {
    target.dataset.fallbackTried = "done";
    target.src = DEFAULT_FALLBACK_SVG;
  }
}
