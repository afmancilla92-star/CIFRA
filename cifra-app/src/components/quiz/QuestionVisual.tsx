import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import type { Question } from "@/lib/types";
import { LGlyph } from "@/components/ui/LGlyph";

interface QuestionVisualProps {
  question: Question;
  memoryPhase: "memorize" | "answer";
}

export function QuestionVisual({ question, memoryPhase }: QuestionVisualProps) {
  if (question.type === "matrix") {
    return (
      <div className="mx-auto mb-6 grid max-w-[260px] grid-cols-3 gap-2.5">
        {question.grid.map((s, i) => (
          <div key={i} className="grid aspect-square place-items-center rounded-[10px] bg-petrol-soft text-[26px] text-text">
            {s === null ? <span className="text-petrol">?</span> : s}
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "standard" && question.visualSequence) {
    return (
      <div className="mb-6 flex flex-wrap justify-center gap-2.5">
        {question.visualSequence.map((s, i) => (
          <div key={i} className="grid h-[46px] w-[46px] place-items-center rounded-[11px] border border-border bg-surface text-xl">
            {s}
          </div>
        ))}
        <div className="grid h-[46px] w-[46px] place-items-center rounded-[11px] border border-petrol text-xl text-petrol">?</div>
      </div>
    );
  }

  if (question.type === "memory") {
    if (memoryPhase === "memorize") {
      return (
        <div className="mb-6 flex flex-wrap justify-center gap-2.5">
          {question.sequence.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="grid h-[46px] w-[46px] place-items-center rounded-[11px] border border-border bg-surface text-xl"
            >
              {s}
            </motion.div>
          ))}
        </div>
      );
    }
    return (
      <div className="mb-6 grid place-items-center">
        <div className="grid h-14 w-14 place-items-center rounded-[11px] bg-petrol-soft text-petrol">
          <Layers size={22} />
        </div>
      </div>
    );
  }

  if (question.type === "rotate") {
    return (
      <div className="mb-6 grid place-items-center">
        <div className="inline-block rounded-2xl border border-border bg-surface p-[18px]">
          <LGlyph rotation={question.baseRotation} size={64} />
        </div>
      </div>
    );
  }

  return null;
}
