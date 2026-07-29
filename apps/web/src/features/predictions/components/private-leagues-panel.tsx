"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useCreatePrivateLeague, useJoinPrivateLeague, usePrivateLeagues } from "../api";

export function PrivateLeaguesPanel({ authenticated }: { authenticated: boolean }) {
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [page, setPage] = useState(0);
  const createRequestId = useRef<string | null>(null);
  const { data: leagues, isLoading, isError, refetch } = usePrivateLeagues(authenticated, page);
  const create = useCreatePrivateLeague();
  const join = useJoinPrivateLeague();

  if (!authenticated) return <section className="card p-5 border border-[var(--color-border)] rounded-2xl shadow-xs"><h2 className="m-0 font-serif text-lg font-black text-[var(--color-text-primary)]">Private leagues</h2><p className="m-0 mt-2 text-sm text-[var(--color-text-secondary)]">Create a league or join friends with an invite code.</p><Link className="mt-3 inline-flex min-h-11 items-center text-xs font-bold text-[var(--color-accent)] hover:underline" href="/login?next=%2Fpredictions">Login to join</Link></section>;

  return <section className="card p-5 border border-[var(--color-border)] rounded-2xl shadow-xs" aria-labelledby="private-leagues-title">
    <h2 className="m-0 font-serif text-lg font-black text-[var(--color-text-primary)]" id="private-leagues-title">Private leagues</h2>
    <div className="mt-3 grid gap-2">
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (name.trim()) { createRequestId.current ??= crypto.randomUUID(); create.mutate({ name: name.trim(), requestId: createRequestId.current }, { onSuccess: () => { setName(""); createRequestId.current = null; } }); } }}><input aria-label="Private league name" className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-surface)] px-3 text-xs" maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="League name" required value={name} /><button className="min-h-11 rounded-xl bg-[var(--color-accent)] px-3 text-xs font-bold text-[var(--color-text-inverse)] disabled:opacity-50" disabled={create.isPending} type="submit">Create</button></form>
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (inviteCode.trim()) join.mutate(inviteCode.trim(), { onSuccess: () => setInviteCode("") }); }}><input aria-label="Private league invite code" className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-surface)] px-3 font-mono text-xs uppercase" maxLength={8} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} placeholder="Invite code" required value={inviteCode} /><button className="min-h-11 rounded-xl border border-[var(--color-border)] px-3 text-xs font-bold text-[var(--color-text-primary)] disabled:opacity-50" disabled={join.isPending} type="submit">Join</button></form>
    </div>
    {create.isError || join.isError ? <p className="m-0 mt-2 text-xs text-[var(--color-danger)]">Could not save private league. Check the invite code and try again.</p> : null}
    {isLoading ? <LoadingBlock label="Loading private leagues" /> : isError ? <ErrorBlock message="Could not load private leagues." onRetry={() => void refetch()} /> : (leagues?.content.length ?? 0) === 0 ? <p className="m-0 mt-4 text-sm text-[var(--color-text-secondary)]">No private leagues yet.</p> : <><div className="mt-4 grid gap-3">{leagues?.content.map((league) => <article className="rounded-xl border border-[var(--color-border)] p-3" key={league.id}><div className="flex items-center justify-between gap-2"><h3 className="m-0 text-sm font-black text-[var(--color-text-primary)]">{league.name}</h3>{league.inviteCode ? <code className="rounded bg-[var(--color-surface-muted)] px-2 py-1 text-xs font-bold text-[var(--color-text-primary)]">{league.inviteCode}</code> : null}</div><p className="m-0 mt-1 text-xs text-[var(--color-text-secondary)]">{league.memberCount} members</p><ol className="m-0 mt-2 list-none divide-y divide-[var(--color-border)] p-0">{league.members.map((member) => <li className="flex items-center justify-between gap-2 py-1.5 text-xs" key={member.userId}><span className="min-w-0 truncate text-[var(--color-text-primary)]">{member.rank}. {member.displayName}</span><span className="font-bold tabular-nums text-[var(--color-accent)]">{member.points}</span></li>)}</ol></article>)}</div>{(leagues?.totalPages ?? 0) > 1 ? <nav aria-label="Private league pages" className="mt-3 flex items-center justify-between gap-3"><button className="min-h-11 rounded-lg border border-[var(--color-border)] px-3 text-xs font-bold disabled:opacity-40" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} type="button">Previous</button><span className="text-xs font-semibold text-[var(--color-text-secondary)]">{page + 1} / {leagues?.totalPages}</span><button className="min-h-11 rounded-lg border border-[var(--color-border)] px-3 text-xs font-bold disabled:opacity-40" disabled={page >= (leagues?.totalPages ?? 1) - 1} onClick={() => setPage((value) => Math.min((leagues?.totalPages ?? 1) - 1, value + 1))} type="button">Next</button></nav> : null}</>}
  </section>;
}
