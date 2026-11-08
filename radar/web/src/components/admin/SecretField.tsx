"use client";

import { useState } from "react";

export function SecretField({ value, label }: { value: string; label: string }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex gap-2">
        <input readOnly value={shown ? value : "•".repeat(Math.min(24, value.length))} className="input font-mono text-xs" />
        <button type="button" className="btn-ghost px-2 text-xs" onClick={() => setShown((s) => !s)}>
          {shown ? "Ocultar" : "Mostrar"}
        </button>
        <button
          type="button"
          className="btn-ghost px-2 text-xs"
          onClick={async () => {
            await navigator.clipboard.writeText(value).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
