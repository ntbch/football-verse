"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { PublicShell } from "@/shared/components/public-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useAuthStore } from "@/shared/lib/auth-store";
import { useThreadDetail, useReply, useReportForumTarget, useLikeForumPost, useModerateThread, useHideForumPost, useFollowThread, useMarkBestAnswer, useClearBestAnswer } from "../../_api";
import { MentionRenderer } from "@/shared/components/MentionRenderer";

export default function ThreadPage() {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState("");
  const [reason, setReason] = useState("");
  const [reportPostId, setReportPostId] = useState<number | null>(null);
  const [postReason, setPostReason] = useState("");
  const auth = useAuthStore((state) => state.auth);
  const canModerate = auth?.roles.includes("ADMIN") || auth?.roles.includes("MODERATOR");

  const thread = useThreadDetail(slug);
  const reply = useReply(slug);
  const report = useReportForumTarget();
  const likePost = useLikeForumPost(slug);
  const moderateThread = useModerateThread(slug);
  const hidePost = useHideForumPost(slug);
  const followThread = useFollowThread(slug);
  const markBestAnswer = useMarkBestAnswer(slug);
  const clearBestAnswer = useClearBestAnswer(slug);
  const canManageAnswer = Boolean(thread.data && auth && (thread.data.thread.author === auth.username || canModerate));

  return (
    <PublicShell>
      {thread.isLoading ? <LoadingBlock /> : null}
      {thread.error ? <ErrorBlock message="Thread not found." /> : null}
      {thread.data ? (
        <section className="grid gap-5 md:grid-cols-[1fr_320px]">
          <div>
            <div className="panel touchline p-5">
              <p className="font-bold uppercase text-[var(--fv-muted)]">
                {thread.data.thread.category}
                {thread.data.thread.pinned ? " - PINNED" : ""}
                {thread.data.thread.locked ? " - LOCKED" : ""}
                {thread.data.thread.solved ? " - SOLVED" : " - OPEN"}
              </p>
              <h1 className="display-face text-4xl font-black">{thread.data.thread.title}</h1>
              <p suppressHydrationWarning className="mt-2 text-sm font-bold uppercase text-[var(--fv-muted)]">
                by {thread.data.thread.author} - {thread.data.thread.replyCount} replies - last activity {new Date(thread.data.thread.lastActivityAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {auth ? (
                  <button className="btn btn-secondary" disabled={followThread.isPending} onClick={() => followThread.mutate(thread.data.thread.id)}>
                    {thread.data.thread.followed ? "Following" : "Follow"}
                  </button>
                ) : null}
                {canManageAnswer && thread.data.thread.bestAnswerPostId ? (
                  <button className="btn btn-secondary" disabled={clearBestAnswer.isPending} onClick={() => clearBestAnswer.mutate(thread.data.thread.id)}>
                    Clear best answer
                  </button>
                ) : null}
              </div>
              {canModerate ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn btn-secondary" disabled={moderateThread.isPending} onClick={() => moderateThread.mutate({ id: thread.data.thread.id, action: "pin", value: !thread.data?.thread.pinned })}>
                    {thread.data.thread.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button className="btn btn-secondary" disabled={moderateThread.isPending} onClick={() => moderateThread.mutate({ id: thread.data.thread.id, action: "lock", value: !thread.data?.thread.locked })}>
                    {thread.data.thread.locked ? "Unlock" : "Lock"}
                  </button>
                  <button className="btn btn-secondary" disabled={moderateThread.isPending} onClick={() => moderateThread.mutate({ id: thread.data.thread.id, action: "hide", value: true })}>
                    Hide thread
                  </button>
                </div>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3">
              {thread.data.posts.length === 0 ? <div className="panel p-4">No posts yet.</div> : null}
              {thread.data.posts.map((post) => (
                <article className="panel p-4" key={post.id}>
                  <p suppressHydrationWarning className="font-bold">
                    {post.author} <span className="text-xs uppercase text-[var(--fv-muted)]">- {new Date(post.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}</span>
                  </p>
                  {thread.data.thread.bestAnswerPostId === post.id ? (
                    <p className="mt-2 inline-flex border border-[var(--fv-grass)] px-2 py-1 text-xs font-black uppercase text-[var(--fv-clay)]">
                      Best answer
                    </p>
                  ) : null}
                  <p className="mt-2 whitespace-pre-wrap">
                    <MentionRenderer content={post.content} />
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn btn-secondary" disabled={likePost.isPending} onClick={() => likePost.mutate(post.id)}>
                      {post.liked ? "Liked" : "Like"} {post.likeCount}
                    </button>
                    <button className="btn btn-secondary" onClick={() => setReportPostId(reportPostId === post.id ? null : post.id)}>
                      Report
                    </button>
                    {canModerate ? (
                      <button className="btn btn-secondary" disabled={hidePost.isPending} onClick={() => hidePost.mutate({ id: post.id, hidden: true })}>
                        Hide post
                      </button>
                    ) : null}
                    {canManageAnswer && thread.data.thread.bestAnswerPostId !== post.id ? (
                      <button className="btn btn-secondary" disabled={markBestAnswer.isPending} onClick={() => markBestAnswer.mutate({ threadId: thread.data.thread.id, postId: post.id })}>
                        Mark best answer
                      </button>
                    ) : null}
                  </div>
                  {reportPostId === post.id ? (
                    <form
                      className="mt-3 grid gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (postReason.trim()) report.mutate(
                          { targetType: "POST", targetId: post.id, reason: postReason },
                          { onSuccess: () => { setPostReason(""); setReportPostId(null); } }
                        );
                      }}
                    >
                      <textarea className="input min-h-20" value={postReason} onChange={(event) => setPostReason(event.target.value)} placeholder="Why report this post?" />
                      <button className="btn w-fit" disabled={report.isPending || !postReason.trim()}>
                        {report.isPending ? "Reporting..." : "Send report"}
                      </button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
            <form
              className="panel mt-4 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (content.trim() && thread.data?.thread.id) reply.mutate(
                  { threadId: thread.data.thread.id, content },
                  { onSuccess: () => setContent("") }
                );
              }}
            >
              <h2 className="font-black">Reply</h2>
              {reply.error ? <ErrorBlock message="Could not post reply." /> : null}
              <textarea className="input mt-3 min-h-28" value={content} onChange={(event) => setContent(event.target.value)} disabled={thread.data.thread.locked} />
              <button className="btn mt-3" disabled={reply.isPending || thread.data.thread.locked || !content.trim()}>
                {reply.isPending ? "Posting..." : thread.data.thread.locked ? "Thread locked" : "Reply"}
              </button>
            </form>
          </div>
          <aside className="panel h-fit p-4">
            <h2 className="display-face text-2xl font-black">Report thread</h2>
            {report.error ? <ErrorBlock message="Could not send report." /> : null}
            <textarea className="input mt-3 min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} />
            <button className="btn btn-secondary mt-3" onClick={() => {
              const tid = thread.data?.thread.id;
              if (reason.trim() && tid) report.mutate(
                { targetType: "THREAD", targetId: tid, reason },
                { onSuccess: () => setReason("") }
              );
            }} disabled={report.isPending || !reason.trim()}>
              {report.isPending ? "Reporting..." : "Report"}
            </button>
          </aside>
        </section>
      ) : null}
    </PublicShell>
  );
}
