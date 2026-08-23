"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { Bell, CheckCheck } from "lucide-react";

import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/time";
import { markNotificationsReadAction } from "@/server/actions/notifications";

type Item = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  read: boolean;
};

export function NotificationBell({ unread, notifications }: { unread: number; notifications: Item[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function markAllRead() {
    startTransition(async () => {
      await markNotificationsReadAction();
      router.refresh();
    });
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="pressable relative inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          aria-label={unread > 0 ? `${unread} avisos não lidos` : "Avisos"}
        >
          <Bell className="size-[18px]" aria-hidden />
          {unread > 0 ? (
            // O contador ganha um anel da cor da superficie para nao encostar
            // no sino e virar uma mancha unica.
            <span className="tnum absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold leading-4 text-[var(--accent-contrast)] ring-2 ring-[var(--surface)]">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="glass z-50 w-[min(20rem,calc(100vw-1.5rem))] animate-[var(--animate-pop)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-xl)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
            <p className="text-sm font-semibold">Avisos</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                disabled={pending}
                className="flex items-center gap-1 text-xs font-medium underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:decoration-[var(--accent)] disabled:opacity-50"
              >
                <CheckCheck className="size-3.5" aria-hidden />
                Marcar como lidos
              </button>
            ) : null}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              Nenhum aviso por aqui.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-[var(--border-subtle)] overflow-y-auto">
              {notifications.map((item) => {
                const content = (
                  /* Nao lido: barra vertical na borda esquerda. Marca a linha
                     inteira sem pintar o fundo, que no monocromatico ficaria
                     igual ao hover. */
                  <div
                    className={cn(
                      "relative py-3 pl-5 pr-4 transition-colors hover:bg-[var(--surface-muted)]",
                      !item.read && "bg-[var(--surface-muted)]",
                    )}
                  >
                    {!item.read ? (
                      <span
                        className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--accent)]"
                        aria-hidden
                      />
                    ) : null}
                    <p className={cn("text-sm", item.read ? "font-medium" : "font-semibold")}>
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-pretty text-sm text-[var(--text-secondary)]">
                      {item.body}
                    </p>
                    <p className="mt-1.5 text-2xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      {formatRelative(new Date(item.createdAt))}
                    </p>
                  </div>
                );

                return (
                  <li key={item.id}>
                    {item.link ? (
                      <Link href={item.link} onClick={() => setOpen(false)} className="block">
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
