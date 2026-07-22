"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { SportsShell } from "@/shared/components/page-shell";
import { ErrorBlock, LoadingBlock } from "@/shared/components/state-blocks";
import { useAuthStore } from "@/shared/lib/auth-store";
import type { Player } from "./_types";
import { PlayerInspector } from "./_components/player-inspector";
import { SubTabs } from "./_components/sub-tabs";
import { CareerLauncher } from "./_components/career-launcher";
import { CareerSidebar } from "./_components/career-sidebar";
import { CareerContextHeader } from "./_components/career-context-header";
import { FixtureDetail, MarketDetail } from "./_components/career-detail-panels";
import { FormationPreview } from "./_components/formation-preview";
import { FixturesTab } from "./_components/fixtures-tab";
import { HistoryTab } from "./_components/history-tab";
import { ManagerTab } from "./_components/manager-tab";
import { OverviewTab } from "./_components/overview-tab";
import { SquadTab } from "./_components/squad-tab";
import { TableTab } from "./_components/table-tab";
import { TacticsTab } from "./_components/tactics-tab";
import { TransfersTab } from "./_components/transfers-tab";
import { SUB_TABS, TABS, type SubTab } from "./_navigation";
import { useCareerLocation } from "./_hooks/use-career-location";
import { useCareerData } from "./_hooks/use-career-data";
import { useTacticsDraft } from "./_hooks/use-tactics-draft";

