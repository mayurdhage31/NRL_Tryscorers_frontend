/** Stacked geometric logo mark with teal neon glow (matches reference). */
export default function LogoMark({ className = "" }: { className?: string }) {
  return (
    <div
      className={`logo-glow w-12 h-12 flex items-center justify-center ${className}`}
      aria-hidden
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-[#5eead4]"
      >
        {/* Three stacked offset rectangles for layered look */}
        <rect
          x="8"
          y="14"
          width="32"
          height="8"
          rx="2"
          fill="currentColor"
          opacity="0.9"
        />
        <rect
          x="10"
          y="20"
          width="28"
          height="8"
          rx="2"
          fill="currentColor"
          opacity="0.7"
        />
        <rect
          x="12"
          y="26"
          width="24"
          height="8"
          rx="2"
          fill="currentColor"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}
