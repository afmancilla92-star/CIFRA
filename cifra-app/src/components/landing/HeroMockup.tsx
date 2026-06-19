import { Ring } from "@/components/ui/Ring";

const PREVIEW_GRID = ["●", "■", "▲", "■", "▲", "●", "▲", "●", "?"];
const PREVIEW_OPTIONS = ["■", "●", "▲", "★", "◆", "○"];

export function HeroMockup() {
  return (
    <div className="w-full max-w-[360px] rounded-xl2 border border-border bg-surface p-[22px] shadow-soft dark:shadow-soft-dark">
      <div className="mb-[18px] flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase text-text-soft">Reto 9 de 25</span>
        <Ring percent={36} size={34} stroke={4}>
          <span className="font-mono text-[9px] font-bold text-petrol">36%</span>
        </Ring>
      </div>
      <div className="mb-[18px] grid grid-cols-3 gap-2">
        {PREVIEW_GRID.map((s, i) => (
          <div key={i} className="grid aspect-square place-items-center rounded-[10px] bg-petrol-soft text-xl text-text">
            {s === "?" ? <span className="text-petrol">?</span> : s}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PREVIEW_OPTIONS.map((s, i) => (
          <div key={i} className="grid place-items-center rounded-[9px] border border-border bg-surface py-2.5 text-base text-text-soft">
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}
