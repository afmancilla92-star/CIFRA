import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-6 py-8">
        <Logo size={22} />
        <p className="text-[12.5px] text-text-soft">© 2026 Cifra. Herramienta de autoconocimiento — no constituye diagnóstico clínico.</p>
      </div>
    </footer>
  );
}
