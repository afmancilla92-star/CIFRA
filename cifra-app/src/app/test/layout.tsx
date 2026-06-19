import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Haz el test",
  description: "Responde 25 retos de razonamiento, patrones, memoria y visión espacial. Toma entre 10 y 15 minutos.",
  robots: { index: false, follow: false },
};

export default function TestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
