import LogoMark from "@/components/ui/LogoMark";

interface HeroHeaderProps {
  compact?: boolean;
}

export default function HeroHeader({ compact }: HeroHeaderProps) {
  return (
    <div
      className={`flex flex-col items-center text-center ${
        compact ? "py-4 gap-1" : "py-8 gap-3"
      }`}
    >
      <LogoMark className={compact ? "scale-75" : ""} />
      <h1
        className={`font-bold text-white ${
          compact ? "text-xl" : "text-3xl sm:text-4xl"
        }`}
      >
        Wicky AI
      </h1>
      <p
        className={`text-[#94a3b8] ${
          compact ? "text-sm" : "text-base sm:text-lg"
        }`}
      >
        Ask me anything about NRL tryscorer stats.
      </p>
    </div>
  );
}
