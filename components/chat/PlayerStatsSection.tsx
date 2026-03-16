"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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

// Reusable multi-select dropdown component
function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const summaryText =
    selected.length === 0
      ? "None"
      : selected.length === options.length
      ? "All"
      : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`;

  return (
    <div className="relative" ref={ref}>
      <span className="text-xs font-medium text-slate-300 mr-2">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700/80 border border-slate-500/50 text-slate-200 px-3 py-1.5 text-xs hover:border-[#5eead4]/40 focus:outline-none focus:ring-1 focus:ring-[#5eead4]/50 transition-colors"
      >
        <span>{summaryText}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 min-w-[160px] rounded-lg bg-slate-800 border border-slate-600/60 shadow-xl py-1">
          <div className="flex gap-3 px-3 py-1.5 border-b border-slate-600/40">
            <button
              type="button"
              onClick={() => { onSelectAll(); setOpen(false); }}
              className="text-xs text-[#5eead4]/80 hover:text-[#5eead4] transition-colors"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => { onClearAll(); setOpen(false); }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              None
            </button>
          </div>
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700/50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                className="rounded border-slate-500 bg-slate-800 text-[#5eead4] focus:ring-[#5eead4]"
                checked={selected.includes(opt)}
                onChange={() => onToggle(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlayerStatsSection() {
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters — minutes is now single-select
  const [selectedMinutesBand, setSelectedMinutesBand] = useState<string>("Over 20 mins");
  const [availablePositions, setAvailablePositions] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

  // Seasons data
  const [allRows, setAllRows] = useState<PlayerSeasonRow[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(false);

  // Year filter (client-side, no re-fetch needed)
  const [selectedYears, setSelectedYears] = useState<number[]>([]);

  // Sort
  type SortKey = "season" | "games_played" | "fts" | "fts_historical_odds" | "ats" | "ats_historical_odds" | "lts" | "lts_historical_odds" | "fts2h" | "fts2h_historical_odds" | "two_plus" | "two_plus_historical_odds";
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
        setSelectedPositions(pos);
      })
      .catch(() => {
        setAvailablePositions([]);
        setSelectedPositions([]);
      })
      .finally(() => setLoadingPositions(false));
  }, [selectedId]);

  // Fetch seasons whenever player, selectedMinutesBand, or selectedPositions changes
  useEffect(() => {
    if (selectedId === "") return;
    if (loadingPositions) return;

    setLoadingSeasons(true);
    setError(null);
    getPlayerSeasons(selectedId as number, {
      minutesBands: [selectedMinutesBand],
      positions: selectedPositions,
    })
      .then((rows) => {
        setAllRows(rows);
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
  }, [selectedId, selectedMinutesBand, selectedPositions, loadingPositions]);

  // Separate the Total row from per-season rows
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
              setSelectedMinutesBand("Over 20 mins");
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

        {/* Filter bar */}
        {selectedId !== "" && (
          <div className="px-4 py-2.5 border-b border-slate-600/40 bg-slate-800/60 flex flex-wrap items-center gap-4">

            {/* Minutes played — single-select dropdown */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="minutes-select"
                className="text-xs font-medium text-slate-300 whitespace-nowrap"
              >
                Minutes Over
              </label>
              <select
                id="minutes-select"
                value={selectedMinutesBand}
                onChange={(e) => setSelectedMinutesBand(e.target.value)}
                className="rounded-lg bg-slate-700/80 border border-slate-500/50 text-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#5eead4]/50 focus:border-[#5eead4]/40 hover:border-[#5eead4]/30 transition-colors"
              >
                {MINUTES_BANDS.map((band) => (
                  <option key={band} value={band}>
                    {band}
                  </option>
                ))}
              </select>
            </div>

            {/* Position — multi-select dropdown */}
            {availablePositions.length > 0 && (
              <MultiSelectDropdown
                label="Position"
                options={availablePositions}
                selected={selectedPositions}
                onToggle={togglePosition}
                onSelectAll={() => setSelectedPositions(availablePositions)}
                onClearAll={() => setSelectedPositions([])}
              />
            )}

            {/* Season — multi-select dropdown */}
            {hasData && availableYears.length > 0 && (
              <MultiSelectDropdown
                label="Season"
                options={availableYears.map(String)}
                selected={selectedYears.map(String)}
                onToggle={(val) => toggleYear(Number(val))}
                onSelectAll={() => setSelectedYears(availableYears)}
                onClearAll={() => setSelectedYears([])}
              />
            )}
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
                      ["games_played", "GP"],
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
                    <td className="px-3 py-2 text-slate-200 tabular-nums whitespace-nowrap">
                      {row.total_games_played != null
                        ? `${row.games_played}/${row.total_games_played}`
                        : row.games_played}
                    </td>
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
                    <td className="px-3 py-2 text-slate-100 font-semibold tabular-nums whitespace-nowrap">
                      {clientTotals.total_games_played
                        ? `${clientTotals.games_played}/${clientTotals.total_games_played}`
                        : clientTotals.games_played}
                    </td>
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