export default function CareerPage() {
  const router = useRouter();
  const auth = useAuthStore((state) => state.auth);
  const [saveId, setSaveId] = useState("");
  const [name, setName] = useState("My Career");
  const [rename, setRename] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const tacticsDirtyRef = useRef(false);
  const location = useCareerLocation(tacticsDirtyRef);
  const { tab, subTab, mobileNavOpen, setMobileNavOpen, selectedFixtureId, selectedMarketId, query,
    queryInput, setQueryInput, page, selectTab, selectSubTab, setDetail, submitQuery, clearQuery, selectPage } = location;
  const data = useCareerData({ saveId, tab, subTab, page, query, selectedFixtureId, selectedMarketId, authEnabled: Boolean(auth) });
  const { saves, create, career, managedClubId, fixture, nextFixture, squad, savedTactics, saveTactics,
    playerAnalysis, standings, playerStats, manager, managerDecisions, managerJobs, acceptManagerJob, market,
    offers, activeSession, startSession, advance, nextSeason, training, renameCareer, deleteCareer, scout,
    submitOffer, offerTerms, completeTransfer, setTransferStatus, visibleFixtures, selectedFixture, selectedMarket } = data;
  useEffect(() => setRename(career.data?.save.name ?? ""), [career.data?.save.name]);
  const draft = useTacticsDraft({ saveId, squad: squad.data, saved: savedTactics.data, loading: savedTactics.isLoading, dirtyRef: tacticsDirtyRef });
  const { formation, slots, setSlots, bench, setBench, tactic, setTactic, pending: pendingFormation,
    setPending: setPendingFormation, error: formationError, valid: validLineup, dirty: tacticsDirty } = draft;
  const seasonFinished = career.data?.save.status === "SEASON_FINISHED";
  const clubName = manager.data?.clubName ?? "Football Verse FC";
  const clubMark = clubName.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
  const nextOpponent = nextFixture
    ? nextFixture.homeClubId === managedClubId ? nextFixture.awayClubName : nextFixture.homeClubName
    : "No fixture";

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate(name.trim(), { onSuccess: (created) => {
      draft.reset();
      setSaveId(created.id);
    } });
  };
  const submitRename = (event: FormEvent) => {
    event.preventDefault();
    if (rename.trim()) renameCareer.mutate(rename.trim());
  };
  const removeSave = () => {
    if (!career.data || !window.confirm(`Delete "${career.data.save.name}"?`)) return;
    deleteCareer.mutate(undefined, { onSuccess: () => setSaveId("") });
  };
  const openSession = (sessionId: string) => router.push(`/matches?saveId=${saveId}&sessionId=${sessionId}`);
  const startMatchday = () => {
    if (!fixture || !validLineup) return;
    saveTactics.mutate({ lineup: { formation, starters: slots, bench }, tactic }, {
      onSuccess: () => startSession.mutate({
        requestId: crypto.randomUUID(), seed: Date.now(), lineup: { formation, starters: slots, bench }, tactic,
      }, {
        onSuccess: (session) => openSession(session.id),
      }),
    });
  };

  if (!auth) return <SportsShell><div className="card p-8 text-center">
    <p className="mb-4">Log in to start a Career.</p><Link className="btn btn-primary" href="/login">Login</Link>
  </div></SportsShell>;

  if (!saveId) return <SportsShell game><CareerLauncher saves={saves.data} name={name} loading={saves.isLoading}
    error={Boolean(saves.error)} creating={create.isPending} onNameChange={setName} onCreate={submitCreate}
    onOpen={(id) => { draft.reset(); setSaveId(id); }} /></SportsShell>;

  return <SportsShell game><div className="career-workspace">
    <CareerSidebar tab={tab} open={mobileNavOpen} clubMark={clubMark} clubName={clubName}
      dirty={tab === "tactics" && tacticsDirty} onClose={() => setMobileNavOpen(false)} onSelect={selectTab} />
    <main className="career-main flex flex-col gap-5">
    <CareerContextHeader tab={tab} career={career.data} clubMark={clubMark} clubName={clubName}
      nextOpponent={nextOpponent} nextFixture={nextFixture} mobileOpen={mobileNavOpen}
      continuePending={advance.isPending || nextSeason.isPending || startSession.isPending}
      hasSession={Boolean(activeSession.data)} fixtureDue={Boolean(fixture)} seasonFinished={seasonFinished}
      dirty={tab === "tactics" && tacticsDirty} onMobileOpen={() => setMobileNavOpen(true)} onExit={() => setSaveId("")}
      onContinue={() => { if (activeSession.data) openSession(activeSession.data.id); else if (seasonFinished) nextSeason.mutate(); else if (fixture) selectTab("tactics"); else advance.mutate(); }} />

    {SUB_TABS[tab] && <SubTabs items={SUB_TABS[tab]!} value={(subTab || SUB_TABS[tab]![0].id) as SubTab}
      onChange={selectSubTab} label={`${TABS.find((item) => item.id === tab)?.label} sections`} />}

    {(saves.isLoading || career.isLoading || squad.isLoading || standings.isLoading) && <LoadingBlock label="Loading Career" />}
    {(saves.error || career.error || squad.error || standings.error) && <ErrorBlock message="Could not load Career data." />}
    {tab === "transfers" && (market.isLoading || (subTab === "negotiations" && offers.isLoading)) && !market.data && <LoadingBlock label="Loading Transfers" />}
    {tab === "transfers" && (market.error || (subTab === "negotiations" && offers.error)) && <ErrorBlock message="Could not load transfer data." />}
    {tab === "table" && subTab === "player-stats" && playerStats.isLoading && !playerStats.data && <LoadingBlock label="Loading Player Stats" />}
    {tab === "table" && subTab === "player-stats" && playerStats.error && <ErrorBlock message="Could not load player statistics." />}

    {career.data && <>
      {activeSession.data && <section className="card p-4 flex flex-wrap items-center justify-between gap-3 border-emerald-500/40">
        <div><p className="eyebrow">Matchday in progress</p><strong>Paused at {activeSession.data.minute}&apos; · {activeSession.data.pauseReason.replaceAll("_", " ").toLowerCase()}</strong></div>
        <button className="btn btn-primary" onClick={() => openSession(activeSession.data!.id)}>Resume Matchday</button>
      </section>}
      {tab === "overview" && <OverviewTab career={career.data} fixture={fixture} nextFixture={nextFixture}
        seasonFinished={seasonFinished} clubMark={clubMark} clubName={clubName} nextOpponent={nextOpponent}
        managedClubId={managedClubId} manager={manager.data} standings={standings.data} rename={rename}
        renamePending={renameCareer.isPending} deletePending={deleteCareer.isPending} advancePending={advance.isPending}
        nextSeasonPending={nextSeason.isPending} onRenameChange={setRename} onRename={submitRename} onDelete={removeSave}
        onTraining={(focus) => training.mutate(focus)} onAdvance={() => advance.mutate()} onNextSeason={() => nextSeason.mutate()}
        onOpenTab={(next) => selectTab(next)} />}

      {(tab === "fixtures" || tab === "tactics") && <>
        {tab === "fixtures" && <FixturesTab fixtures={visibleFixtures} total={career.data.fixtures.length} subTab={subTab}
          query={queryInput} onQueryChange={setQueryInput} onSubmit={submitQuery} onClear={clearQuery}
          onSelect={(id) => setDetail("fixture", id)} />}
        {tab === "tactics" && <TacticsTab subTab={subTab} squad={squad.data}
          fixtureTitle={fixture ? `${fixture.homeClubName} vs ${fixture.awayClubName}` : undefined}
          formation={formation} formationError={formationError} slots={slots} bench={bench} tactic={tactic}
          validLineup={validLineup} dirty={tacticsDirty} savePending={saveTactics.isPending} saveSuccess={saveTactics.isSuccess}
          saveError={Boolean(saveTactics.error)} startPending={startSession.isPending} startError={Boolean(startSession.error)}
          activeSession={activeSession.data} onFormationChange={draft.preview}
          onSlotsChange={setSlots} onBenchChange={setBench} onTacticChange={setTactic} onSelectPlayer={setSelectedPlayer}
          onSave={() => saveTactics.mutate({ lineup: { formation, starters: slots, bench }, tactic })}
          onResume={() => activeSession.data && openSession(activeSession.data.id)} onStart={startMatchday} />}
      </>}

      {tab === "squad" && <SquadTab subTab={subTab} squad={squad.data} analysis={playerAnalysis.data}
        compareIds={compareIds} onSelect={setSelectedPlayer}
        onList={(playerId) => setTransferStatus.mutate({ playerId, status: "LISTED" })}
        onCompareChange={(index, playerId) => setCompareIds((current) => { const next = [...current]; next[index] = playerId; return next; })} />}

      {tab === "transfers" && market.data && <TransfersTab subTab={subTab} market={market.data} offers={offers.data}
        managedClubId={managedClubId} query={queryInput} scoutPending={scout.isPending} offerPending={submitOffer.isPending}
        actionError={Boolean(scout.error || submitOffer.error || offerTerms.error || completeTransfer.error)}
        onQueryChange={setQueryInput} onSubmit={submitQuery} onClear={clearQuery} onPage={selectPage}
        onSelect={(id) => setDetail("market", id)} onScout={(id) => scout.mutate(id)}
        onBid={(playerId, fee) => submitOffer.mutate({ playerId, fee })}
        onTerms={(offer) => offerTerms.mutate({ offerId: offer.id, wage: Math.round(offer.wage ?? 20000), contractYears: 3, squadRole: "STARTER" })}
        onComplete={(id) => completeTransfer.mutate(id)} />}

      {tab === "manager" && manager.data && <ManagerTab subTab={subTab} manager={manager.data}
        decisions={managerDecisions.data} jobs={managerJobs.data} onAcceptJob={(clubId) => acceptManagerJob.mutate(clubId)} />}

      {tab === "table" && <TableTab subTab={subTab} standings={standings.data} stats={playerStats.data}
        managedClubId={managedClubId} query={queryInput} onQueryChange={setQueryInput} onSubmit={submitQuery}
        onClear={clearQuery} onPage={selectPage} />}

      {tab === "history" && <HistoryTab history={career.data.history} />}
    </>}
      {pendingFormation && <FormationPreview current={formation} result={pendingFormation} onCancel={() => setPendingFormation(null)} onApply={draft.apply} />}
      {selectedFixture && <FixtureDetail fixture={selectedFixture} due={selectedFixture.id === fixture?.id}
        onClose={() => setDetail("fixture")} onPrepare={() => selectTab("tactics")} />}
      {selectedMarket && <MarketDetail player={selectedMarket} scoutPending={scout.isPending} offerPending={submitOffer.isPending}
        onClose={() => setDetail("market")} onScout={() => scout.mutate(selectedMarket.playerId)}
        onBid={() => submitOffer.mutate({ playerId: selectedMarket.playerId, fee: Math.round(selectedMarket.valueMax) })} />}
      {selectedPlayer && <PlayerInspector player={selectedPlayer} stats={playerStats.data?.items.find((item) => item.playerId === selectedPlayer.id)} onClose={() => setSelectedPlayer(null)} onCompare={() => { setCompareIds((current) => [selectedPlayer.id, current.find((id) => id !== selectedPlayer.id) ?? ""]); selectTab("squad", "compare"); setSelectedPlayer(null); }} />}
  </main></div></SportsShell>;
}
