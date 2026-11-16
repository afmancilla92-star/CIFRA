import type { Metadata } from "next";
import "./globals.css";
import { NavLinks } from "@/components/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Cifra Radar — Inteligencia publicitaria",
  description: "Descubre, filtra e investiga anuncios reales publicados en Facebook e Instagram.",
  robots: { index: false, follow: false },
};

const themeScript = `(function(){try{var t=localStorage.getItem('radar-theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-3">
            <a href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight" aria-label="Cifra Radar">
              <img src="/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
              <span className="hidden whitespace-nowrap sm:inline">
                Cifra <span className="text-accent">Radar</span>
              </span>
            </a>
            <NavLinks />
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              {process.env.APP_PASSWORD ? (
                <form action="/api/auth/logout" method="post">
                  <button className="btn-ghost px-2 py-1.5 text-xs" type="submit">
                    Salir
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-[1500px] px-4 pb-10 pt-4 text-xs text-soft">
          Datos públicos de la Biblioteca de Anuncios de Meta, obtenidos por la API oficial o por la extensión a pedido del usuario.
          Las puntuaciones son orientativas y no reflejan ventas ni rentabilidad.
        </footer>
      </body>
    </html>
  );
}
