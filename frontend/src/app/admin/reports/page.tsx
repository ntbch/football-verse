"use client";

import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useAdminReports, useHideForumTarget, useResolveReport } from "../_api";

export default function AdminReportsPage() {
  const reports = useAdminReports();
  const resolve = useResolveReport();
  const hide = useHideForumTarget();

  return (
    <div>
      <h1 className="display-face text-4xl font-black">Reports</h1>
      <div className="mt-5 grid gap-3">
        {reports.isLoading ? <LoadingBlock /> : null}
        {reports.error ? <ErrorBlock message="Could not load reports." /> : null}
        {hide.error || resolve.error ? <ErrorBlock message="Could not update report." /> : null}
        {reports.data?.length === 0 ? <p>No open reports.</p> : null}
        {reports.data?.map((report) => (
          <article className="border border-white/15 p-4" key={report.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-bold">{report.targetType} #{report.targetId}</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-secondary border-white text-white" disabled={hide.isPending} onClick={() => hide.mutate({ type: report.targetType, id: report.targetId, hidden: true })}>Hide</button>
                <button className="btn btn-secondary border-white text-white" disabled={hide.isPending} onClick={() => hide.mutate({ type: report.targetType, id: report.targetId, hidden: false })}>Restore</button>
                <button className="btn bg-[var(--fv-grass)] text-[var(--fv-ink)]" disabled={resolve.isPending} onClick={() => resolve.mutate(report.id)}>Resolve</button>
              </div>
            </div>
            <p className="mt-2">{report.reason}</p>
            <p className="mt-2 text-xs uppercase opacity-70">by {report.reporter}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
