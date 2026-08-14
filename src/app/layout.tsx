import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";

import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Serifa editorial de alto contraste: no monocromatico, a diferenca entre
// hastes grossas e finas e o que substitui a cor como ornamento.
const display = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: "400",
});

/**
 * Endereço público da aplicação, usado nos metadados de compartilhamento.
 *
 * Precisa tolerar variável vazia ou mal preenchida: um deploy nao pode falhar
 * porque alguem deixou o campo em branco no painel do provedor. A ordem é
 * NEXT_PUBLIC_APP_URL -> URL gerada pelo provedor -> localhost.
 */
function resolveAppUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured);
    } catch {
      // Valor invalido (falta o https://, por exemplo): segue para o proximo.
    }
  }

  const providerUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (providerUrl) {
    try {
      return new URL(providerUrl.startsWith("http") ? providerUrl : `https://${providerUrl}`);
    } catch {
      // idem
    }
  }

  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: resolveAppUrl(),
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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
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
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${display.variable}`}>
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
