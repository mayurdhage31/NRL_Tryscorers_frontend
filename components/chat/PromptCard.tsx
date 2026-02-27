interface PromptCardProps {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

export default function PromptCard({ label, icon, onClick }: PromptCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="suggestion-card w-full text-left flex items-center gap-3 rounded-xl glass-card px-4 py-3.5 border border-[var(--card-border)] transition-all duration-200"
    >
      {icon && (
        <span className="flex-shrink-0 text-[#5eead4] opacity-90">
          {icon}
        </span>
      )}
      <span className="text-sm text-slate-200 leading-snug">{label}</span>
    </button>
  );
}
