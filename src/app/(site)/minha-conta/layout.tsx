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
    <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
            Minha conta
          </p>
          <h1 className="mt-2 font-display text-[2.25rem] leading-none sm:text-5xl">
            Olá, {user.name.split(" ")[0]}
          </h1>
        </div>

        {user.role !== "CLIENT" ? (
          <Link
            href="/painel"
            className="pressable rounded-[var(--radius-md)] border border-[var(--border-default)] px-3.5 py-2 text-sm font-medium hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
          >
            Ir para o painel da equipe
          </Link>
        ) : null}
      </div>

      <AccountTabs tabs={TABS.map(({ icon: _icon, ...tab }) => tab)} />

      <div className="mt-9">{children}</div>
    </div>
  );
}
