"use client";

import type { FormEvent, ReactNode } from "react";

/** Formulario GET que se envía solo al cambiar selects y casillas (los campos de texto esperan Enter). */
export function AutoSubmitForm({ children, className, action }: { children: ReactNode; className?: string; action?: string }) {
  function onChange(e: FormEvent<HTMLFormElement>) {
    const t = e.target as HTMLInputElement;
    if (t.tagName === "SELECT" || t.type === "checkbox" || t.type === "radio") e.currentTarget.requestSubmit();
  }
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    // Quita parámetros vacíos para URLs limpias y compartibles.
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const p = new URLSearchParams();
    data.forEach((v, k) => {
      if (typeof v === "string" && v !== "") p.set(k, v);
    });
    const s = p.toString();
    window.location.href = `${action ?? window.location.pathname}${s ? `?${s}` : ""}`;
  }
  return (
    <form method="get" action={action} onChange={onChange} onSubmit={onSubmit} className={className}>
      {children}
    </form>
  );
}
