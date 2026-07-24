"use client";

import {
  useAcceptManagerJob, useActiveMatchSession, useAdvanceDay, useCareer, useCareerSaves, useCareerTactics,
  useCompleteTransfer, useCreateCareer, useDeleteCareer, useManager, useManagerDecisions, useManagerJobs,
  useNextSeason, useOfferTerms, usePlayerAnalysis, usePlayerStatsPage, useRenameCareer, useSaveCareerTactics,
  useScoutPlayer, useSetTransferStatus, useSquad, useStandings, useStartMatchSession, useSubmitOffer,
  useTrainingFocus, useTransferMarketPage, useTransferOffersPage,
} from "../_api";
import type { SubTab, Tab } from "../_navigation";

export function useCareerData({ saveId, tab, subTab, page, query, selectedFixtureId, selectedMarketId, authEnabled }: {
  saveId: string; tab: Tab; subTab: SubTab | ""; page: number; query: string;
  selectedFixtureId: string; selectedMarketId: string; authEnabled: boolean;
}) {
  const saves = useCareerSaves(authEnabled);
  const create = useCreateCareer();
  const career = useCareer(saveId);
  const managedClubId = career.data?.save.managedClubId ?? "";
  const fixture = career.data?.fixtures.find((item) => item.status === "SCHEDULED" && item.matchDate <= career.data.save.gameDate
    && (item.homeClubId === managedClubId || item.awayClubId === managedClubId));
  const nextFixture = career.data?.fixtures.find((item) => item.status === "SCHEDULED"
    && (item.homeClubId === managedClubId || item.awayClubId === managedClubId));
  const squad = useSquad(saveId, managedClubId);
  const savedTactics = useCareerTactics(saveId);
  const saveTactics = useSaveCareerTactics(saveId);
  const playerAnalysis = usePlayerAnalysis(saveId, managedClubId);
  const standings = useStandings(saveId);
  const playerStats = usePlayerStatsPage(saveId, tab === "table" && subTab === "player-stats" ? page : 0,
    tab === "table" && subTab === "player-stats" ? query : "", tab === "table" && subTab === "player-stats");
  const manager = useManager(saveId);
  const managerDecisions = useManagerDecisions(saveId);
  const managerJobs = useManagerJobs(saveId);
  const acceptManagerJob = useAcceptManagerJob(saveId);
  const market = useTransferMarketPage(saveId, managedClubId, tab === "transfers" && subTab === "market" ? page : 0,
    tab === "transfers" && subTab === "market" ? query : "", tab === "transfers");
  const offers = useTransferOffersPage(saveId, managedClubId, tab === "transfers" && subTab === "negotiations" ? page : 0,
    tab === "transfers" && subTab === "negotiations" ? query : "", tab === "transfers" && subTab === "negotiations");
  const activeSession = useActiveMatchSession(saveId);
  const startSession = useStartMatchSession(saveId, fixture?.id ?? "");
  const advance = useAdvanceDay(saveId);
  const nextSeason = useNextSeason(saveId);
  const training = useTrainingFocus(saveId);
  const renameCareer = useRenameCareer(saveId);
  const deleteCareer = useDeleteCareer(saveId);
  const scout = useScoutPlayer(saveId, managedClubId);
  const submitOffer = useSubmitOffer(saveId, managedClubId);
  const offerTerms = useOfferTerms(saveId, managedClubId);
  const completeTransfer = useCompleteTransfer(saveId, managedClubId);
  const setTransferStatus = useSetTransferStatus(saveId, managedClubId);
  const normalizedQuery = query.toLocaleLowerCase();
  const visibleFixtures = career.data?.fixtures.filter((item) => (subTab === "results" ? item.status === "PLAYED" : item.status === "SCHEDULED")
    && (!normalizedQuery || `${item.homeClubName} ${item.awayClubName}`.toLocaleLowerCase().includes(normalizedQuery))) ?? [];

  return { saves, create, career, managedClubId, fixture, nextFixture, squad, savedTactics, saveTactics,
    playerAnalysis, standings, playerStats, manager, managerDecisions, managerJobs, acceptManagerJob, market,
    offers, activeSession, startSession, advance, nextSeason, training, renameCareer, deleteCareer, scout,
    submitOffer, offerTerms, completeTransfer, setTransferStatus, visibleFixtures,
    selectedFixture: career.data?.fixtures.find((item) => item.id === selectedFixtureId),
    selectedMarket: market.data?.items.find((item) => item.playerId === selectedMarketId) };
}
