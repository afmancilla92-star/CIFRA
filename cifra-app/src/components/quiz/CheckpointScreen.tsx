"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Ring } from "@/components/ui/Ring";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface CheckpointScreenProps {
  eyebrow: string;
  title: string;
  text: string;
  percent: number;
  onContinue: () => void;
}

export function CheckpointScreen({ eyebrow, title, text, percent, onContinue }: CheckpointScreenProps) {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-[420px] rounded-[20px] border border-border bg-surface p-8 text-center shadow-soft dark:shadow-soft-dark"
      >
        <div className="mb-5 flex justify-center">
          <Ring percent={percent} size={64} stroke={6} color="var(--jade)">
            <span className="font-mono text-xs font-bold text-jade">{Math.round(percent)}%</span>
          </Ring>
        </div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="my-2 font-display text-[22px] font-bold text-text">{title}</h2>
        <p className="mb-6 text-sm leading-relaxed text-text-soft">{text}</p>
        <button
          type="button"
          onClick={onContinue}
          className="mx-auto flex items-center justify-center gap-2 rounded-[13px] bg-petrol px-6 py-3 text-[14.5px] font-semibold text-white transition-transform hover:-translate-y-px"
        >
          Continuar <ArrowRight size={16} />
        </button>
      </motion.div>
    </div>
  );
}
