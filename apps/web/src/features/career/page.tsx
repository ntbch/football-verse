"use client";

import { KeyboardEvent, useCallback, useEffect, useId, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SportsShell } from "@/shared/components/page-shell";
import { apiErrorMessage } from "@/shared/lib/api-client";
import { useAuthStore } from "@/shared/lib/auth-store";
import { Attempt, DailyGame, GameType, PlayerOption, minigameApi } from "./_minigame-api";

type Stage = "WHO_AM_I" | "GRID";
type GameSlug = "who-am-i" | "grid";
const slug: Record<GameType, GameSlug> = { WHO_AM_I: "who-am-i", GRID: "grid" };
const complete = (attempt?: Attempt | null) => Boolean(attempt && attempt.status !== "ACTIVE");
const expired = (attempt?: Attempt | null) => Boolean(attempt?.startedAt && Date.parse(attempt.startedAt) + 300_000 <= Date.now());

export default function CareerPage() {
  const auth = useAuthStore((state) => state.auth);
  const ready = useAuthStore((state) => state.ready);
  const [stage, setStage] = useState<Stage>("WHO_AM_I");
  const [overrides, setOverrides] = useState<Partial<Record<GameType, Attempt>>>({});
  const [claimSettledFor, setClaimSettledFor] = useState<number | null>(null);
  const claim = useMutation({ mutationFn: minigameApi.claim });
  const daily = useQuery({ queryKey: ["minigames", "daily", auth?.userId ?? "guest"], queryFn: minigameApi.daily, staleTime: 15_000, enabled: !auth || claimSettledFor === auth.userId });
  const canPlay = !auth || claimSettledFor === auth.userId;
  const syncDaily = useCallback(() => { setOverrides({}); void daily.refetch(); }, [daily]);
  useEffect(() => {
    if (!auth) { setClaimSettledFor(null); return; }
    setClaimSettledFor(null);
    claim.mutate(undefined, { onSettled: () => setClaimSettledFor(auth.userId) });
  }, [auth?.userId]);
  const games = daily.data?.games ?? [];
  const who = games.find((game) => game.type === "WHO_AM_I");
  const grid = games.find((game) => game.type === "GRID");
  const whoAttempt = overrides.WHO_AM_I ?? who?.attempt ?? null;
  const gridAttempt = overrides.GRID ?? grid?.attempt ?? null;
  const total = (whoAttempt?.score ?? 0) + (gridAttempt?.score ?? 0);
  const apply = (type: GameType, attempt: Attempt) => setOverrides((current) => ({ ...current, [type]: attempt }));
  const start = useMutation({ mutationFn: (type: GameType) => minigameApi.start(slug[type]), onSuccess: (attempt, type) => apply(type, attempt), onError: syncDaily });
  const date = daily.data && new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(`${daily.data.date}T12:00:00+07:00`));
  const runComplete = expired(whoAttempt) || (complete(whoAttempt) && complete(gridAttempt));

  return <SportsShell><main className="mx-auto min-h-[100dvh] max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
    <header className="border-b border-[var(--color-border)] pb-7">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><div>
        <p className="editorial-kicker">Daily Intel Run {date ? `· ${date}` : ""}</p>
        <h1 className="mt-2 font-serif text-4xl font-black tracking-tight md:text-5xl">Know the game. Name the player.</h1>
        <p className="mt-3 max-w-2xl text-[var(--color-text-secondary)]">One daily football challenge: investigate the player, then complete the scout board.</p>
      </div><div className="border-l-4 border-[var(--color-accent)] bg-[var(--color-surface-secondary)] px-5 py-3 text-right">
        <span className="block text-xs font-bold uppercase tracking-[.14em] text-[var(--color-text-secondary)]">Today&apos;s score</span><strong className="font-mono text-4xl tabular-nums">{total}<small className="ml-1 text-base text-[var(--color-text-secondary)]">/75</small></strong>
      </div></div>
      <ol className="mt-6 flex max-w-xl items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[var(--color-text-secondary)]"><li className={stage === "WHO_AM_I" ? "text-[var(--color-accent)]" : ""}>01 Evidence Room</li><span aria-hidden="true">—</span><li className={stage === "GRID" ? "text-[var(--color-accent)]" : ""}>02 Scout Board</li><span aria-hidden="true">—</span><li className={runComplete ? "text-[var(--color-accent)]" : ""}>03 Report</li></ol>
    </header>

    <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section aria-live="polite">
        {daily.isLoading && <Skeleton />}
        {!canPlay && <Skeleton />}
        {daily.isError && <State title="Could not load today&apos;s challenge" message={apiErrorMessage(daily.error, "Check your connection and try again.")} retry={() => daily.refetch()} />}
        {!daily.isLoading && !daily.isError && !ready && <Skeleton />}
        {!daily.isLoading && !daily.isError && ready && canPlay && stage === "WHO_AM_I" && who && <EvidenceRoom game={who} attempt={whoAttempt} pending={start.isPending} error={start.error ? apiErrorMessage(start.error, "Could not start the challenge.") : null} onStart={() => start.mutate("WHO_AM_I")} onAttempt={(attempt) => apply("WHO_AM_I", attempt)} onSync={syncDaily} onNext={() => setStage("GRID")} />}
        {!daily.isLoading && !daily.isError && ready && canPlay && stage === "GRID" && grid && <ScoutBoard game={grid} attempt={gridAttempt} unlocked={complete(whoAttempt)} runExpired={expired(whoAttempt)} pending={start.isPending} error={start.error ? apiErrorMessage(start.error, "Could not start the scout board.") : null} onStart={() => start.mutate("GRID")} onAttempt={(attempt) => apply("GRID", attempt)} onSync={syncDaily} onBack={() => setStage("WHO_AM_I")} />}
        {runComplete && <section className="mt-7 editorial-panel p-5"><p className="editorial-kicker">Daily report</p><h2 className="mt-1 font-serif text-3xl font-black">{total}/75</h2><p className="mt-2 text-[var(--color-text-secondary)]">Your official result is on today&apos;s board. Tomorrow brings a new investigation.</p></section>}
      </section>
      <Leaderboard />
    </div>
  </main></SportsShell>;
}


