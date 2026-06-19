"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { TOTAL_QUESTIONS } from "@/data/questions";
import { CHECKPOINTS } from "@/data/checkpoints";
import type { Answer, Dimension } from "@/lib/types";
import { Intro } from "@/components/quiz/Intro";
import { QuizScreen } from "@/components/quiz/QuizScreen";
import { CheckpointScreen } from "@/components/quiz/CheckpointScreen";
import { Analyzing } from "@/components/quiz/Analyzing";
import { ResultsScreen } from "@/components/results/ResultsScreen";
import { OfferScreen } from "@/components/offer/OfferScreen";
import { Toast } from "@/components/ui/Toast";

type Screen = "intro" | "quiz" | "checkpoint" | "analyzing" | "results" | "offer";

export default function TestPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [totalElapsedMs, setTotalElapsedMs] = useState(0);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [pendingNextIndex, setPendingNextIndex] = useState<number | null>(null);

  const handleAnswer = useCallback(
    (correct: boolean, dimension: Dimension, elapsedMs: number) => {
      setAnswers((prev) => {
        const next: Answer[] = [...prev, { questionId: questionIndex + 1, correct, dimension, elapsedMs }];
        const completedCount = questionIndex + 1;

        if (completedCount >= TOTAL_QUESTIONS) {
          setTotalElapsedMs(next.reduce((sum, a) => sum + a.elapsedMs, 0));
          setScreen("analyzing");
          return next;
        }

        const checkpoint = CHECKPOINTS.find((c) => c.afterQuestion === completedCount);
        if (checkpoint) {
          setPendingNextIndex(completedCount);
          setScreen("checkpoint");
        } else {
          setQuestionIndex(completedCount);
        }
        return next;
      });
    },
    [questionIndex],
  );

  function continueFromCheckpoint() {
    if (pendingNextIndex !== null) {
      setQuestionIndex(pendingNextIndex);
      setPendingNextIndex(null);
    }
    setScreen("quiz");
  }

  function showToast(message: string) {
    setToast({ show: true, message });
    window.setTimeout(() => setToast({ show: false, message: "" }), 3200);
  }

  function handleCheckout() {
    showToast("Aquí se conectaría tu pasarela de pago (Hotmart, Stripe, etc.)");
  }

  const activeCheckpoint = pendingNextIndex !== null
    ? CHECKPOINTS.find((c) => c.afterQuestion === pendingNextIndex)
    : undefined;

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {screen === "intro" && (
          <motion.div key="intro" exit={{ opacity: 0 }}>
            <Intro onBegin={() => setScreen("quiz")} />
          </motion.div>
        )}

        {screen === "quiz" && (
          <motion.div key="quiz" exit={{ opacity: 0 }}>
            <QuizScreen questionIndex={questionIndex} onAnswer={handleAnswer} />
          </motion.div>
        )}

        {screen === "checkpoint" && activeCheckpoint && (
          <motion.div key="checkpoint" exit={{ opacity: 0 }}>
            <CheckpointScreen
              eyebrow={activeCheckpoint.eyebrow}
              title={activeCheckpoint.title}
              text={activeCheckpoint.text}
              percent={(activeCheckpoint.afterQuestion / TOTAL_QUESTIONS) * 100}
              onContinue={continueFromCheckpoint}
            />
          </motion.div>
        )}

        {screen === "analyzing" && (
          <motion.div key="analyzing" exit={{ opacity: 0 }}>
            <Analyzing onDone={() => setScreen("results")} />
          </motion.div>
        )}

        {screen === "results" && (
          <motion.div key="results" exit={{ opacity: 0 }}>
            <ResultsScreen answers={answers} totalElapsedMs={totalElapsedMs} onUnlock={() => setScreen("offer")} />
          </motion.div>
        )}

        {screen === "offer" && (
          <motion.div key="offer" exit={{ opacity: 0 }}>
            <OfferScreen onBack={() => setScreen("results")} onCheckout={handleCheckout} />
          </motion.div>
        )}
      </AnimatePresence>

      <Toast show={toast.show} message={toast.message} />

      {screen === "intro" && (
        <button
          type="button"
          onClick={() => router.push("/")}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 text-[13px] text-text-soft"
        >
          Volver al inicio
        </button>
      )}
    </div>
  );
}
