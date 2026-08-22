import ForumPage from "@/features/forum/page";
import type { ForumCategoryResponse, ThreadResponse } from "@/features/forum/types";
import type { PageResponse } from "@/shared/lib/api-types";
import { publicData } from "@/shared/lib/api-server";
import { headers } from "next/headers";

export const runtime = "edge";

export default async function ForumRoute() {
  // Do not pre-render against the unavailable gateway during image construction.
  await headers();
  const categories = await publicData<ForumCategoryResponse[]>("/forum/categories");
  const firstCategory = categories?.[0]?.slug;
  const threadsPage = firstCategory
    ? await publicData<PageResponse<ThreadResponse>>(`/forum/categories/${encodeURIComponent(firstCategory)}/threads?page=0&size=20`)
    : undefined;
  return <ForumPage initialData={{ categories, threadsPage }} />;
}
