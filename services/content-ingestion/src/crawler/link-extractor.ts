import * as cheerio from 'cheerio';
import { URL } from 'url';
import { secureFetchText } from './secure-fetch';

export interface CrawledLink {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

const EXCLUDE_NAVIGATION_KEYWORDS = [
  'about', 'contact', 'tag', 'tags', 'category', 'categories',
  'author', 'authors', 'search', 'privacy', 'terms', 'help',
  'advertise', 'jobs', 'newsletter', 'archive', 'videos', 'photos',
  'live', 'watch', 'podcasts', 'fixtures-results'
];

function isNavigationPath(path: string): boolean {
  const segments = path.split('/').filter(Boolean);
  if (segments.length < 1) return true;
  const first = segments[0].toLowerCase();
  return EXCLUDE_NAVIGATION_KEYWORDS.includes(first);
}

function isPromotionalOrFaq(str: string): boolean {
  const lower = str.toLowerCase();
  return lower.includes('push-notification') ||
         lower.includes('receive-the-alerts') ||
         lower.includes('terms-and-conditions') ||
         lower.includes('privacy-policy') ||
         lower.includes('how-to-receive') ||
         lower.includes('cookie-policy') ||
         lower.includes('faq') ||
         lower.includes('sign-up-for-sky-sports') ||
         lower.includes('receive-alerts');
}

function parsePubDate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString();
  const timestamp = Date.parse(dateStr);
  return isNaN(timestamp) ? new Date().toISOString() : new Date(timestamp).toISOString();
}

export async function extractLinks(
  source: { feedUrl: string; sourceType: string; cssSelector?: string },
  maxLinks = 30,
  cacheMap?: Map<string, { etag?: string; lastModified?: string }>
): Promise<CrawledLink[]> {
  try {
    let body = '';
    try {
      const headers: Record<string, string> = {};
      if (cacheMap && cacheMap.has(source.feedUrl)) {
        const cached = cacheMap.get(source.feedUrl)!;
        if (cached.etag) headers['If-None-Match'] = cached.etag;
        if (cached.lastModified) headers['If-Modified-Since'] = cached.lastModified;
      }

      const response = await secureFetchText(source.feedUrl, { headers, timeoutMs: 15_000 });

      if (response.statusCode === 304) {
        console.log(`[Crawler] Source unchanged (304 Not Modified): ${source.feedUrl}`);
        return [];
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        body = response.body;
        if (cacheMap) {
          const etag = response.headers['etag'] as string | undefined;
          const lastModified = response.headers['last-modified'] as string | undefined;
          if (etag || lastModified) {
            cacheMap.set(source.feedUrl, { etag, lastModified });
          }
        }
      } else {
        console.warn(`[Crawler] Source returned HTTP ${response.statusCode}`);
        return [];
      }
    } catch (err: any) {
      console.warn(`[Crawler] Source fetch rejected or failed: ${String(err?.message ?? 'CRAWL_FETCH_FAILED').slice(0, 120)}`);
      return [];
    }

    if (source.sourceType === 'RSS') {
      const $ = cheerio.load(body, { xmlMode: true });
      const items: CrawledLink[] = [];
      $('item').each((_, el) => {
        if (items.length >= maxLinks) return;
        const $el = $(el);
        const title = $el.find('title').text().trim();
        const link = $el.find('link').text().trim();
        const description = $el.find('description').text().trim();
        const pubDate = parsePubDate($el.find('pubDate, date').text().trim());

        if (link && title) {
          if (isPromotionalOrFaq(link) || isPromotionalOrFaq(title)) return;
          items.push({ title, link, description, pubDate });
        }
      });
      return items;
    }

    if (source.sourceType === 'SITEMAP') {
      const $ = cheerio.load(body, { xmlMode: true });
      const urls: string[] = [];
      const nestedSitemaps: string[] = [];
      $('sitemapindex > sitemap > loc, sitemap > loc').each((_, el) => {
        const nestedUrl = $(el).text().trim();
        if (nestedUrl) nestedSitemaps.push(nestedUrl);
      });

      if (nestedSitemaps.length > 0) {
        for (const subUrl of nestedSitemaps) {
          if (urls.length >= maxLinks) break;
          try {
            const subRes = await secureFetchText(subUrl);
            const sub$ = cheerio.load(subRes.body, { xmlMode: true });
            sub$('urlset > url > loc, url > loc').each((_, el) => {
              const url = sub$(el).text().trim();
              if (url && !urls.includes(url)) {
                if (isPromotionalOrFaq(url)) return;
                urls.push(url);
              }
            });
          } catch (err: any) {
            console.error(`[Crawler] Nested sitemap rejected or failed: ${String(err?.message ?? 'CRAWL_FETCH_FAILED').slice(0, 120)}`);
          }
        }
      } else {
        $('urlset > url > loc, url > loc').each((_, el) => {
          const url = $(el).text().trim();
          if (url && !urls.includes(url)) {
            if (isPromotionalOrFaq(url)) return;
            urls.push(url);
          }
        });
      }

      return urls.slice(0, maxLinks).map(url => ({
        title: '',
        link: url,
        description: '',
        pubDate: new Date().toISOString()
      }));
    }

    if (source.sourceType === 'HOMEPAGE') {
      const $ = cheerio.load(body);
      const parsedUrl = new URL(source.feedUrl);
      const host = parsedUrl.host;

      const links = new Set<string>();
      const selector = source.cssSelector && source.cssSelector.trim().length > 0
        ? source.cssSelector
        : 'a[href]';

      $(selector).each((_, el) => {
        if (links.size >= maxLinks) return;
        const $el = $(el);
        let href = $el.attr('href')?.trim();
        if (!href) return;

        try {
          if (href.startsWith('/')) {
            href = `${parsedUrl.protocol}//${host}${href}`;
          }
          const absoluteUrl = new URL(href);
          if (absoluteUrl.host !== host) return;

          const path = absoluteUrl.pathname;
          if (!path || path === '/' || isNavigationPath(path)) return;

          const urlStr = absoluteUrl.toString();
          if (isPromotionalOrFaq(urlStr)) return;
          links.add(urlStr);
        } catch {
          // Ignore invalid URLs
        }
      });

      return Array.from(links).map(url => ({
        title: '',
        link: url,
        description: '',
        pubDate: new Date().toISOString()
      }));
    }

    return [];
  } catch (error: any) {
    console.error(`[Crawler] Link extraction failed: ${String(error?.message ?? 'CRAWL_EXTRACTION_FAILED').slice(0, 120)}`);
    return [];
  }
}
