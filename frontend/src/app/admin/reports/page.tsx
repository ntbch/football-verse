"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { data, http } from "@/shared/lib/api-client";
import type { ForumReport } from "@/shared/lib/types";

export default function AdminReportsPage() {
  const queryClient = useQueryClient();
  const reports = useQuery({ queryKey: ["admin-reports"], queryFn: () => data<ForumReport[]>(http.get("/admin/forum/reports")) });
  const resolve = useMutation({
    mutationFn: (id: number) => data<ForumReport>(http.patch(`/admin/forum/reports/${id}/resolve`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reports"] })
  });

  return (
    <div>
      <h1 className="display-face text-4xl font-black">Reports</h1>
      <div className="mt-5 grid gap-3">
        {reports.data?.length === 0 ? <p>No open reports.</p> : null}
        {reports.data?.map((report) => (
          <article className="border border-white/15 p-4" key={report.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold">{report.targetType} #{report.targetId}</p>
              <button className="btn bg-[var(--fv-grass)] text-[var(--fv-ink)]" onClick={() => resolve.mutate(report.id)}>Resolve</button>
            </div>
            <p className="mt-2">{report.reason}</p>
            <p className="mt-2 text-xs uppercase opacity-70">by {report.reporter}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
