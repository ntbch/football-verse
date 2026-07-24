import { lookup } from 'node:dns';
import { isIP } from 'node:net';
import { URL } from 'node:url';
import { getGotScraping } from './got-helper';

export const MAX_CRAWL_RESPONSE_BYTES = 2 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set([
  'text/html',
  'text/plain',
  'text/xml',
  'application/xml',
  'application/rss+xml',
  'application/atom+xml',
  'application/xhtml+xml',
]);

function blockedIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function isPublicIpAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return !blockedIpv4(address);
  if (version !== 6) return false;

  const normalized = address.toLowerCase().split('%')[0];
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice('::ffff:'.length);
    return isIP(mapped) === 4 && !blockedIpv4(mapped);
  }
  return !(
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith('2001:db8:')
  );
}

export function assertSafeHttpUrl(urlValue: string | URL): URL {
  const parsed = urlValue instanceof URL ? urlValue : new URL(urlValue);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('CRAWL_URL_PROTOCOL_REJECTED');
  if (parsed.username || parsed.password) throw new Error('CRAWL_URL_CREDENTIALS_REJECTED');
  if (parsed.port && !['80', '443'].includes(parsed.port)) throw new Error('CRAWL_URL_PORT_REJECTED');

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('CRAWL_URL_HOST_REJECTED');
  }
  if (isIP(hostname) && !isPublicIpAddress(hostname)) throw new Error('CRAWL_URL_ADDRESS_REJECTED');
  return parsed;
}

export function assertAllowedResponseContentType(statusCode: number, contentType?: string | string[]): void {
  if (statusCode === 304 || statusCode < 200 || statusCode >= 300) return;
  const value = Array.isArray(contentType) ? contentType[0] : contentType;
  const normalized = String(value ?? '').split(';', 1)[0].trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(normalized)) throw new Error('CRAWL_CONTENT_TYPE_REJECTED');
}

export function assertResponseSize(size: number): void {
  if (size > MAX_CRAWL_RESPONSE_BYTES) throw new Error('CRAWL_RESPONSE_TOO_LARGE');
}

// This resolver is supplied to the actual socket connection, so the address
// that was checked is the address used by the request (no validate-then-resolve gap).
function secureLookup(hostname: string, options: any, callback: (...args: any[]) => void): void {
  lookup(hostname, { all: true, verbatim: true }, (error, addresses) => {
    if (error) return callback(error);
    const publicAddresses = addresses.filter(entry => isPublicIpAddress(entry.address));
    if (publicAddresses.length !== addresses.length || publicAddresses.length === 0) {
      return callback(new Error('CRAWL_DNS_PRIVATE_ADDRESS_REJECTED'));
    }
    if (options?.all) return callback(null, publicAddresses);
    const selected = publicAddresses[0];
    return callback(null, selected.address, selected.family);
  });
}

export async function secureFetchText(
  url: string,
  options: { headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<{ body: string; statusCode: number; headers: Record<string, string | string[] | undefined> }> {
  const initialUrl = assertSafeHttpUrl(url);
  const gotScraping = await getGotScraping();
  let responseTooLarge = false;
  const request = gotScraping({
    url: initialUrl.toString(),
    headers: options.headers,
    throwHttpErrors: false,
    timeout: { request: options.timeoutMs ?? 15_000 },
    maxRedirects: 5,
    dnsLookup: secureLookup,
    hooks: {
      beforeRedirect: [
        (redirectOptions: any) => {
          assertSafeHttpUrl(redirectOptions.url);
        },
      ],
    },
  });
  request.on('downloadProgress', ({ transferred }: { transferred: number }) => {
    if (transferred > MAX_CRAWL_RESPONSE_BYTES) {
      responseTooLarge = true;
      request.cancel();
    }
  });

  let response;
  try {
    response = await request;
  } catch (error) {
    if (responseTooLarge) throw new Error('CRAWL_RESPONSE_TOO_LARGE');
    throw error;
  }

  const rawSize = response.rawBody?.byteLength ?? Buffer.byteLength(String(response.body ?? ''), 'utf8');
  assertResponseSize(rawSize);
  assertAllowedResponseContentType(response.statusCode, response.headers['content-type']);
  return response;
}
