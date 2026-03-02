"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    getPlayers()
      .then(setPlayers)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load players");
      })
      .finally(() => setLoadingPlayers(false));
  }, []);

  useEffect(() => {
    if (selectedId === "") {
      setSeasons([]);
      return;
    }
    setLoadingSeasons(true);
    setError(null);
    getPlayerSeasons(selectedId as number)
      .then(setSeasons)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load seasons");
        setSeasons([]);
      })
      .finally(() => setLoadingSeasons(false));
  }, [selectedId]);

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
                  <th className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap">Season</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap">Games</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap">FTS</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap">FTS odds</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap">ATS</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap">ATS odds</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap">LTS</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap">LTS odds</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap">FTS2H</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap">FTS2H odds</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap">2+</th>
                  <th className="px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap">2+ odds</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((row, i) => (
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
