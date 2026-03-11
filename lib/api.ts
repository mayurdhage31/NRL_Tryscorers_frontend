const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type { ChatMessage, ChatRequest, ChatResponse, StreamCallbacks } from "./types";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function sendChatMessage(
  message: string,
  history: { role: string; content: string }[]
): Promise<{ response: string; history: { role: string; content: string }[] }> {
  return fetchAPI("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}

export interface PlayerOption {
  player_id: number;
  name: string;
}

/** A per-season row returned by /api/players/{id}/seasons. season = "Total" for the aggregate row. */
export interface PlayerSeasonRow {
  season: number | string;
  position: string;
  minutes_band: string;
  games_played: number;
  total_games_played: number;
  fts: number;
  fts_historical_odds: number | null;
  fts_odds_fmt: string;
  ats: number;
  ats_historical_odds: number | null;
  ats_odds_fmt: string;
  lts: number;
  lts_historical_odds: number | null;
  lts_odds_fmt: string;
  fts2h: number;
  fts2h_historical_odds: number | null;
  fts2h_odds_fmt: string;
  two_plus: number;
  two_plus_historical_odds: number | null;
  two_plus_odds_fmt: string;
}

export async function getPlayers(): Promise<PlayerOption[]> {
  return fetchAPI("/api/players");
}

export async function getPlayerPositions(playerId: number): Promise<string[]> {
  const res = await fetchAPI<{ positions: string[] }>(`/api/players/${playerId}/positions`);
  return res.positions;
}

export async function getPlayerSeasons(
  playerId: number,
  opts?: {
    minutesBand?: string;
    positions?: string[];
  }
): Promise<PlayerSeasonRow[]> {
  const params = new URLSearchParams();
  if (opts?.minutesBand) params.set("minutes_band", opts.minutesBand);
  if (opts?.positions && opts.positions.length > 0) {
    for (const p of opts.positions) params.append("positions", p);
  }
  const qs = params.toString();
  return fetchAPI(`/api/players/${playerId}/seasons${qs ? `?${qs}` : ""}`);
}

export async function streamChatMessage(
  message: string,
  history: { role: string; content: string }[],
  callbacks: {
    onToken: (token: string) => void;
    onDone: (history: { role: string; content: string }[]) => void;
    onError: (error: string) => void;
  }
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) {
    callbacks.onError(await res.text() || `HTTP ${res.status}`);
    return;
  }
  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError("No response body");
    return;
  }
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) callbacks.onError(data.error);
            else if (data.token) callbacks.onToken(data.token);
            else if (data.done && data.history) callbacks.onDone(data.history);
          } catch (_) {}
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
