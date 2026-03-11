"use client";

import { useState, useEffect, useMemo } from "react";
import {
  getPlayers,
  getPlayerSeasons,
  getPlayerPositions,
  type PlayerOption,
  type PlayerSeasonRow,
} from "@/lib/api";

const MINUTES_BANDS = [
  "Less than 20 mins",
  "Over 20 mins",
  "Over 30 mins",
  "Over 40 mins",
  "Over 50 mins",
  "Over 60 mins",
  "Over 70 mins",
];

function formatOdds(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `$${v.toFixed(2)}`;
}

function formatApiError(e: unknown, fallback = "Failed to load"): string {
  const msg = e instanceof Error ? e.message : fallback;
  if (typeof window !== "undefined" && msg === "Failed to fetch") {
    const isProduction = !/localhost|127\.0\.0\.1/.test(window.location.hostname);
    if (isProduction) {
      return "Cannot reach API. Set NEXT_PUBLIC_API_URL to your backend URL in Vercel and ensure the backend allows CORS from this site.";
    }
  }
  return msg;
}

export default function PlayerStatsSection() {
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedMinutesBands, setSelectedMinutesBands] = useState<string[]>(["Over 20 mins"]);
  const [availablePositions, setAvailablePositions] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

  // Seasons data
  const [allRows, setAllRows] = useState<PlayerSeasonRow[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(false);

  // Year filter (client-side, no re-fetch needed)
  const [selectedYears, setSelectedYears] = useState<number[]>([]);

  // Sort
  type SortKey = "season" | "games_played" | "total_games_played" | "fts" | "fts_historical_odds" | "ats" | "ats_historical_odds" | "lts" | "lts_historical_odds" | "fts2h" | "fts2h_historical_odds" | "two_plus" | "two_plus_historical_odds";
  const [sortKey, setSortKey] = useState<SortKey>("season");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Load player list once
  useEffect(() => {
    getPlayers()
      .then(setPlayers)
      .catch((e) => setError(formatApiError(e, "Failed to load players")))
      .finally(() => setLoadingPlayers(false));
  }, []);

  // When player changes: load positions, then load seasons
  useEffect(() => {
    if (selectedId === "") {
      setAllRows([]);
      setAvailablePositions([]);
      setSelectedPositions([]);
      setSelectedYears([]);
      return;
    }

    setLoadingPositions(true);
    setError(null);
    getPlayerPositions(selectedId as number)
      .then((pos) => {
        setAvailablePositions(pos);
        setSelectedPositions(pos); // default: all positions checked
      })
      .catch(() => {
        setAvailablePositions([]);
        setSelectedPositions([]);
      })
      .finally(() => setLoadingPositions(false));
  }, [selectedId]);

  // Fetch seasons whenever player, selectedMinutesBands, or selectedPositions changes
  useEffect(() => {
    if (selectedId === "") return;
    // Wait until positions have been fetched for this player before re-fetching
    if (loadingPositions) return;

    setLoadingSeasons(true);
    setError(null);
    getPlayerSeasons(selectedId as number, {
      minutesBands: selectedMinutesBands,
      positions: selectedPositions,
    })
      .then((rows) => {
        setAllRows(rows);
        // Reset year filter to all available years
        const years = rows
          .filter((r) => typeof r.season === "number")
          .map((r) => r.season as number)
          .sort((a, b) => a - b);
        setSelectedYears(years);
      })
      .catch((e) => {
        setError(formatApiError(e, "Failed to load seasons"));
        setAllRows([]);
      })
      .finally(() => setLoadingSeasons(false));
  }, [selectedId, selectedMinutesBands, selectedPositions, loadingPositions]);

  // Separate the Total row from per-season rows
  const totalRow = useMemo(
    () => allRows.find((r) => r.season === "Total") ?? null,
    [allRows]
  );
  const seasonRows = useMemo(
    () => allRows.filter((r) => r.season !== "Total"),
    [allRows]
  );

  const availableYears = useMemo(
    () => seasonRows.map((r) => r.season as number).sort((a, b) => a - b),
    [seasonRows]
  );

  // Client-side year filter
  const filteredRows = useMemo(() => {
    if (selectedYears.length === 0) return seasonRows;
    const yearSet = new Set(selectedYears);
    return seasonRows.filter((r) => yearSet.has(r.season as number));
  }, [seasonRows, selectedYears]);

  // Sort
  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    rows.sort((a, b) => {
      const aVal = a[sortKey as keyof PlayerSeasonRow] as number | null | undefined;
      const bVal = b[sortKey as keyof PlayerSeasonRow] as number | null | undefined;
      const aNum = aVal == null ? Number.NaN : Number(aVal);
      const bNum = bVal == null ? Number.NaN : Number(bVal);
      if (Number.isNaN(aNum) && Number.isNaN(bNum)) return 0;
      if (Number.isNaN(aNum)) return 1;
      if (Number.isNaN(bNum)) return -1;
      return sortDir === "asc" ? aNum - bNum : bNum - aNum;
    });
    return rows;
  }, [filteredRows, sortKey, sortDir]);

  // Client-side totals (re-computed when years are filtered)
  const clientTotals = useMemo(() => {
    if (sortedRows.length === 0) return null;
    const t = sortedRows.reduce(
      (acc, row) => {
        acc.games_played += row.games_played;
        acc.total_games_played += (row.total_games_played ?? 0);
        acc.fts += row.fts;
        acc.ats += row.ats;
        acc.lts += row.lts;
        acc.fts2h += row.fts2h;
        acc.two_plus += row.two_plus;
        return acc;
      },
      { games_played: 0, total_games_played: 0, fts: 0, ats: 0, lts: 0, fts2h: 0, two_plus: 0 }
    );
    const gp = t.games_played;
    const odds = (hits: number) => (gp && hits ? gp / hits : null);
    return {
      ...t,
      fts_historical_odds: odds(t.fts),
      ats_historical_odds: odds(t.ats),
      lts_historical_odds: odds(t.lts),
      fts2h_historical_odds: odds(t.fts2h),
      two_plus_historical_odds: odds(t.two_plus),
    };
  }, [sortedRows]);

  function handleSort(key: SortKey) {
    setSortDir((prev) => (sortKey === key && prev === "asc" ? "desc" : "asc"));
    setSortKey(key);
  }

  function toggleYear(year: number) {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year].sort((a, b) => a - b)
    );
  }

  function toggleMinutesBand(band: string) {
    setSelectedMinutesBands((prev) =>
      prev.includes(band) ? prev.filter((b) => b !== band) : [...prev, band]
    );
  }

  function togglePosition(pos: string) {
    setSelectedPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    );
  }

  function renderSortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return <span className="ml-1 text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const selectedName = players.find((p) => p.player_id === selectedId)?.name ?? "";
  const hasData = !loadingSeasons && selectedId !== "" && seasonRows.length > 0;

  return (
    <section className="w-full max-w-4xl mx-auto mb-6">
      <div className="rounded-xl bg-slate-800/50 border border-slate-600/50 overflow-hidden">

        {/* Player selector */}
        <div className="px-4 py-3 border-b border-slate-600/50 bg-slate-800/80">
          <label htmlFor="player-select" className="block text-sm font-medium text-slate-300 mb-2">
            Select player
          </label>
          <select
            id="player-select"
            value={selectedId === "" ? "" : selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value === "" ? "" : Number(e.target.value));
              setSelectedMinutesBands(["Over 20 mins"]);
            }}
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

        {/* Minutes band filter — multi-select checkboxes */}
        {selectedId !== "" && (
          <div className="px-4 py-2 border-b border-slate-600/40 bg-slate-800/60">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-medium text-slate-300">Minutes played</span>
              <button
                type="button"
                onClick={() => setSelectedMinutesBands([...MINUTES_BANDS])}
                className="text-xs text-[#5eead4]/70 hover:text-[#5eead4] transition-colors"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedMinutesBands([])}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                None
              </button>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-200">
              {MINUTES_BANDS.map((band) => (
                <label key={band} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-500 bg-slate-800 text-[#5eead4] focus:ring-[#5eead4]"
                    checked={selectedMinutesBands.includes(band)}
                    onChange={() => toggleMinutesBand(band)}
                  />
                  <span>{band}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Position checkboxes */}
        {selectedId !== "" && availablePositions.length > 0 && (
          <div className="px-4 py-2 border-b border-slate-600/40 bg-slate-800/60">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-medium text-slate-300">Filter by position</span>
              <button
                type="button"
                onClick={() => setSelectedPositions(availablePositions)}
                className="text-xs text-[#5eead4]/70 hover:text-[#5eead4] transition-colors"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedPositions([])}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                None
              </button>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-200">
              {availablePositions.map((pos) => (
                <label key={pos} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-500 bg-slate-800 text-[#5eead4] focus:ring-[#5eead4]"
                    checked={selectedPositions.includes(pos)}
                    onChange={() => togglePosition(pos)}
                  />
                  <span>{pos}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Season checkboxes */}
        {hasData && availableYears.length > 0 && (
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

        {/* Error */}
        {error && (
          <div className="px-4 py-2 text-amber-400/90 text-sm">{error}</div>
        )}

        {/* Loading spinner */}
        {(loadingSeasons || loadingPositions) && selectedId !== "" && (
          <div className="px-4 py-6 text-slate-400 text-sm text-center">
            Loading…
          </div>
        )}

        {/* Stats table */}
        {hasData && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-600/60 bg-slate-700/40">
                  {(
                    [
                      ["season", "Season"],
                      ["games_played", "Games"],
                      ["total_games_played", "Total Games"],
                      ["fts", "FTS"],
                      ["fts_historical_odds", "FTS odds"],
                      ["ats", "ATS"],
                      ["ats_historical_odds", "ATS odds"],
                      ["lts", "LTS"],
                      ["lts_historical_odds", "LTS odds"],
                      ["fts2h", "FTS2H"],
                      ["fts2h_historical_odds", "FTS2H odds"],
                      ["two_plus", "2+"],
                      ["two_plus_historical_odds", "2+ odds"],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <th
                      key={key}
                      className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap cursor-pointer select-none"
                      onClick={() => handleSort(key)}
                    >
                      {label}
                      {renderSortIndicator(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, i) => (
                  <tr
                    key={`${row.season}-${row.position}`}
                    className={`border-b border-slate-600/30 ${
                      i % 2 === 0 ? "bg-slate-800/30" : "bg-slate-700/20"
                    } hover:bg-slate-600/20 transition-colors`}
                  >
                    <td className="px-3 py-2 text-slate-100 font-medium">{row.season}</td>
                    <td className="px-3 py-2 text-slate-200">{row.games_played}</td>
                    <td className="px-3 py-2 text-slate-400">{row.total_games_played ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-200">{row.fts}</td>
                    <td className="px-3 py-2 text-slate-300 tabular-nums">{row.fts_odds_fmt}</td>
                    <td className="px-3 py-2 text-slate-200">{row.ats}</td>
                    <td className="px-3 py-2 text-slate-300 tabular-nums">{row.ats_odds_fmt}</td>
                    <td className="px-3 py-2 text-slate-200">{row.lts}</td>
                    <td className="px-3 py-2 text-slate-300 tabular-nums">{row.lts_odds_fmt}</td>
                    <td className="px-3 py-2 text-slate-200">{row.fts2h}</td>
                    <td className="px-3 py-2 text-slate-300 tabular-nums">{row.fts2h_odds_fmt}</td>
                    <td className="px-3 py-2 text-slate-200">{row.two_plus}</td>
                    <td className="px-3 py-2 text-slate-300 tabular-nums">{row.two_plus_odds_fmt}</td>
                  </tr>
                ))}
                {clientTotals && (
                  <tr className="border-t border-slate-500/60 bg-slate-800/80">
                    <td className="px-3 py-2 text-slate-100 font-semibold">Total</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold">{clientTotals.games_played}</td>
                    <td className="px-3 py-2 text-slate-300 font-semibold">{clientTotals.total_games_played || "—"}</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold">{clientTotals.fts}</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold tabular-nums">{formatOdds(clientTotals.fts_historical_odds)}</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold">{clientTotals.ats}</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold tabular-nums">{formatOdds(clientTotals.ats_historical_odds)}</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold">{clientTotals.lts}</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold tabular-nums">{formatOdds(clientTotals.lts_historical_odds)}</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold">{clientTotals.fts2h}</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold tabular-nums">{formatOdds(clientTotals.fts2h_historical_odds)}</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold">{clientTotals.two_plus}</td>
                    <td className="px-3 py-2 text-slate-100 font-semibold tabular-nums">{formatOdds(clientTotals.two_plus_historical_odds)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loadingSeasons && !loadingPositions && selectedId !== "" && seasonRows.length === 0 && !error && (
          <div className="px-4 py-6 text-slate-400 text-sm text-center">
            No data for {selectedName} with the selected filters.
          </div>
        )}
      </div>
    </section>
  );
}
