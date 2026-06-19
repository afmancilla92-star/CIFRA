import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-petrol">
      {children}
    </span>
  );
}
