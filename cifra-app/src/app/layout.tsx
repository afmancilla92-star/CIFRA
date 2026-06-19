import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-manrope", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-jakarta", display: "swap" });

const SITE_URL = "https://cifra-mu.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Cifra — Evaluación cognitiva interactiva",
    template: "%s · Cifra",
  },
  description:
    "Cifra mide tu razonamiento lógico, percepción de patrones, memoria de trabajo y visión espacial en 25 retos. Recibe tu puntaje, tu percentil y tu perfil cognitivo en 10-15 minutos.",
  keywords: ["test de razonamiento", "evaluación cognitiva", "test de lógica", "memoria de trabajo", "percentil cognitivo"],
  openGraph: {
    title: "Cifra — Evaluación cognitiva interactiva",
    description: "25 retos. 10-15 minutos. Un perfil cognitivo claro y comparado con el promedio.",
    url: SITE_URL,
    siteName: "Cifra",
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cifra — Evaluación cognitiva interactiva",
    description: "25 retos. 10-15 minutos. Un perfil cognitivo claro y comparado con el promedio.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e12" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} ${manrope.variable} ${jakarta.variable} font-body`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
