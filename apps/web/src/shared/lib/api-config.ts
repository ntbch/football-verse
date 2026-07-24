export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const apiOrigin = new URL(apiBaseUrl).origin;
