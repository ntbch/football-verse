import * as cheerio from 'cheerio';
import { secureFetchText } from './secure-fetch';

export interface ScrapedArticle {
  title: string;
  summary: string;
  content: string;
  publishedAt?: string;
  imageUrl?: string;
}

function isBlockedOrThin(html: string): boolean {
  if (!html || html.length < 300) return true;
  const lower = html.toLowerCase();
  return lower.includes('access denied') ||
         lower.includes("verify that you're not a robot") ||
         lower.includes('javascript is disabled');
}

export async function scrapeArticle(
  url: string,
  cssSelector?: string
): Promise<ScrapedArticle | null> {
  let html = '';
  try {
    const response = await secureFetchText(url, { timeoutMs: 15_000 });
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (!isBlockedOrThin(response.body)) {
        html = response.body;
      }
    }
  } catch (err: any) {
    console.warn(`[Crawler] Article fetch rejected or failed: ${String(err?.message ?? 'CRAWL_FETCH_FAILED').slice(0, 120)}`);
    return null;
  }
  if (isBlockedOrThin(html)) return null;

  try {
    const $ = cheerio.load(html);

    let title = $('title').text().trim();
    if (!title) {
      title = $('meta[property="og:title"]').attr('content')?.trim() || 'Untitled';
    }

    const summary = $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() || '';

    let content = '';
    let container = cssSelector && cssSelector.trim().length > 0 ? $(cssSelector).first() : null;
    if (!container || !container.length) {
      for (const selector of ['.article-body', '.article-content', '.sdc-article-body', 'article', 'main', 'body']) {
        const found = $(selector).first();
        if (found.length) {
          container = found;
          break;
        }
      }
    }

    if (container && container.length) {
      container.find([
        '.social-share', '.share-buttons', '.share-container',
        '.reactions', '.content-reactions', '.extended-reactions',
        '.article-meta-author', '.author-info', '.byline', '.article-byline',
        '.ad-container', '.advertisement', '.promo-container', '.newsletter-signup',
        '.related-links', '.related-stories', '.read-more',
        'button',
        'iframe:not([src*="youtube.com"]):not([src*="vimeo.com"])',
        '.inline-video', '.video-placeholder', 'div[data-video]', '.video-play-button', '.inline-video-placeholder'
      ].join(',')).remove();

      content = container.html() || '';
    }

    let publishedAt: string | undefined;
    const pubMeta = $('meta[name="article:published_time"], meta[property="article:published_time"], meta[name="date"]').attr('content');
    if (pubMeta) {
      const timestamp = Date.parse(pubMeta.trim());
      if (!isNaN(timestamp)) {
        publishedAt = new Date(timestamp).toISOString();
      }
    }

    let imageUrl = $('meta[property="og:image"]').attr('content')?.trim() ||
      $('meta[name="twitter:image"]').attr('content')?.trim() || undefined;

    return {
      title,
      summary,
      content: content.trim(),
      publishedAt,
      imageUrl
    };
  } catch (error: any) {
    console.error(`[Crawler] Article parsing failed: ${String(error?.message ?? 'CRAWL_PARSE_FAILED').slice(0, 120)}`);
    return null;
  }
}
