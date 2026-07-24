import type { FormEventHandler } from "react";
import Link from "next/link";

type ReplyComposerProps = {
  locked: boolean;
  authenticated: boolean;
  value: string;
  pending: boolean;
  onChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function ReplyComposer({
  locked,
  authenticated,
  value,
  pending,
  onChange,
  onSubmit,
}: ReplyComposerProps) {
  return (
    <section className="mt-4 flex flex-col gap-4 border-t border-[var(--color-border)] pt-6">
      <h2 className="m-0 font-serif-title text-xl font-black text-[var(--color-text-primary)]">
        Post a Reply
      </h2>
      {locked ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="m-0 text-sm font-bold text-red-600">
            This discussion thread has been locked. New replies are disabled.
          </p>
        </div>
      ) : authenticated ? (
        <form onSubmit={onSubmit} className="w-full">
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="Share your views or reply to this post... (Use @username to mention others)"
              rows={4}
              className="w-full rounded-xl border border-[var(--color-border)] bg-gray-50 p-3 text-xs font-medium text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
            <div className="text-right">
              <button disabled={pending} className="btn btn-primary !px-5 !py-2.5 !text-xs">
                {pending ? "Posting..." : "Submit Reply"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 py-6 text-center shadow-sm">
          <p className="text-xs font-medium text-[var(--color-text-secondary)] md:text-sm">
            Please <Link href="/login" className="font-bold text-[var(--color-accent)] hover:underline">Login</Link>{" "}
            to reply to discussions.
          </p>
        </div>
      )}
    </section>
  );
}