function EvidenceRoom({ game, attempt, pending, error, onStart, onAttempt, onSync, onNext }: { game: DailyGame; attempt: Attempt | null; pending: boolean; error: string | null; onStart: () => void; onAttempt: (attempt: Attempt) => void; onSync: () => void; onNext: () => void }) {
  if (!game.available) return <State title="Evidence is being prepared" message="Today&apos;s football data is still being verified. Please check back shortly." />;
  if (!attempt) return <Intro eyebrow="01 · Evidence Room" title="Who Am I?" body="Open only the evidence you need, then name the mystery player. Fewer clues and wrong guesses preserve more points." action="Start investigation" pending={pending} error={error} onStart={onStart} />;
  return <EvidenceRoomAttempt game={game} attempt={attempt} onAttempt={onAttempt} onSync={onSync} onNext={onNext} />;
}

function EvidenceRoomAttempt({ game, attempt, onAttempt, onSync, onNext }: { game: DailyGame; attempt: Attempt; onAttempt: (attempt: Attempt) => void; onSync: () => void; onNext: () => void }) {
  const clues = game.puzzle.clues ?? [];
  const initial = game.puzzle.initialClues ?? 2;
  const visible = Math.min(clues.length, initial + attempt.revealedClues);
  const reveal = useMutation({ mutationFn: () => minigameApi.reveal(attempt.id, attempt.version), onSuccess: onAttempt, onError: onSync });
  const lastWrong = [...(attempt.state.guesses ?? [])].reverse().find((guess) => !guess.correct);
  return <section className="editorial-panel p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="editorial-kicker">01 · Evidence Room</p><h2 className="mt-1 font-serif text-3xl font-black">Who Am I?</h2></div>{attempt.status === "ACTIVE" && <RunClock startedAt={attempt.startedAt} onExpire={onSync} />}<Meter value={attempt.score} label={`${Math.max(0, 3 - attempt.wrongGuesses)} guesses left`} /></div>
    <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_230px]"><div><ol className="border-y border-[var(--color-border)]">{clues.slice(0, visible).map((clue, index) => <li key={clue} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-[var(--color-border)] py-4 last:border-0"><strong className="font-mono text-sm text-[var(--color-accent)]">0{index + 1}</strong><span>{clue}</span></li>)}</ol>
      {attempt.status === "ACTIVE" && visible < clues.length && <button className="btn btn-secondary mt-5" disabled={reveal.isPending} onClick={() => reveal.mutate()}>{reveal.isPending ? "Opening…" : "Open another evidence card · −5 points"}</button>}
      {reveal.error && <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">{apiErrorMessage(reveal.error, "Could not open that evidence card.")}</p>}
      {attempt.status === "ACTIVE" && <PlayerPicker attempt={attempt} onAttempt={onAttempt} onError={onSync} />}
      {attempt.status !== "ACTIVE" && <div className="mt-6 border-t-2 border-[var(--color-text-primary)] pt-5"><strong>{expired(attempt) ? "The five-minute run has ended." : attempt.result.answerName ? `The player was ${attempt.result.answerName}.` : "Investigation complete."}</strong>{!expired(attempt) && <button className="btn btn-primary ml-3" onClick={onNext}>Continue to Scout Board</button>}</div>}
    </div><aside className="border-t-2 border-[var(--color-text-primary)] pt-4"><p className="editorial-kicker">Latest comparison</p>{lastWrong ? <Comparison guess={lastWrong} /> : <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">A wrong but valid guess reveals how its career facts compare with today&apos;s player.</p>}</aside></div>
  </section>;
}

function ScoutBoard({ game, attempt, unlocked, runExpired, pending, error, onStart, onAttempt, onSync, onBack }: { game: DailyGame; attempt: Attempt | null; unlocked: boolean; runExpired: boolean; pending: boolean; error: string | null; onStart: () => void; onAttempt: (attempt: Attempt) => void; onSync: () => void; onBack: () => void }) {
  const [activeCell, setActiveCell] = useState<string | null>(null);
  if (runExpired) return <State title="Today&apos;s run has ended" message="The five-minute daily window is over. A new challenge arrives tomorrow." />;
  if (!unlocked) return <State title="Finish the investigation first" message="Scout Board opens after you complete today&apos;s Who Am I? round." retry={onBack} retryLabel="Back to Evidence Room" />;
  if (!game.available) return <State title="Scout Board is being prepared" message="Today&apos;s football data is still being verified. Please check back shortly." />;
  if (!attempt) return <Intro eyebrow="02 · Scout Board" title="Football Grid" body="Find one unique footballer for every intersection. Each cell gets one deliberate lock." action="Start scout board" pending={pending} error={error} onStart={onStart} />;
  const rows = game.puzzle.rows ?? []; const columns = game.puzzle.columns ?? [];
  const cell = activeCell && !attempt.state.gridCells?.[activeCell] ? activeCell : null;
  return <section className="editorial-panel p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><button className="text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" onClick={onBack}>← Evidence Room</button><p className="editorial-kicker mt-3">02 · Scout Board</p><h2 className="mt-1 font-serif text-3xl font-black">Football Grid</h2></div>{attempt.status === "ACTIVE" && <RunClock startedAt={attempt.startedAt} onExpire={onSync} />}<Meter value={attempt.score} label={`${Math.max(0, 9 - Object.keys(attempt.state.gridCells ?? {}).length)} picks left`} /></div>
    <div className="mt-7 overflow-x-auto"><table className="w-full min-w-[650px] border-separate border-spacing-2"><thead><tr><th scope="col" /><>{columns.map((column) => <th key={column} scope="col" className="p-2 text-left text-sm font-bold">{column}</th>)}</></tr></thead><tbody>{rows.map((row) => <tr key={row}><th scope="row" className="p-2 text-left font-serif text-lg">{row}</th>{columns.map((column) => { const id = `${row}|${column}`; const result = attempt.state.gridCells?.[id]; return <td key={id} className={`min-w-36 border p-2 align-middle ${result?.correct ? "border-emerald-500 bg-emerald-500/10" : result ? "border-rose-500 bg-rose-500/10" : activeCell === id ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)]" : "border-[var(--color-border)] bg-[var(--color-surface-secondary)]"}`}><button type="button" disabled={Boolean(result) || attempt.status !== "ACTIVE"} onClick={() => setActiveCell(id)} className="min-h-16 w-full text-left text-sm font-bold disabled:cursor-default">{result ? <><span className="block">{result.playerName}</span><small className="mt-1 block text-xs">{result.correct ? "Locked · correct" : "Locked"}</small></> : <span className="text-[var(--color-text-secondary)]">{activeCell === id ? "Choose below" : "Select cell"}</span>}</button></td>; })}</tr>)}</tbody></table></div>
    {cell ? <div className="mt-6 border-t-2 border-[var(--color-text-primary)] pt-5"><p className="editorial-kicker">Scout Terminal</p><h3 className="mt-1 font-serif text-2xl font-black">{cell.replace("|", " × ")}</h3><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Search once, preview a player, then lock the answer for this cell.</p><PlayerPicker attempt={attempt} cell={cell} onAttempt={(next) => { onAttempt(next); setActiveCell(null); }} onError={onSync} /></div> : <p className="mt-6 text-sm text-[var(--color-text-secondary)]">Select an open cell to use the Scout Terminal.</p>}
  </section>;
}

function PlayerPicker({ attempt, cell, onAttempt, onError }: { attempt: Attempt; cell?: string; onAttempt: (attempt: Attempt) => void; onError: () => void }) {
  const [query, setQuery] = useState(""); const [selected, setSelected] = useState<PlayerOption | null>(null); const [active, setActive] = useState(0); const listId = useId();
  const search = useQuery({ queryKey: ["minigames", "players", query], queryFn: () => minigameApi.players(query), enabled: attempt.status === "ACTIVE" && query.trim().length >= 2 });
  const options = search.data ?? [];
  const guess = useMutation({ mutationFn: () => minigameApi.guess(attempt.id, { playerId: selected!.id, cell, version: attempt.version }), onSuccess: (next) => { onAttempt(next); setQuery(""); setSelected(null); }, onError });
  const choose = (player: PlayerOption) => { setSelected(player); setQuery(player.name); };
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => { if (!options.length) return; if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(value + 1, options.length - 1)); } else if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)); } else if (event.key === "Enter" && !selected) { event.preventDefault(); choose(options[active]); } else if (event.key === "Escape") { setQuery(""); setSelected(null); } };
  return <form className="mt-6 max-w-xl" onSubmit={(event) => { event.preventDefault(); if (selected) guess.mutate(); }}><label className="block text-sm font-bold" htmlFor={listId}>Name a player</label><div className="relative mt-2 flex gap-2"><div className="min-w-0 flex-1"><input id={listId} className="input w-full" role="combobox" aria-autocomplete="list" aria-expanded={Boolean(options.length)} aria-controls={`${listId}-options`} aria-activedescendant={options[active] ? `${listId}-${options[active].id}` : undefined} autoComplete="off" value={query} placeholder="Type at least two letters" onKeyDown={keyDown} onChange={(event) => { setQuery(event.target.value); setSelected(null); setActive(0); }} />{options.length > 0 && <ul id={`${listId}-options`} role="listbox" className="absolute z-10 mt-1 max-h-52 w-full overflow-auto border border-[var(--color-border)] bg-[var(--color-background-surface)] shadow-[var(--shadow-premium)]">{options.map((player, index) => <li key={player.id} id={`${listId}-${player.id}`} role="option" aria-selected={selected?.id === player.id}><button type="button" className={`block w-full px-3 py-2 text-left text-sm ${index === active ? "bg-[var(--color-surface-hover)]" : ""}`} onMouseEnter={() => setActive(index)} onClick={() => choose(player)}>{player.name}</button></li>)}</ul>}</div><button className="btn btn-primary" disabled={!selected || guess.isPending}>{guess.isPending ? "Checking…" : cell ? "Lock answer" : "Submit"}</button></div>{guess.error && <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{apiErrorMessage(guess.error, "Could not save that answer. Your latest state is still visible.")}</p>}</form>;
}

