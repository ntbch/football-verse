import { apiBaseUrl } from "@/shared/lib/api-client";

export const game = (path: string) => `${apiBaseUrl.replace(/\/api\/v1\/?$/, "")}/game${path}`;
export const body = async <T>(request: Promise<{ data: T }>) => (await request).data;
