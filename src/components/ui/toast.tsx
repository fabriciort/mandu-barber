"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info" | "warning";

type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
};

type ToastContextValue = {
  toast: (input: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const TONE_CONFIG: Record<ToastTone, { icon: React.ComponentType<{ className?: string }>; className: string }> = {
  success: { icon: CheckCircle2, className: "text-moss-500" },
  error: { icon: XCircle, className: "text-rust-500" },
  warning: { icon: AlertTriangle, className: "text-clay-400" },
  info: { icon: Info, className: "text-brass-500" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const counter = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (input: Omit<Toast, "id">) => {
      const id = ++counter.current;
      setToasts((current) => [...current, { ...input, id }]);
      setTimeout(() => dismiss(id), input.tone === "error" ? 7000 : 4500);
    },
    [dismiss],
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ tone: "success", title, description }),
      error: (title, description) => toast({ tone: "error", title, description }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:bottom-auto sm:right-0 sm:top-0 sm:items-end"
        role="region"
        aria-label="Notificações"
      >
        {toasts.map((item) => {
          const config = TONE_CONFIG[item.tone];
          const Icon = config.icon;
          return (
            <div
              key={item.id}
              role="status"
              aria-live="polite"
              className="pointer-events-auto flex w-full max-w-sm animate-[var(--animate-scale-in)] items-start gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-3.5 shadow-[var(--shadow-lift)]"
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", config.className)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded p-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                aria-label="Fechar aviso"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return context;
}
