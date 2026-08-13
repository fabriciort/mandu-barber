import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";

import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Fraunces e variavel: mantemos o eixo de peso continuo e ligamos SOFT/WONK,
// que dao a ela o ar de tipo desenhado a mao — a assinatura visual da marca.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: "variable",
  axes: ["SOFT", "WONK"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Mandu Barber — Barbearia em São Paulo",
    template: "%s · Mandu Barber",
  },
  description:
    "Agende seu corte na Mandu Barber, acompanhe seu plano de assinatura e escolha o profissional pelo horário que cabe no seu dia.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Mandu Barber",
    title: "Mandu Barber — Barbearia em São Paulo",
    description: "Agendamento online, planos de assinatura e uma equipe que conhece seu corte.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4f1" },
    { media: "(prefers-color-scheme: dark)", color: "#131110" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * Aplica o tema antes da primeira pintura para nao piscar branco em quem
 * escolheu o modo escuro.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('mandu-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${fraunces.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:text-[var(--accent-contrast)]"
        >
          Pular para o conteúdo
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
