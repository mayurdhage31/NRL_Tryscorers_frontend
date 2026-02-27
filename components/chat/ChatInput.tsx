"use client";

import { useRef, useEffect } from "react";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Ask about NRL tryscorer stats...",
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSubmit();
    }
  };

  return (
    <div className="glass-card rounded-2xl border border-[var(--card-border)] px-4 py-3 flex flex-col gap-2 min-h-[56px]">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-slate-100 placeholder:text-slate-500 resize-none focus:outline-none min-h-[24px] max-h-[160px] text-base"
        />
        <button
          type="button"
          onClick={() => value.trim() && onSubmit()}
          disabled={disabled || !value.trim()}
          className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#5eead4]/20 text-[#5eead4] flex items-center justify-center hover:bg-[#5eead4]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Send"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-400 hover:bg-white/5 transition-colors"
          aria-label="Attachment"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <div className="flex items-center gap-1">
          <span className="w-7 h-7 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs" title="Suggestions">?</span>
          <span className="w-7 h-7 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-semibold" title="Stats">G</span>
        </div>
      </div>
    </div>
  );
}
