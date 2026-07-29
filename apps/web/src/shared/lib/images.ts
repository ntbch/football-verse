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
export function upgradeImageUrl(url: string): string {
  if (!url) return url;
  let cleanUrl = url.trim();
  if (cleanUrl.startsWith("//")) {
    cleanUrl = `https:${cleanUrl}`;
  }

  // BBC iChef (Upgrade low-res /240/, /320/, /480/ to /1024/)
  if (cleanUrl.includes("ichef.bbci.co.uk")) {
    cleanUrl = cleanUrl.replace(/(\/ace\/(?:standard|ws)\/|\/news\/)\d+\//i, "$11024/");
  }

  // Sky Sports / 365dm (Upgrade 240x135, 300x300, 640x360 to 1920x1080)
  if (cleanUrl.includes("365dm.com") || cleanUrl.includes("skysports.com")) {
    cleanUrl = cleanUrl.replace(/\/\d{2,4}x\d{2,4}\//i, "/1920x1080/");
  }

  // Upgrade YouTube low-res thumbnails (hqdefault.jpg / mqdefault.jpg / sddefault.jpg -> maxresdefault.jpg)
  if (cleanUrl.includes("i.ytimg.com") || cleanUrl.includes("img.youtube.com")) {
    cleanUrl = cleanUrl.replace(/\/(hqdefault|mqdefault|sddefault|default)\.jpg/i, "/maxresdefault.jpg");
  }

  // Upgrade Unsplash quality parameters to 1600px width & 90% quality
  if (cleanUrl.includes("images.unsplash.com")) {
    cleanUrl = cleanUrl.replace(/w=\d+/, "w=1600").replace(/q=\d+/, "q=90");
  }

  // Google News / googleusercontent often serves small renditions like =w120-h120, =s0-w300-h200
  if (cleanUrl.includes("googleusercontent.com") || cleanUrl.includes("ggpht.com")) {
    cleanUrl = cleanUrl.replace(/=(?:s|w)\d+(?:-h\d+)?(?:-[a-z0-9]+)*/i, "=w1600-h900");
  }

  // WordPress feeds commonly expose a generated 300x169 thumbnail while the original is available beside it.
  if (cleanUrl.includes("/wp-content/uploads/")) {
    cleanUrl = cleanUrl.replace(/-\d{2,4}x\d{2,4}(?=\.(?:avif|jpe?g|png|webp)(?:[?#]|$))/i, "");
  }

  // TalkSport / Mirror / Sun / Reach PLC alternates
  if (cleanUrl.includes("/alternates/")) {
    cleanUrl = cleanUrl.replace(/\/alternates\/s\d+b?\//i, "/alternates/s1200/");
  }

  // Generic width / resize query parameters (e.g. ?w=300, ?width=300, ?resize=300)
  if (/[?&](?:w|width|resize)=\d+/i.test(cleanUrl) && !cleanUrl.includes("images.unsplash.com")) {
    cleanUrl = cleanUrl
      .replace(/([?&])(?:w|width|resize)=\d+/gi, "$1w=1600")
      .replace(/([?&])q=\d+/gi, "$1q=90");
  }

  return cleanUrl;
}

export function getArticleImage(_id: number, content?: string, preferredImageUrl?: string): string {
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
  return DEFAULT_FALLBACK_SVG;
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
    target.src = fallbackUrl || DEFAULT_FALLBACK_SVG;
  } else if (target.dataset.fallbackTried === "true") {
    target.dataset.fallbackTried = "done";
    target.src = DEFAULT_FALLBACK_SVG;
  }
}