function Comparison({ guess }: { guess: Attempt["state"]["guesses"][number] }) { return <><strong className="mt-3 block">{guess.playerName}</strong><dl className="mt-3 divide-y divide-[var(--color-border)] text-sm">{Object.entries(guess.comparison).map(([label, value]) => <div key={label} className="flex justify-between gap-3 py-2"><dt className="capitalize text-[var(--color-text-secondary)]">{label.replace(/([A-Z])/g, " $1")}</dt><dd className="font-mono text-xs font-bold">{value.toUpperCase()}</dd></div>)}</dl></>; }
function Meter({ value, label }: { value: number; label: string }) { return <div className="text-right"><strong className="block font-mono text-3xl tabular-nums">{value}</strong><span className="text-xs font-bold uppercase tracking-[.1em] text-[var(--color-text-secondary)]">{label}</span></div>; }
function RunClock({ startedAt, onExpire }: { startedAt: string; onExpire: () => void }) {
  const remaining = () => Math.max(0, Math.ceil((Date.parse(startedAt) + 300_000 - Date.now()) / 1000));
  const [seconds, setSeconds] = useState(remaining);
  useEffect(() => { let refreshed = false; const update = () => { const next = remaining(); setSeconds(next); if (next === 0 && !refreshed) { refreshed = true; onExpire(); } }; update(); const timer = window.setInterval(update, 1_000); return () => window.clearInterval(timer); }, [startedAt, onExpire]);
  return <div className="text-right"><strong className="block font-mono text-3xl tabular-nums">{`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}</strong><span className="text-xs font-bold uppercase tracking-[.1em] text-[var(--color-text-secondary)]">Run time left</span></div>;
}
function Intro({ eyebrow, title, body, action, pending, error, onStart }: { eyebrow: string; title: string; body: string; action: string; pending: boolean; error: string | null; onStart: () => void }) { return <section className="editorial-panel p-6 md:p-8"><p className="editorial-kicker">{eyebrow}</p><h2 className="mt-2 font-serif text-3xl font-black">{title}</h2><p className="mt-3 max-w-xl text-[var(--color-text-secondary)]">{body}</p><button className="btn btn-primary mt-6" disabled={pending} onClick={onStart}>{pending ? "Starting…" : action}</button>{error && <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}</section>; }
function Leaderboard() { const board = useQuery({ queryKey: ["minigames", "leaderboard", "combined"], queryFn: () => minigameApi.leaderboard("combined"), staleTime: 15_000 }); return <aside className="border-t-2 border-[var(--color-text-primary)] pt-4 lg:sticky lg:top-6 lg:self-start"><p className="editorial-kicker">Today</p><h2 className="mt-1 font-serif text-2xl font-black">Leaderboard</h2>{board.data?.yourRank && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Your rank: #{board.data.yourRank}</p>}<ol className="mt-4 divide-y divide-[var(--color-border)]">{board.data?.entries.slice(0, 10).map((entry) => <li key={`${entry.rank}-${entry.username}`} className="grid grid-cols-[2rem_1fr_auto] gap-2 py-3 text-sm"><span className="font-mono text-[var(--color-text-secondary)]">{entry.rank}</span><strong className="truncate">{entry.displayName}</strong><span className="font-mono">{entry.score}</span></li>)}{board.isLoading && [1, 2, 3, 4].map((id) => <li key={id} className="my-3 h-7 animate-pulse bg-[var(--color-surface-secondary)]" />)}{board.isError && <li className="py-4 text-sm text-rose-700 dark:text-rose-300">Leaderboard is unavailable.</li>}{board.data && !board.data.entries.length && <li className="py-4 text-sm text-[var(--color-text-secondary)]">No completed runs yet.</li>}</ol></aside>; }
function Skeleton() { return <div className="space-y-4"><div className="h-8 w-48 animate-pulse bg-[var(--color-surface-secondary)]" /><div className="h-64 animate-pulse bg-[var(--color-surface-secondary)]" /></div>; }
function State({ title, message, retry, retryLabel = "Try again" }: { title: string; message: string; retry?: () => void; retryLabel?: string }) { return <section className="editorial-panel p-6"><h2 className="font-serif text-2xl font-black">{title}</h2><p className="mt-2 text-[var(--color-text-secondary)]">{message}</p>{retry && <button className="btn btn-secondary mt-5" onClick={retry}>{retryLabel}</button>}</section>; }
