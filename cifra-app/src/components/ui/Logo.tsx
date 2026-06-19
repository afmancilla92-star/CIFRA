interface LogoProps {
  size?: number;
}

export function Logo({ size = 28 }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border)" strokeWidth="3.5" />
        <circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke="var(--petrol)"
          strokeWidth="3.5"
          strokeDasharray="100"
          strokeDashoffset="34"
          strokeLinecap="round"
          transform="rotate(-90 20 20)"
        />
      </svg>
      <span className="font-display text-[19px] font-extrabold tracking-tight text-text">cifra</span>
    </span>
  );
}
