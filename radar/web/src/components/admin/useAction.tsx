"use client";


import { useRouter } from "next/navigation";
import { useState } from "react";

/** POST/DELETE JSON a una ruta de administración y refresca la página. */
export function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function call(url: string, body?: unknown, method = "POST") {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || data.ok === false) {
        setMessage({ ok: false, text: String(data.error ?? `Error ${res.status}`) });
        return null;
      }
      router.refresh();
      return data;
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { call, busy, message, setMessage };
}

export function Msg({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return <p className={`text-sm ${message.ok ? "text-good" : "text-bad"}`}>{message.text}</p>;
}
