import type { FormEventHandler } from "react";

type ReportModalProps = {
  reason: string;
  pending: boolean;
  onReasonChange: (reason: string) => void;
  onCancel: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function ReportModal({
  reason,
  pending,
  onReasonChange,
  onCancel,
  onSubmit,
}: ReportModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-lg">
        <div className="border-b border-[var(--color-border)] bg-gray-50/50 px-6 py-4">
          <h2 className="m-0 font-serif-title text-base font-black text-[var(--color-text-primary)]">
            Report Inappropriate Content
          </h2>
        </div>
        <form onSubmit={onSubmit} className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-reason" className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Reason for reporting
              </label>
              <input
                id="report-reason"
                type="text"
                placeholder="e.g. Hate speech, toxicity, advertising, off-topic"
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                className="input"
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-[var(--color-border)] pt-3">
              <button type="button" onClick={onCancel} className="btn btn-secondary !px-4 !py-2 !text-xs">
                Cancel
              </button>
              <button type="submit" disabled={pending} className="btn btn-primary !px-5 !py-2 !text-xs">
                {pending ? "Reporting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
