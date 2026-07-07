import { getGotScraping } from './got-helper';
import * as cheerio from 'cheerio';
import { runInBrowser } from './playwright-helper';

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
  let fetchedViaHttp = false;

  try {
    const gotScraping = await getGotScraping();
    const response = await gotScraping({ url, timeout: { request: 15000 } });
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (!isBlockedOrThin(response.body)) {
        html = response.body;
        fetchedViaHttp = true;
      } else {
        console.warn(`[Crawler] Scraped HTML is blocked or thin for ${url}. Triggering Playwright fallback...`);
      }
    } else {
      console.warn(`[Crawler] HTTP status ${response.statusCode} for ${url}. Triggering Playwright fallback...`);
    }
  } catch (err: any) {
    console.warn(`[Crawler] HTTP fetch failed for ${url}: ${err.message || err}. Triggering Playwright fallback...`);
  }

  if (!fetchedViaHttp) {
    try {
      html = await runInBrowser(async (page) => {
        console.log(`[Crawler] Playwright loading article page: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
        if (cssSelector) {
          await page.waitForSelector(cssSelector, { timeout: 5000 }).catch(() => {});
        } else {
          await page.waitForSelector('.article-body, .article-content, article', { timeout: 5000 }).catch(() => {});
        }
        return await page.content();
      });
      console.log(`[Crawler] Playwright successfully scraped article: ${url}`);
    } catch (err: any) {
      console.error(`[Crawler] Playwright fallback also failed for ${url}:`, err.message || err);
      return null;
    }
  }

  try {
    const $ = cheerio.load(html);

    // 1. Title extraction
    let title = $('title').text().trim();
    if (!title) {
      title = $('meta[property="og:title"]').attr('content')?.trim() || 'Untitled';
    }

    // 2. Summary/Description extraction
    const summary = $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() || '';

    // 3. Main content body extraction and cleaning
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
      // Remove typical social sharing, ad elements, author byline boxes, reactions, and custom video wrappers
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

      // Remove analyst avatars, checkmark icons, and sharing icon images
      container.find('img').each((_, elem) => {
        const img = $(elem);
        const src = img.attr('src') || '';
        const width = parseInt(img.attr('width') || '0', 10);
        const height = parseInt(img.attr('height') || '0', 10);

        const isAuthorImg = src.includes('/columnists/') || src.includes('/i/columnists/') || src.includes('avatar') || src.includes('author');
        const isIconOrReaction = src.includes('reaction') || src.includes('check.png') || src.includes('social') || src.includes('share') || src.includes('print') || src.includes('email');
        const isTooSmall = (width > 0 && width <= 100) || (height > 0 && height <= 100) || src.includes('w=80') || src.includes('h=80') || src.includes('w=40') || src.includes('h=40');

        if (isAuthorImg || isIconOrReaction || isTooSmall) {
          const parentLi = img.closest('li');
          if (parentLi.length) {
            parentLi.remove();
          } else {
            img.remove();
          }
        }
      });

      // Remove empty lists or containers left after cleaning
      container.find('ul, ol').each((_, elem) => {
        const list = $(elem);
        if (!list.text().trim() && !list.find('img').length) {
          list.remove();
        }
      });

      // Remove promotional / push notification elements (Sky Sports, etc.)
      const promoPatterns = [
        'sign up for sky sports',
        'sky sports push notifications',
        'get sky sports on whatsapp',
        'follow sky sports on whatsapp',
        'download the sky sports app',
        'push notification',
        'sign up to get',
      ];
      container.find('p, a, span, div, li').each((_, elem) => {
        const el = $(elem);
        const text = el.text().toLowerCase().trim();
        if (promoPatterns.some(p => text.includes(p))) {
          el.remove();
        }
      });

      content = container.html() || '';
    }

    // 4. Publish Date extraction
    let publishedAt: string | undefined;
    const pubMeta = $('meta[name="article:published_time"], meta[property="article:published_time"], meta[name="date"]').attr('content');
    if (pubMeta) {
      const timestamp = Date.parse(pubMeta.trim());
      if (!isNaN(timestamp)) {
        publishedAt = new Date(timestamp).toISOString();
      }
    }

    // 5. Image Extraction (og:image / twitter:image)
    let imageUrl = $('meta[property="og:image"]').attr('content')?.trim() ||
      $('meta[name="twitter:image"]').attr('content')?.trim() || undefined;

    return {
      title,
      summary,
      content: content.trim(),
      publishedAt,
      imageUrl
    };
  } catch (error) {
    console.error(`Failed to scrape article ${url}:`, error);
    return null;
  }
}
