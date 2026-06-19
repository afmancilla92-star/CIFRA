"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QUESTIONS, TOTAL_QUESTIONS } from "@/data/questions";
import type { Dimension } from "@/lib/types";
import { Ring } from "@/components/ui/Ring";
import { QuestionVisual } from "@/components/quiz/QuestionVisual";
import { OptionsGrid } from "@/components/quiz/OptionsGrid";

interface QuizScreenProps {
  questionIndex: number;
  onAnswer: (correct: boolean, dimension: Dimension, elapsedMs: number) => void;
}

export function QuizScreen({ questionIndex, onAnswer }: QuizScreenProps) {
  const question = QUESTIONS[questionIndex]!;
  const [memoryPhase, setMemoryPhase] = useState<"memorize" | "answer">(question.type === "memory" ? "memorize" : "answer");
  const [memoryCountdown, setMemoryCountdown] = useState(question.type === "memory" ? question.memorizeSeconds : 0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());

  useEffect(() => {
    setSelectedIndex(null);
    setStartedAt(Date.now());

    if (question.type === "memory") {
      setMemoryPhase("memorize");
      setMemoryCountdown(question.memorizeSeconds);
      const interval = setInterval(() => {
        setMemoryCountdown((c) => {
          if (c <= 1) {
            clearInterval(interval);
            setMemoryPhase("answer");
            setStartedAt(Date.now());
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex]);

  const showOptions = question.type !== "memory" || memoryPhase === "answer";
  const percent = (questionIndex / TOTAL_QUESTIONS) * 100;

  function handleSelect(index: number) {
    if (selectedIndex !== null) return;
    setSelectedIndex(index);
    const elapsedMs = Date.now() - startedAt;
    window.setTimeout(() => onAnswer(index === question.correct, question.dimension, elapsedMs), 480);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="glass sticky top-0 z-30 border-b border-border">
        <div className="mx-auto max-w-[640px] px-6 py-4">
          <div className="mb-2 flex justify-between">
            <span className="font-mono text-[11.5px] uppercase text-text-soft">
              Pregunta {questionIndex + 1} de {TOTAL_QUESTIONS}
            </span>
            <span className="font-mono text-[11.5px] uppercase text-petrol">{question.difficulty}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-petrol transition-[width] duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid flex-1 place-items-center px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={questionIndex}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-[560px] rounded-[20px] border border-border bg-surface p-7 shadow-soft dark:shadow-soft-dark"
          >
            <span className="font-mono text-[11px] font-semibold uppercase text-violet">{question.category}</span>

            {question.type === "memory" && memoryPhase === "memorize" ? (
              <>
                <h2 className="my-2.5 mb-[22px] font-display text-xl font-bold text-text">Memoriza esta secuencia</h2>
                <QuestionVisual question={question} memoryPhase={memoryPhase} />
                <div className="flex justify-center">
                  <Ring percent={(memoryCountdown / question.memorizeSeconds) * 100} size={48} stroke={4} color="var(--amber)">
                    <span className="font-mono text-[13px] font-bold">{memoryCountdown}</span>
                  </Ring>
                </div>
              </>
            ) : (
              <>
                <h2 className="my-2.5 mb-[22px] font-display text-[20px] font-bold leading-snug text-text">{question.prompt}</h2>
                <QuestionVisual question={question} memoryPhase={memoryPhase} />
                {showOptions && <OptionsGrid question={question} selectedIndex={selectedIndex} onSelect={handleSelect} />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
