"use client";

import type { ChatMessage } from "@/lib/types";

interface MessageListProps {
  messages: ChatMessage[];
  streamingContent: string;
}

export default function MessageList({ messages, streamingContent }: MessageListProps) {
  return (
    <div className="flex flex-col gap-4 pb-4">
      {messages.map((m, i) => (
        <div
          key={i}
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
              m.role === "user"
                ? "bg-[#5eead4]/15 text-slate-100 border border-[#5eead4]/25"
                : "bg-slate-800/60 text-slate-200 border border-slate-600/50"
            }`}
          >
            <p
              className={`text-sm sm:text-base break-words ${
                m.role === "user"
                  ? "whitespace-pre-wrap"
                  : "whitespace-pre-line leading-snug"
              }`}
            >
              {m.content}
            </p>
          </div>
        </div>
      ))}
      {streamingContent && (
        <div className="flex justify-start">
          <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-slate-800/60 text-slate-200 border border-slate-600/50">
            <p className="text-sm sm:text-base break-words whitespace-pre-line leading-snug">
              {streamingContent}
              <span className="inline-block w-2 h-4 bg-[#5eead4] animate-pulse ml-0.5 align-middle" />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
