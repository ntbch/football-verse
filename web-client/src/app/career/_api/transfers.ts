"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/shared/lib/api-client";
import { qk } from "@/shared/lib/query-keys";
import type { PageResult, TransferMarketPage, TransferOffer } from "../_types";
import { body, game } from "./shared";

export const useTransferMarketPage = (saveId: string, clubId: string, page: number, query: string, enabled = true) => useQuery({
  queryKey: qk.game.key("market", saveId, clubId, "page", page, query),
  queryFn: ({ signal }) => body<TransferMarketPage>(http.get(game(`/saves/${saveId}/clubs/${clubId}/market/paged`), { params: { page, size: 25, q: query }, signal })),
  enabled: Boolean(saveId && clubId && enabled), placeholderData: (previous) => previous,
});
export const useTransferOffersPage = (saveId: string, clubId: string, page: number, query: string, enabled = true) => useQuery({
  queryKey: qk.game.key("offers", saveId, clubId, "page", page, query),
  queryFn: ({ signal }) => body<PageResult<TransferOffer>>(http.get(game(`/saves/${saveId}/clubs/${clubId}/offers/paged`), { params: { page, size: 25, q: query }, signal })),
  enabled: Boolean(saveId && clubId && enabled), placeholderData: (previous) => previous,
});

const transferMutation = <T,>(saveId: string, clubId: string, mutationFn: (value: T) => Promise<unknown>) => {
  const client = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => { client.invalidateQueries({ queryKey: qk.game.key("market", saveId, clubId) }); client.invalidateQueries({ queryKey: qk.game.key("offers", saveId, clubId) }); client.invalidateQueries({ queryKey: qk.game.squad(saveId, clubId) }); } });
};
export const useScoutPlayer = (saveId: string, clubId: string) => transferMutation(saveId, clubId, (playerId: string) => http.post(game(`/saves/${saveId}/clubs/${clubId}/scouting/${playerId}`)));
export const useSubmitOffer = (saveId: string, clubId: string) => transferMutation(saveId, clubId, (request: { playerId: string; fee: number }) => body<TransferOffer>(http.post(game(`/saves/${saveId}/clubs/${clubId}/offers`), request)));
export const useOfferTerms = (saveId: string, clubId: string) => transferMutation(saveId, clubId, (request: { offerId: string; wage: number; contractYears: number; squadRole: string }) => { const { offerId, ...payload } = request; return body<TransferOffer>(http.post(game(`/saves/${saveId}/clubs/${clubId}/offers/${offerId}/terms`), payload)); });
export const useCompleteTransfer = (saveId: string, clubId: string) => transferMutation(saveId, clubId, (offerId: string) => body<TransferOffer>(http.post(game(`/saves/${saveId}/clubs/${clubId}/offers/${offerId}/complete`))));
export const useSetTransferStatus = (saveId: string, clubId: string) => transferMutation(saveId, clubId, (request: { playerId: string; status: string }) => http.patch(game(`/saves/${saveId}/clubs/${clubId}/players/${request.playerId}/transfer-status`), { status: request.status }));
