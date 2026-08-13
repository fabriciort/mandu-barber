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
          className="relative inline-flex size-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          aria-label={unread > 0 ? `${unread} avisos não lidos` : "Avisos"}
        >
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold leading-4 text-[var(--accent-contrast)]">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 animate-[var(--animate-scale-in)] overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] shadow-[var(--shadow-lift)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
            <p className="text-sm font-semibold">Avisos</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                disabled={pending}
                className="flex items-center gap-1 text-xs text-[var(--accent)] transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                <CheckCheck className="size-3.5" />
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
                  <div
                    className={cn(
                      "px-4 py-3 transition-colors hover:bg-[var(--surface-muted)]",
                      !item.read && "bg-[var(--accent-soft)]/40",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!item.read ? (
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                      ) : (
                        <span className="mt-1.5 size-1.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-0.5 text-sm text-[var(--text-muted)]">{item.body}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {formatRelative(new Date(item.createdAt))}
                        </p>
                      </div>
                    </div>
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
