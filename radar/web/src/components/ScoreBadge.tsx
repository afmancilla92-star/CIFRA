import clsx from "clsx";
import { scoreTier } from "@/lib/scoring";

export function ScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const tier = scoreTier(score);
  return (
    <span
      title={`Puntuación orientativa: ${tier.label}`}
      className={clsx(
        "inline-flex items-center gap-1 rounded-full font-semibold tabular-nums",
        size === "lg" ? "px-3 py-1 text-base" : "px-2 py-0.5 text-xs",
        tier.tone === "high" && "bg-accent text-accent-text",
        tier.tone === "mid" && "bg-accent-soft text-accent",
        tier.tone === "low" && "bg-surface-2 text-soft",
      )}
    >
      {score}
      <span className={clsx("font-normal opacity-80", size === "lg" ? "text-xs" : "text-[10px]")}>/100</span>
    </span>
  );
}
