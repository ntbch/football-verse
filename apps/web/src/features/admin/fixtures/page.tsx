"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { http, data, apiErrorMessage } from "@/shared/lib/api-client";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import { useToast } from "@/shared/components/toast";

type Fixture = {
  id: number;
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status: string;
  kickoff: string;
  leagueSlug: string;
  round?: string;
  scored: boolean;
  scoredAt?: string | null;
  lastSyncedAt?: string | null;
};

type PageResponse<T> = {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

export default function AdminFixturesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Filters & Pagination state
  const [page, setPage] = useState(0);
  const [league, setLeague] = useState("");
  const [round, setRound] = useState("");
  const [status, setStatus] = useState("");
  const [scored, setScored] = useState<string>("");

  // Query rounds for the selected league
  const { data: matchCentre } = useQuery({
    queryKey: ["admin-rounds", league],
    queryFn: () => {
      const targetLeague = league || "premier-league";
      return data<{ rounds: string[] }>(http.get(`/predictions/match-centre?league=${targetLeague}`));
    },
  });
  const rounds = matchCentre?.rounds ?? [];

  // Query fixtures
  const { data: pageData, isLoading, isPlaceholderData, error, refetch } = useQuery({
    queryKey: ["admin-fixtures", page, league, round, status, scored],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        size: "15",
      });
      if (league) params.set("league", league);
      if (round) params.set("round", round);
      if (status) params.set("status", status);
      if (scored !== "") params.set("scored", scored);

      return data<PageResponse<Fixture>>(http.get(`/admin/fixtures?${params.toString()}`));
    },
    placeholderData: (previousData) => previousData,
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: (targetLeague: string) =>
      data<string>(http.post(`/admin/fixtures/sync?league=${targetLeague}`)),
    onSuccess: (msg) => {
      queryClient.invalidateQueries({ queryKey: ["admin-fixtures"] });
      toast({ body: msg || "League fixtures sync completed successfully",  });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Sync failed."), type: "error" }),
  });

  // Score mutation
  const scoreMutation = useMutation({
    mutationFn: (id: number) =>
      data<string>(http.post(`/admin/fixtures/${id}/score`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fixtures"] });
      toast({ body: "Fixture predictions scored successfully",  });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Scoring failed."), type: "error" }),
  });

  // Rescore mutation
  const rescoreMutation = useMutation({
    mutationFn: (id: number) =>
      data<string>(http.post(`/admin/fixtures/${id}/rescore`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fixtures"] });
      toast({ body: "Fixture calculations updated successfully",  });
    },
    onError: (err) => toast({ body: apiErrorMessage(err, "Rescoring failed."), type: "error" }),
  });

  const fixtures = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 0;
  const totalElements = pageData?.totalElements ?? 0;

  useEffect(() => {
    if (totalPages > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-black font-serif-title tracking-tight m-0 whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>Fixtures & Predictions Control</h1>
          <span className="text-[11px] whitespace-nowrap px-2 py-0.5 rounded-full font-bold bg-[var(--color-surface-hover)]" style={{ color: "var(--color-text-secondary)" }}>{totalElements} total fixtures</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => syncMutation.mutate(league || "premier-league")}
            disabled={syncMutation.isPending}
            className="px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-150 active:scale-[0.97] bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:opacity-90 shadow-sm disabled:opacity-50"
          >
            {syncMutation.isPending ? "Syncing..." : `Sync ${league || "Premier League"}`}
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-surface)]">
        {/* League Slug Select */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Filter by League</label>
          <select
            value={league}
            onChange={(e) => { setLeague(e.target.value); setRound(""); setPage(0); }}
            className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-background-body)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          >
            <option value="">All Leagues</option>
            <option value="premier-league">Premier League</option>
            <option value="laliga">La Liga</option>
            <option value="serie-a">Serie A</option>
            <option value="bundesliga">Bundesliga</option>
          </select>
        </div>

        {/* Round Select */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Filter by Round</label>
          <select
            value={round}
            onChange={(e) => { setRound(e.target.value); setPage(0); }}
            className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-background-body)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          >
            <option value="">All Rounds</option>
            {rounds.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Status Select */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Status</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-background-body)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          >
            <option value="">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="result">Result (Finished)</option>
          </select>
        </div>

        {/* Scored Select */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Scored Status</label>
          <select
            value={scored}
            onChange={(e) => { setScored(e.target.value); setPage(0); }}
            className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-background-body)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          >
            <option value="">All</option>
            <option value="true">Scored</option>
            <option value="false">Unscored</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading && fixtures.length === 0 ? (
        <LoadingBlock label="Fetching fixtures database..." />
      ) : error && fixtures.length === 0 ? (
        <ErrorBlock message="Fixtures could not be loaded." onRetry={() => refetch()} />
      ) : (
        <div className="flex flex-col gap-4">
          {error ? <ErrorBlock message="Fixtures could not be refreshed. Showing the last available results." onRetry={() => refetch()} /> : null}
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-background-surface)]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  <th className="px-4 py-3 font-bold" style={{ color: "var(--color-text-secondary)" }}>Match Details</th>
                  <th className="px-4 py-3 font-bold" style={{ color: "var(--color-text-secondary)" }}>Kickoff Time</th>
                  <th className="px-4 py-3 font-bold text-center" style={{ color: "var(--color-text-secondary)" }}>Result</th>
                  <th className="px-4 py-3 font-bold text-center" style={{ color: "var(--color-text-secondary)" }}>Status</th>
                  <th className="px-4 py-3 font-bold text-center" style={{ color: "var(--color-text-secondary)" }}>Scoring</th>
                  <th className="px-4 py-3 font-bold text-right" style={{ color: "var(--color-text-secondary)" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                {fixtures.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center" style={{ color: "var(--color-text-secondary)" }}>
                      No matches found matching search filters.
                    </td>
                  </tr>
                ) : (
                  fixtures.map((f) => (
                    <tr key={f.id} className="hover:bg-[var(--color-surface-hover)] transition-all">
                      <td className="px-4 py-3">
                        <div className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                          {f.homeTeam} vs {f.awayTeam}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                          League: <span className="font-bold">{f.leagueSlug}</span> {f.round ? `• ${f.round}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>
                        {formatDateTime(f.kickoff)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {f.status === "result" || f.homeScore !== null ? (
                          <span className="font-mono font-black text-sm px-2 py-0.5 rounded bg-[var(--color-surface-hover)]">
                            {f.homeScore} - {f.awayScore}
                          </span>
                        ) : (
                          <span className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          style={{
                            backgroundColor:
                              f.status === "result"
                                ? "var(--color-success-muted)"
                                : f.status === "live"
                                ? "color-mix(in srgb, var(--color-danger) 12%, transparent)"
                                : "color-mix(in srgb, var(--color-neutral) 12%, transparent)",
                            color:
                              f.status === "result"
                                ? "var(--color-success)"
                                : f.status === "live"
                                ? "var(--color-danger)"
                                : "var(--color-neutral)",
                          }}
                          className="px-2 py-0.5 rounded-full font-bold text-[10px] capitalize inline-block"
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {f.scored ? (
                          <div className="flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">Scored</span>
                            {f.scoredAt && (
                              <span className="text-[9px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                                {formatDate(f.scoredAt, { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-[var(--color-surface-muted)] text-[var(--color-neutral)]">Unscored</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {f.status === "result" && !f.scored && (
                            <button
                              onClick={() => scoreMutation.mutate(f.id)}
                              disabled={scoreMutation.isPending}
                              className="px-3 py-1 rounded bg-[var(--color-success)] text-[var(--color-text-inverse)] font-bold hover:opacity-90 transition active:scale-[0.96] disabled:opacity-50"
                            >
                              Score Predictions
                            </button>
                          )}
                          {f.scored && (
                            <button
                              onClick={() => rescoreMutation.mutate(f.id)}
                              disabled={rescoreMutation.isPending}
                              className="px-3 py-1 rounded border border-[var(--color-danger)]/30 text-[var(--color-danger)] font-bold hover:bg-[var(--color-danger)]/10 transition active:scale-[0.96] disabled:opacity-50"
                            >
                              Rescore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isPlaceholderData}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-semibold bg-[var(--color-background-surface)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40 transition"
              >
                Previous Page
              </button>
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                Page <span className="font-bold text-[var(--color-text-primary)]">{page + 1}</span> of <span className="font-bold text-[var(--color-text-primary)]">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || isPlaceholderData}
                className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-semibold bg-[var(--color-background-surface)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40 transition"
              >
                Next Page
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
