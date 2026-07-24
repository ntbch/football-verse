"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { PublicShell } from "@/shared/components/page-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useToast } from "@/shared/components/toast";
import { apiBaseUrl, apiErrorMessage, data, http } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import { qk } from "@/shared/lib/query-keys";
import { ReplyComposer } from "../../components/reply-composer";
import { ReportModal } from "../../components/report-modal";
import { ThreadHeader } from "../../components/thread-header";
import { ThreadPostList } from "../../components/thread-post-list";
import type { PostResponse, ThreadDetailResponse } from "../../types";

type RealtimeReply = { author?: string };

export default function ThreadDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const auth = useAuthStore((state) => state.auth);
  const queryClient = useQueryClient();
  const toast = useToast();
  const router = useRouter();
  const [replyText, setReplyText] = useState("");
  const [reportPostId, setReportPostId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (!auth?.accessToken) return;
    let socketUrl = "http://localhost:8000";
    try {
      socketUrl = new URL(apiBaseUrl).origin;
    } catch (error) {
      console.error("Failed to parse apiBaseUrl for socket connection", error);
    }

    const socket: Socket = io(socketUrl, {
      auth: { token: auth.accessToken },
      transports: ["polling", "websocket"],
    });
    socket.on("connect", () => socket.emit("join_thread", { slug }));
    socket.on("new_reply", (newPost: RealtimeReply) => {
      queryClient.invalidateQueries({ queryKey: qk.forum.thread(slug) });
      if (newPost.author && newPost.author !== auth.username) {
        toast({
          body: `${newPost.author} posted a new reply!`,
          type: "info",
          autoHideDuration: 3000,
        });
      }
    });

    return () => {
      socket.emit("leave_thread", { slug });
      socket.disconnect();
    };
  }, [slug, auth?.accessToken, auth?.username, queryClient, toast]);

  const { data: detail, isLoading, error } = useQuery({
    queryKey: qk.forum.thread(slug),
    queryFn: () => data<ThreadDetailResponse>(http.get(`/forum/threads/${slug}`)),
  });
  const thread = detail?.thread;
  const posts: PostResponse[] = detail?.posts ?? [];

  const invalidateThread = () =>
    queryClient.invalidateQueries({ queryKey: qk.forum.thread(slug) });

  const replyMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      data<PostResponse>(http.post(`/forum/threads/${id}/replies`, { content })),
    onSuccess: () => {
      invalidateThread();
      setReplyText("");
      toast({ body: "Reply posted!", type: "info", autoHideDuration: 3000 });
    },
    onError: (mutationError) =>
      toast({ body: apiErrorMessage(mutationError, "Failed to submit reply."), type: "error" }),
  });

  const likePostMutation = useMutation({
    mutationFn: (postId: number) =>
      data<{ liked: boolean }>(http.post(`/forum/posts/${postId}/like`)),
    onSuccess: invalidateThread,
    onError: (mutationError) =>
      toast({ body: apiErrorMessage(mutationError, "Failed to like post."), type: "error" }),
  });

  const bestAnswerMutation = useMutation({
    mutationFn: ({ threadId, postId }: { threadId: number; postId: number }) =>
      data<unknown>(http.post(`/forum/threads/${threadId}/best-answer`, { postId })),
    onSuccess: () => {
      invalidateThread();
      toast({ body: "Marked best answer!", type: "info" });
    },
    onError: (mutationError) =>
      toast({ body: apiErrorMessage(mutationError, "Failed to mark best answer."), type: "error" }),
  });

  const clearBestAnswerMutation = useMutation({
    mutationFn: (threadId: number) =>
      data<unknown>(http.delete(`/forum/threads/${threadId}/best-answer`)),
    onSuccess: () => {
      invalidateThread();
      toast({ body: "Cleared best answer.", type: "info" });
    },
    onError: (mutationError) =>
      toast({ body: apiErrorMessage(mutationError, "Failed to clear best answer."), type: "error" }),
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      data<unknown>(http.patch(`/moderator/forum/threads/${id}/pin`, null, { params: { value } })),
    onSuccess: () => {
      invalidateThread();
      toast({ body: "Thread pin status updated.", type: "info" });
    },
  });

  const lockMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      data<unknown>(http.patch(`/moderator/forum/threads/${id}/lock`, null, { params: { value } })),
    onSuccess: () => {
      invalidateThread();
      toast({ body: "Thread lock status updated.", type: "info" });
    },
  });

  const hidePostMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: boolean }) =>
      data<unknown>(http.patch(`/moderator/forum/posts/${id}/hide`, null, { params: { value } })),
    onSuccess: () => {
      invalidateThread();
      toast({ body: "Post visibility updated.", type: "info" });
    },
  });

  const reportMutation = useMutation({
    mutationFn: (payload: { threadId?: number; postId?: number; reason: string }) =>
      data<unknown>(http.post("/forum/reports", payload)),
    onSuccess: () => {
      toast({ body: "Content reported successfully. A moderator will review it.", type: "info" });
      closeReportModal();
    },
    onError: (mutationError) =>
      toast({ body: apiErrorMessage(mutationError, "Failed to submit report."), type: "error" }),
  });

  function closeReportModal() {
    setShowReportModal(false);
    setReportReason("");
    setReportPostId(null);
  }

  function handleReplySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) {
      toast({ body: "Please login to reply.", type: "info" });
      router.push("/login");
      return;
    }
    if (replyText.trim() && thread) {
      replyMutation.mutate({ id: thread.id, content: replyText.trim() });
    }
  }

  function handleReportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) {
      toast({ body: "Please login to report content.", type: "info" });
      return;
    }
    if (!reportReason.trim() || !thread) return;
    reportMutation.mutate(
      reportPostId
        ? { postId: reportPostId, reason: reportReason.trim() }
        : { threadId: thread.id, reason: reportReason.trim() },
    );
  }

  if (isLoading) {
    return <PublicShell><LoadingBlock label="Loading Discussion Thread" /></PublicShell>;
  }
  if (error || !thread) {
    return (
      <PublicShell>
        <ErrorBlock message="Thread not found or failed to load discussion detail." />
      </PublicShell>
    );
  }

  const canModerate = Boolean(
    auth?.roles?.some((role) => role === "ADMIN" || role === "MODERATOR"),
  );

  return (
    <PublicShell>
      <div className="mx-auto mt-4 flex w-full max-w-4xl animate-fade-in flex-col gap-6">
        <ThreadHeader
          thread={thread}
          canModerate={canModerate}
          onTogglePinned={() => pinMutation.mutate({ id: thread.id, value: !thread.pinned })}
          onToggleLocked={() => lockMutation.mutate({ id: thread.id, value: !thread.locked })}
        />
        <ThreadPostList
          thread={thread}
          posts={posts}
          currentUsername={auth?.username}
          canModerate={canModerate}
          onReport={(postId) => {
            setReportPostId(postId);
            setShowReportModal(true);
          }}
          onToggleHidden={(post) =>
            hidePostMutation.mutate({ id: post.id, value: !post.hidden })
          }
          onToggleLiked={(postId) => likePostMutation.mutate(postId)}
          onMarkBestAnswer={(postId) => bestAnswerMutation.mutate({ threadId: thread.id, postId })}
          onClearBestAnswer={() => clearBestAnswerMutation.mutate(thread.id)}
        />
        <ReplyComposer
          locked={thread.locked}
          authenticated={Boolean(auth)}
          value={replyText}
          pending={replyMutation.isPending}
          onChange={setReplyText}
          onSubmit={handleReplySubmit}
        />
        {showReportModal && (
          <ReportModal
            reason={reportReason}
            pending={reportMutation.isPending}
            onReasonChange={setReportReason}
            onCancel={closeReportModal}
            onSubmit={handleReportSubmit}
          />
        )}
      </div>
    </PublicShell>
  );
}
