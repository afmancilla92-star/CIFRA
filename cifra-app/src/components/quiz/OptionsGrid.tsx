import type { Question } from "@/lib/types";
import { LGlyph } from "@/components/ui/LGlyph";
import { Check } from "lucide-react";

interface OptionsGridProps {
  question: Question;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

function columnsFor(question: Question): number {
  if (question.type === "rotate") return 3;
  const options = question.options as Array<string>;
  const allShort = options.every((o) => String(o).length <= 3);
  return allShort ? 3 : 2;
}

const BUTTON_CLASS =
  "option-btn flex items-center justify-center gap-1 rounded-[13px] border-[1.5px] border-border bg-surface px-2 py-3.5 text-center text-sm font-semibold text-text transition-all enabled:hover:-translate-y-px enabled:hover:border-petrol disabled:cursor-default data-[correct=true]:border-jade data-[correct=true]:text-jade data-[wrong=true]:border-red-400 data-[wrong=true]:opacity-50";

export function OptionsGrid({ question, selectedIndex, onSelect }: OptionsGridProps) {
  const columns = columnsFor(question);
  const gridStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };

  if (question.type === "rotate") {
    return (
      <div className="grid gap-2.5" style={gridStyle}>
        {question.options.map((opt, i) => {
          const isSelected = selectedIndex === i;
          const isCorrect = selectedIndex !== null && i === question.correct;
          const isWrongPick = isSelected && i !== question.correct;
          return (
            <button
              key={i}
              type="button"
              disabled={selectedIndex !== null}
              onClick={() => onSelect(i)}
              data-correct={isCorrect ? "true" : undefined}
              data-wrong={isWrongPick ? "true" : undefined}
              className={BUTTON_CLASS}
            >
              <LGlyph rotation={opt.rot} flip={!!opt.flip} size={34} />
              {isCorrect && <Check size={15} />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-2.5" style={gridStyle}>
      {question.options.map((opt, i) => {
        const isSelected = selectedIndex === i;
        const isCorrect = selectedIndex !== null && i === question.correct;
        const isWrongPick = isSelected && i !== question.correct;
        return (
          <button
            key={i}
            type="button"
            disabled={selectedIndex !== null}
            onClick={() => onSelect(i)}
            data-correct={isCorrect ? "true" : undefined}
            data-wrong={isWrongPick ? "true" : undefined}
            className={BUTTON_CLASS}
          >
            <span>{opt}</span>
            {isCorrect && <Check size={15} />}
          </button>
        );
      })}
    </div>
  );
}
