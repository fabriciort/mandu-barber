import Link from "next/link";

import { PanelNav } from "./panel-nav";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notification-bell";
import { requireStaff } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { ROLE_LABEL } from "@/lib/enums";

export const metadata = { title: "Painel" };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff("/painel");

  const [unread, notifications] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Barra lateral fixa no desktop, virando barra inferior no mobile */}
      <aside className="sticky top-0 z-30 hidden w-60 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-muted)] lg:flex lg:h-dvh">
        <div className="flex h-16 items-center border-b border-[var(--border-subtle)] px-5">
          <Logo href="/painel" />
        </div>

        <PanelNav role={user.role} className="flex-1 overflow-y-auto p-3" />

        <div className="border-t border-[var(--border-subtle)] p-3">
          <Link
            href="/minha-conta/perfil"
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-[var(--surface-raised)]"
          >
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{user.name}</span>
              <span className="block text-xs text-[var(--text-muted)]">
                {ROLE_LABEL[user.role]}
              </span>
            </span>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mesmo material da navegacao: o painel carrega tres acoes no topo
            (avisos, tema, perfil) e nao cabe no par "pilula + circulo" do site,
            mas o vidro mantem a familia. */}
        <header className="glass sticky top-0 z-20 flex h-16 items-center gap-3 px-4 sm:px-6">
          <div className="lg:hidden">
            <Logo href="/painel" compact />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              className="hidden rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] sm:block"
            >
              Ver site
            </Link>
            <NotificationBell
              unread={unread}
              notifications={notifications.map((item) => ({
                id: item.id,
                title: item.title,
                body: item.body,
                link: item.link,
                createdAt: item.createdAt.toISOString(),
                read: Boolean(item.readAt),
              }))}
            />
            <ThemeToggle />
            <Link href="/minha-conta/perfil" className="lg:hidden">
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            </Link>
          </div>
        </header>

        <main id="conteudo" className="flex-1 px-4 py-6 pb-32 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Navegacao inferior no mobile */}
      <PanelNav
        role={user.role}
        variant="bottom"
        className="glass fixed inset-x-3 bottom-3 z-30 flex rounded-full p-1.5 pb-safe lg:hidden"
      />
    </div>
  );
}
