import { useRef, type FormEventHandler } from "react";
import { useAccessibleDialog } from "@/shared/hooks/use-accessible-dialog";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  useAccessibleDialog(true, dialogRef, undefined, onCancel);

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-[var(--color-overlay)] p-4 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="report-dialog-title" tabIndex={-1} className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-surface)] shadow-lg">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-6 py-4">
          <h2 id="report-dialog-title" className="m-0 font-serif-title text-base font-black text-[var(--color-text-primary)]">
            Report Inappropriate Content
          </h2>
          <button type="button" onClick={onCancel} aria-label="Close report dialog" className="min-h-11 min-w-11 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]">×</button>
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
