import Link from "next/link";
import { CalendarDays, CreditCard, LayoutDashboard, UserCog } from "lucide-react";

import { requireUser } from "@/server/auth/guards";
import { AccountTabs } from "./account-tabs";

const TABS = [
  { href: "/minha-conta", label: "Resumo", icon: LayoutDashboard },
  { href: "/minha-conta/agendamentos", label: "Agendamentos", icon: CalendarDays },
  { href: "/minha-conta/plano", label: "Meu plano", icon: CreditCard },
  { href: "/minha-conta/perfil", label: "Perfil", icon: UserCog },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/minha-conta");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Minha conta
          </p>
          <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Ola, {user.name.split(" ")[0]}
          </h1>
        </div>

        {user.role !== "CLIENT" ? (
          <Link
            href="/painel"
            className="rounded-lg border border-[var(--border-strong)] px-3 py-2 text-sm font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Ir para o painel da equipe
          </Link>
        ) : null}
      </div>

      <AccountTabs tabs={TABS.map(({ icon: _icon, ...tab }) => tab)} />

      <div className="mt-8">{children}</div>
    </div>
  );
}
