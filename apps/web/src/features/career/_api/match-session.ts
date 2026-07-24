"use client";

import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/lib/api-client";
import { qk } from "@/shared/lib/query-keys";
import type { MatchResult, MatchSessionAction, MatchSessionCommand, MatchSessionSnapshot, StartMatchSessionRequest } from "../_types";
import { body, game } from "./shared";

const sessionKey = (saveId: string, sessionId = "active") => qk.game.key("match-session", saveId, sessionId);
const conflictSession = (error: unknown) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) return undefined;
  const payload = error.response.data as { session?: MatchSessionSnapshot; data?: { session?: MatchSessionSnapshot } } | undefined;
  return payload?.session ?? payload?.data?.session;
};

export const useStoredMatch = (saveId: string, matchId: string) => useQuery({ queryKey: qk.game.match(saveId, matchId), queryFn: () => body<MatchResult>(http.get(game(`/saves/${saveId}/matches/${matchId}`))), enabled: Boolean(saveId && matchId) });
export const useActiveMatchSession = (saveId: string) => useQuery({
  queryKey: sessionKey(saveId),
  queryFn: async () => { const response = await http.get<MatchSessionSnapshot>(game(`/saves/${saveId}/match-session`)); return response.status === 204 ? null : response.data; },
  enabled: Boolean(saveId), retry: false,
});
export const useMatchSession = (saveId: string, sessionId: string) => useQuery({ queryKey: sessionKey(saveId, sessionId), queryFn: () => body<MatchSessionSnapshot>(http.get(game(`/saves/${saveId}/match-sessions/${sessionId}`))), enabled: Boolean(saveId && sessionId) });

export const useStartMatchSession = (saveId: string, fixtureId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: StartMatchSessionRequest) => body<MatchSessionSnapshot>(http.post(game(`/saves/${saveId}/fixtures/${fixtureId}/match-session`), request)),
    onSuccess: (session) => { client.setQueryData(sessionKey(saveId), session); client.setQueryData(sessionKey(saveId, session.id), session); },
    onError: (error) => { const session = conflictSession(error); if (session) client.setQueryData(sessionKey(saveId), session); else client.invalidateQueries({ queryKey: sessionKey(saveId) }); },
  });
};

const useSessionMutation = (saveId: string, sessionId: string, endpoint: string) => {
  const client = useQueryClient();
  const store = (session: MatchSessionSnapshot) => { client.setQueryData(sessionKey(saveId), session); client.setQueryData(sessionKey(saveId, sessionId), session); };
  return useMutation({
    mutationFn: (request: MatchSessionAction | MatchSessionCommand) => body<MatchSessionSnapshot>(http.post(game(`/saves/${saveId}/match-sessions/${sessionId}/${endpoint}`), request)),
    onSuccess: store,
    onError: (error) => { const session = conflictSession(error); if (session) store(session); else client.invalidateQueries({ queryKey: sessionKey(saveId, sessionId) }); },
  });
};
export const useContinueMatchSession = (saveId: string, sessionId: string) => useSessionMutation(saveId, sessionId, "continue");
export const useMatchSessionCommand = (saveId: string, sessionId: string) => useSessionMutation(saveId, sessionId, "command");

export const useAbandonMatchSession = (saveId: string, sessionId: string) => {
  const client = useQueryClient();
  return useMutation({ mutationFn: (request: MatchSessionAction) => http.post(game(`/saves/${saveId}/match-sessions/${sessionId}/abandon`), request), onSuccess: () => { client.setQueryData(sessionKey(saveId), null); client.removeQueries({ queryKey: sessionKey(saveId, sessionId) }); }, onError: () => client.invalidateQueries({ queryKey: sessionKey(saveId, sessionId) }) });
};
export const useFinishMatchSession = (saveId: string, sessionId: string) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: MatchSessionAction) => body<{ matchId: string }>(http.post(game(`/saves/${saveId}/match-sessions/${sessionId}/finish`), request)),
    onSuccess: () => { client.setQueryData(sessionKey(saveId), null); client.invalidateQueries({ queryKey: qk.game.save(saveId) }); client.invalidateQueries({ queryKey: qk.game.key("squad", saveId) }); client.invalidateQueries({ queryKey: qk.game.standings(saveId) }); },
    onError: (error) => { const session = conflictSession(error); if (session) client.setQueryData(sessionKey(saveId, sessionId), session); else client.invalidateQueries({ queryKey: sessionKey(saveId, sessionId) }); },
  });
};
