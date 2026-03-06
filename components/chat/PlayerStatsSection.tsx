"use client";

import { useState, useEffect, useMemo } from "react";
import { getPlayers, getPlayerSeasons, type PlayerOption, type PlayerSeasonRow } from "@/lib/api";

function formatOdds(v: number | null): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `$${v.toFixed(2)}`;
}

export default function PlayerStatsSection() {
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [seasons, setSeasons] = useState<PlayerSeasonRow[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [sortKey, setSortKey] = useState<
    | "season"
    | "games_played"
    | "fts"
    | "fts_historical_odds"
    | "ats"
    | "ats_historical_odds"
    | "lts"
    | "lts_historical_odds"
    | "fts2h"
    | "fts2h_historical_odds"
    | "two_plus"
    | "two_plus_historical_odds"
  >("season");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  function formatApiError(e: unknown, fallback = "Failed to load players"): string {
    const msg = e instanceof Error ? e.message : fallback;
    if (typeof window !== "undefined" && msg === "Failed to fetch") {
      const isProduction = !/localhost|127\.0\.0\.1/.test(window.location.hostname);
      if (isProduction) {
        return "Cannot reach API. Set NEXT_PUBLIC_API_URL to your backend URL in Vercel and ensure the backend allows CORS from this site.";
      }
    }
    return msg;
  }

  useEffect(() => {
    getPlayers()
      .then(setPlayers)
      .catch((e) => setError(formatApiError(e)))
      .finally(() => setLoadingPlayers(false));
  }, []);

  useEffect(() => {
    if (selectedId === "") {
      setSeasons([]);
      setSelectedYears([]);
      return;
    }
    setLoadingSeasons(true);
    setError(null);
    getPlayerSeasons(selectedId as number)
      .then(setSeasons)
      .catch((e) => {
        setError(formatApiError(e, "Failed to load seasons"));
        setSeasons([]);
      })
      .finally(() => setLoadingSeasons(false));
  }, [selectedId]);

  // When seasons change, default to showing all available years
  useEffect(() => {
    if (seasons.length === 0) {
      setSelectedYears([]);
      return;
    }
    const allYears = Array.from(new Set(seasons.map((s) => s.season))).sort((a, b) => a - b);
    setSelectedYears(allYears);
  }, [seasons]);

  const availableYears = useMemo(
    () => Array.from(new Set(seasons.map((s) => s.season))).sort((a, b) => a - b),
    [seasons]
  );

  const filteredSeasons = useMemo(() => {
    if (selectedYears.length === 0) return seasons;
    const yearSet = new Set(selectedYears);
    return seasons.filter((s) => yearSet.has(s.season));
  }, [seasons, selectedYears]);

  const sortedSeasons = useMemo(() => {
    const rows = [...filteredSeasons];
    rows.sort((a, b) => {
      const aVal = a[sortKey as keyof PlayerSeasonRow] as number | null | undefined;
      const bVal = b[sortKey as keyof PlayerSeasonRow] as number | null | undefined;
      const aNum = aVal == null ? Number.NaN : Number(aVal);
      const bNum = bVal == null ? Number.NaN : Number(bVal);

      if (Number.isNaN(aNum) && Number.isNaN(bNum)) return 0;
      if (Number.isNaN(aNum)) return 1;
      if (Number.isNaN(bNum)) return -1;

      return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
    });
    return rows;
  }, [filteredSeasons, sortKey, sortDirection]);

  const totals = useMemo(() => {
    if (sortedSeasons.length === 0) return null;
    const totalsRow = sortedSeasons.reduce(
      (acc, row) => {
        acc.games_played += row.games_played;
        acc.fts += row.fts;
        acc.ats += row.ats;
        acc.lts += row.lts;
        acc.fts2h += row.fts2h;
        acc.two_plus += row.two_plus;
        return acc;
      },
      {
        games_played: 0,
        fts: 0,
        ats: 0,
        lts: 0,
        fts2h: 0,
        two_plus: 0,
      }
    );

    const totalGames = totalsRow.games_played || 0;

    const oddsFromTotals = (hits: number) => {
      if (!totalGames || !hits) return null;
      return totalGames / hits;
    };

    return {
      ...totalsRow,
      fts_historical_odds: oddsFromTotals(totalsRow.fts),
      ats_historical_odds: oddsFromTotals(totalsRow.ats),
      lts_historical_odds: oddsFromTotals(totalsRow.lts),
      fts2h_historical_odds: oddsFromTotals(totalsRow.fts2h),
      two_plus_historical_odds: oddsFromTotals(totalsRow.two_plus),
    };
  }, [sortedSeasons]);

  function handleSort(key: typeof sortKey) {
    setSortDirection((prev) => (sortKey === key && prev === "asc" ? "desc" : "asc"));
    setSortKey(key);
  }

  function toggleYear(year: number) {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year].sort((a, b) => a - b)
    );
  }

  function renderSortIndicator(key: typeof sortKey) {
    if (sortKey !== key) return null;
    return <span className="ml-1 text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>;
  }

  const found = players.find((p) => p.player_id === selectedId);
  const selectedName = found != null ? found.name : "";

  return (
    <section className="w-full max-w-4xl mx-auto mb-6">
      <div className="rounded-xl bg-slate-800/50 border border-slate-600/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-600/50 bg-slate-800/80">
          <label htmlFor="player-select" className="block text-sm font-medium text-slate-300 mb-2">
            Select player
          </label>
          <select
            id="player-select"
            value={selectedId === "" ? "" : selectedId}
            onChange={(e) => setSelectedId(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={loadingPlayers}
            className="w-full max-w-sm rounded-lg bg-slate-700/80 border border-slate-500/50 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5eead4]/50 focus:border-[#5eead4]/40"
          >
            <option value="">Choose a player…</option>
            {players.map((p) => (
              <option key={p.player_id} value={p.player_id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {!loadingSeasons && selectedId !== "" && seasons.length > 0 && availableYears.length > 0 && (
          <div className="px-4 py-2 border-b border-slate-600/40 bg-slate-800/60">
            <div className="text-xs font-medium text-slate-300 mb-1">Filter by season</div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-200">
              {availableYears.map((year) => (
                <label key={year} className="inline-flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-500 bg-slate-800 text-[#5eead4] focus:ring-[#5eead4]"
                    checked={selectedYears.includes(year)}
                    onChange={() => toggleYear(year)}
                  />
                  <span>{year}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="px-4 py-2 text-amber-400/90 text-sm">
            {error}
          </div>
        )}

        {loadingSeasons && selectedId !== "" && (
          <div className="px-4 py-6 text-slate-400 text-sm text-center">
            Loading seasons…
          </div>
        )}

        {!loadingSeasons && selectedId !== "" && seasons.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-600/60 bg-slate-700/40">
                  <th
                    className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort("season")}
                  >
                    Season
                    {renderSortIndicator("season")}
                  </th>
                  <th
                    className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort("games_played")}
                  >
                    Games
                    {renderSortIndicator("games_played")}
                  </th>
                  <th
                    className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort("fts")}
                  >
                    FTS
                    {renderSortIndicator("fts")}
                  </th>
                  <th
                    className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort("fts_historical_odds")}
                  >
                    FTS odds
                    {renderSortIndicator("fts_historical_odds")}
                  </th>
                  <th
                    className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort("ats")}
                  >
                    ATS
                    {renderSortIndicator("ats")}
                  </th>
                  <th
                    className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort("ats_historical_odds")}
                  >
                    ATS odds
                    {renderSortIndicator("ats_historical_odds")}
                  </th>
                  <th
                    className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort("lts")}
                  >
                    LTS
                    {renderSortIndicator("lts")}
                  </th>
                  <th
                    className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort("lts_historical_odds")}
                  >
                    LTS odds
                    {renderSortIndicator("lts_historical_odds")}
                  </th>
                  <th
                    className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort("fts2h")}
                  >
                    FTS2H
                    {renderSortIndicator("fts2h")}
                  </th>
                  <th
                    className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort("fts2h_historical_odds")}
                  >
                    FTS2H odds
                    {renderSortIndicator("fts2h_historical_odds")}
                  </th>
                  <th
                    className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort("two_plus")}
                  >
                    2+
                    {renderSortIndicator("two_plus")}
                  </th>
                  <th
                    className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap cursor-pointer select-none"
                    onClick={() => handleSort("two_plus_historical_odds")}
                  >
                    2+ odds
                    {renderSortIndicator("two_plus_historical_odds")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSeasons.map((row, i) => (
                  <tr
                    key={row.season}
                    className={`border-b border-slate-600/30 ${
                      i % 2 === 0 ? "bg-slate-800/30" : "bg-slate-700/20"
                    } hover:bg-slate-600/20 transition-colors`}
                  >
                    <td className="px-3 py-2 text-slate-100 font-medium">{row.season}</td>
                    <td className="px-3 py-2 text-slate-200">{row.games_played}</td>
                    <td className="px-3 py-2 text-slate-200">{row.fts}</td>
                    <td className="px-3 py-2 text-slate-300 tabular-nums">{formatOdds(row.fts_historical_odds)}</td>
                    <td className="px-3 py-2 text-slate-200">{row.ats}</td>
                    <td className="px-3 py-2 text-slate-300 tabular-nums">{formatOdds(row.ats_historical_odds)}</td>
                    <td className="px-3 py-2 text-slate-200">{row.lts}</td>
                    <td className="px-3 py-2 text-slate-300 tabular-nums">{formatOdds(row.lts_historical_odds)}</td>
                    <td className="px-3 py-2 text-slate-200">{row.fts2h}</td>
                    <td className="px-3 py-2 text-slate-300 tabular-nums">{formatOdds(row.fts2h_historical_odds)}</td>
                    <td className="px-3 py-2 text-slate-200">{row.two_plus}</td>
                    <td className="px-3 py-2 text-slate-300 tabular-nums">{formatOdds(row.two_plus_historical_odds)}</td>
                  </tr>
                ))}
                {totals && (
                  <tr className="border-t border-slate-500/60 bg-slate-800/80">
                    <td className="px-3 py-2 text-slate-100 font-semibold">Total</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold">{totals.games_played}</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold">{totals.fts}</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold tabular-nums">
                      {formatOdds(totals.fts_historical_odds ?? null)}
                    </td>
                    <td className="px-3 py-2 text-slate-100 font-semibold">{totals.ats}</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold tabular-nums">
                      {formatOdds(totals.ats_historical_odds ?? null)}
                    </td>
                    <td className="px-3 py-2 text-slate-100 font-semibold">{totals.lts}</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold tabular-nums">
                      {formatOdds(totals.lts_historical_odds ?? null)}
                    </td>
                    <td className="px-3 py-2 text-slate-100 font-semibold">{totals.fts2h}</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold tabular-nums">
                      {formatOdds(totals.fts2h_historical_odds ?? null)}
                    </td>
                    <td className="px-3 py-2 text-slate-100 font-semibold">{totals.two_plus}</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold tabular-nums">
                      {formatOdds(totals.two_plus_historical_odds ?? null)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loadingSeasons && selectedId !== "" && seasons.length === 0 && !error && (
          <div className="px-4 py-6 text-slate-400 text-sm text-center">
            No season data for {selectedName}.
          </div>
        )}
      </div>
    </section>
  );
}
