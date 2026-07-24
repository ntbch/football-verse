"use client";

import type { FormEvent, MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { readCareerLocation, SUB_TABS, type SubTab, type Tab } from "../_navigation";

export function useCareerLocation(tacticsDirty: MutableRefObject<boolean>) {
  const [tab, setTab] = useState<Tab>("overview");
  const [subTab, setSubTab] = useState<SubTab | "">("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedFixtureId, setSelectedFixtureId] = useState("");
  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [query, setQuery] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [page, setPage] = useState(0);
  const activeTab = useRef<Tab>("overview");
  const restoringHistory = useRef(false);

  useEffect(() => {
    const syncUrl = () => {
      if (restoringHistory.current) {
        restoringHistory.current = false;
        return;
      }
      const location = readCareerLocation(window.location.search);
      if (activeTab.current === "tactics" && location.tab !== "tactics" && tacticsDirty.current && !window.confirm("Discard unsaved tactics changes?")) {
        restoringHistory.current = true;
        window.history.go(1);
        return;
      }
      activeTab.current = location.tab;
      setTab(location.tab);
      setSubTab(location.subTab);
      setSelectedFixtureId(location.fixtureId);
      setSelectedMarketId(location.marketId);
      setQuery(location.query);
      setQueryInput(location.query);
      setPage(location.page);
    };
    syncUrl();
    window.addEventListener("popstate", syncUrl);
    return () => window.removeEventListener("popstate", syncUrl);
  }, [tacticsDirty]);

  const selectTab = (next: Tab, requestedSub?: SubTab) => {
    if (next !== "tactics" && tab === "tactics" && tacticsDirty.current && !window.confirm("Discard unsaved tactics changes?")) return;
    const available = SUB_TABS[next] ?? [];
    const nextSub = available.some((item) => item.id === requestedSub) ? requestedSub! : available[0]?.id ?? "";
    activeTab.current = next;
    setTab(next);
    setSubTab(nextSub);
    setMobileNavOpen(false);
    resetListState();
    const url = new URL(window.location.href);
    next === "overview" ? url.searchParams.delete("tab") : url.searchParams.set("tab", next);
    nextSub ? url.searchParams.set("sub", nextSub) : url.searchParams.delete("sub");
    ["detail", "q", "page"].forEach((key) => url.searchParams.delete(key));
    window.history.pushState(null, "", url);
  };

  const selectSubTab = (next: SubTab) => {
    setSubTab(next);
    setQuery("");
    setQueryInput("");
    setPage(0);
    const url = new URL(window.location.href);
    url.searchParams.set("sub", next);
    ["q", "page"].forEach((key) => url.searchParams.delete(key));
    window.history.pushState(null, "", url);
  };

  const setDetail = (kind: "fixture" | "market", id = "") => {
    setSelectedFixtureId(kind === "fixture" ? id : "");
    setSelectedMarketId(kind === "market" ? id : "");
    const url = new URL(window.location.href);
    id ? url.searchParams.set("detail", `${kind}:${id}`) : url.searchParams.delete("detail");
    id ? window.history.pushState(null, "", url) : window.history.replaceState(null, "", url);
  };

  const submitQuery = (event: FormEvent) => {
    event.preventDefault();
    const committed = queryInput.trim();
    if (committed.length === 1) return;
    setQuery(committed);
    setPage(0);
    const url = new URL(window.location.href);
    committed ? url.searchParams.set("q", committed) : url.searchParams.delete("q");
    url.searchParams.delete("page");
    window.history.pushState(null, "", url);
  };

  const clearQuery = () => {
    setQuery("");
    setQueryInput("");
    setPage(0);
    const url = new URL(window.location.href);
    ["q", "page"].forEach((key) => url.searchParams.delete(key));
    window.history.replaceState(null, "", url);
  };

  const selectPage = (next: number) => {
    setPage(next);
    const url = new URL(window.location.href);
    next ? url.searchParams.set("page", String(next)) : url.searchParams.delete("page");
    window.history.pushState(null, "", url);
  };

  function resetListState() {
    setQuery("");
    setQueryInput("");
    setPage(0);
    setSelectedFixtureId("");
    setSelectedMarketId("");
  }

  return { tab, subTab, mobileNavOpen, setMobileNavOpen, selectedFixtureId, selectedMarketId, query, queryInput,
    setQueryInput, page, selectTab, selectSubTab, setDetail, submitQuery, clearQuery, selectPage };
}
