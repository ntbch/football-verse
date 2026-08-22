import { apiBaseUrl } from "@/shared/lib/api-config";

/**
 * Fetch public JSON from the gateway for server components.
 * Returns undefined on any failure so routes can render fallbacks.
 */
export async function publicData<T>(path: string, revalidate = 60): Promise<T | undefined> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, { next: { revalidate } });
    return response.ok ? ((await response.json()) as { data: T }).data : undefined;
  } catch {
    return undefined;
  }
}
