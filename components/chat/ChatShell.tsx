"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { streamChatMessage } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import HeroHeader from "./HeroHeader";
import ChatInput from "./ChatInput";
import MessageList from "./MessageList";
import PromptCard from "./PromptCard";
import PlayerStatsSection from "./PlayerStatsSection";

type TabId = "chatbot" | "player-stats";

const SUGGESTIONS = [
  "Alex Johnston stats?",
  "Best FTS price for Payne Haas and is it a good bet?",
  "Top 5 FTS wingers since 2022?",
  "Best value ATS bets this round?",
];

const ICONS = {
  trophy: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4.5a2.5 2.5 0 012.5-2.5V9zm0 0V6.5A2.5 2.5 0 108.5 9H6zm12 0h-2.5a2.5 2.5 0 012.5-2.5V9zm0 0V6.5a2.5 2.5 0 10-2.5 2.5H18zM4 22h16M8 22V17a4 4 0 018 0v5M12 6v4M10 8h4" />
    </svg>
  ),
  bar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20V10M18 20V4M6 20v-4" />
    </svg>
  ),
  people: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 108 0 4 4 0 00-8 0zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  trend: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 6l-9.5 9.5-5-5L1 18" />
    </svg>
  ),
};

export default function ChatShell() {
  const [activeTab, setActiveTab] = useState<TabId>("chatbot");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreamingContent] = useState("");
  const [loading, setLoading] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streaming, scrollToBottom]);

  const sendMessage = useCallback(
    (text: string) => {
      const msg = text.trim();
      if (!msg || loading) return;
      setInput("");
      const userMsg: ChatMessage = { role: "user", content: msg };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setStreamingContent("");

      streamChatMessage(
        msg,
        messages.map((m) => ({ role: m.role, content: m.content })),
        {
          onToken: (token) => setStreamingContent((s) => s + token),
          onDone: (newHistory) => {
            setMessages(
              newHistory.map((m) => ({ role: m.role as "user" | "model", content: m.content }))
            );
            setStreamingContent("");
            setLoading(false);
          },
          onError: (err) => {
            let display = err;
            if (typeof window !== "undefined" && err === "Failed to fetch") {
              const isProduction = !/localhost|127\.0\.0\.1/.test(window.location.hostname);
              if (isProduction) {
                display =
                  "Cannot reach API. Set NEXT_PUBLIC_API_URL to your backend URL in Vercel and ensure the backend allows CORS from this site.";
              }
            }
            setMessages((prev) => [
              ...prev,
              { role: "model", content: `Error: ${display}` },
            ]);
            setStreamingContent("");
            setLoading(false);
          },
        }
      );
    },
    [messages, loading]
  );

  const hasMessages = messages.length > 0;

  const startNewChat = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
    setInput("");
  }, []);

  return (
    <div className="gradient-bg min-h-screen flex flex-col">
      <header className="flex-shrink-0 relative">
        <HeroHeader compact={activeTab === "chatbot" && hasMessages} />
        {activeTab === "chatbot" && hasMessages && (
          <button
            type="button"
            onClick={startNewChat}
            className="absolute top-4 right-4 text-sm text-[#5eead4]/90 hover:text-[#5eead4] border border-[#5eead4]/30 hover:border-[#5eead4]/50 rounded-lg px-3 py-1.5 transition-colors"
          >
            New chat
          </button>
        )}
      </header>

      {/* Tab bar */}
      <div className="flex-shrink-0 flex justify-center px-4 pt-2 pb-1">
        <div
          role="tablist"
          aria-label="Main navigation"
          className="inline-flex rounded-xl bg-slate-800/60 border border-slate-600/50 p-1 gap-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "chatbot"}
            aria-controls="chatbot-panel"
            id="chatbot-tab"
            onClick={() => setActiveTab("chatbot")}
            className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
              activeTab === "chatbot"
                ? "bg-[#5eead4]/15 text-[#5eead4] border border-[#5eead4]/40 shadow-[0_0_12px_-2px_rgba(94,234,212,0.3)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 border border-transparent"
            }`}
          >
            Chatbot
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "player-stats"}
            aria-controls="player-stats-panel"
            id="player-stats-tab"
            onClick={() => setActiveTab("player-stats")}
            className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${
              activeTab === "player-stats"
                ? "bg-[#5eead4]/15 text-[#5eead4] border border-[#5eead4]/40 shadow-[0_0_12px_-2px_rgba(94,234,212,0.3)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 border border-transparent"
            }`}
          >
            Player Stats
          </button>
        </div>
      </div>

      <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 pb-6">
        {/* Chatbot tab: only chat interface */}
        {activeTab === "chatbot" && (
          <div
            id="chatbot-panel"
            role="tabpanel"
            aria-labelledby="chatbot-tab"
            className="flex-1 flex flex-col min-h-0"
          >
            {hasMessages || streaming ? (
              <div className="flex-1 overflow-y-auto pt-2">
                <MessageList messages={messages} streamingContent={streaming} />
                <div ref={listEndRef} />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-8 pt-4">
                <div className="w-full max-w-2xl">
                  <ChatInput
                    value={input}
                    onChange={setInput}
                    onSubmit={() => sendMessage(input)}
                    disabled={loading}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {SUGGESTIONS.map((label, i) => (
                    <PromptCard
                      key={i}
                      label={label}
                      icon={[ICONS.trophy, ICONS.bar, ICONS.people, ICONS.trend][i]}
                      onClick={() => sendMessage(label)}
                    />
                  ))}
                </div>
              </div>
            )}

            {(hasMessages || streaming) && (
              <div className="flex-shrink-0 pt-4">
                <ChatInput
                  value={input}
                  onChange={setInput}
                  onSubmit={() => sendMessage(input)}
                  disabled={loading}
                />
              </div>
            )}
          </div>
        )}

        {/* Player Stats tab: only player dropdown + table */}
        {activeTab === "player-stats" && (
          <div
            id="player-stats-panel"
            role="tabpanel"
            aria-labelledby="player-stats-tab"
            className="flex-1 pt-2 min-h-0"
          >
            <PlayerStatsSection />
          </div>
        )}
      </main>
    </div>
  );
}
