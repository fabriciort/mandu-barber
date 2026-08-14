"use client";

import * as React from "react";
import { AlertTriangle, Check, Info, X } from "lucide-react";

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

/**
 * Sem cor para separar os tipos, quem faz esse trabalho e o icone e a duracao:
 * erro fica mais tempo na tela e chega com um simbolo de alerta.
 */
const TONE_ICON: Record<ToastTone, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  success: Check,
  error: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

const TONE_DURATION: Record<ToastTone, number> = {
  success: 4500,
  info: 4500,
  warning: 6000,
  error: 7000,
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
      // Limita a pilha: mais de tres avisos empilhados viram ruido e cobrem a tela.
      setToasts((current) => [...current.slice(-2), { ...input, id }]);
      setTimeout(() => dismiss(id), TONE_DURATION[input.tone]);
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
      {/* No celular os avisos entram por baixo, perto do polegar e longe do
          topo onde ficam a hora e a bateria; no desktop, canto superior direito. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col-reverse items-center gap-2 p-4 pb-safe sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-0 sm:flex-col sm:items-end"
        role="region"
        aria-label="Notificações"
      >
        {toasts.map((item) => {
          const Icon = TONE_ICON[item.tone];
          return (
            <div
              key={item.id}
              role="status"
              aria-live="polite"
              className={cn(
                "pointer-events-auto relative flex w-full max-w-sm animate-[var(--animate-rise)] items-start gap-3 overflow-hidden",
                "rounded-[var(--radius-lg)] bg-[var(--surface-inverse)] p-3.5 pr-2.5 text-[var(--text-inverse)]",
                "shadow-[var(--shadow-xl)]",
              )}
            >
              <span
                className={cn(
                  "mt-px flex size-5 shrink-0 items-center justify-center rounded-full",
                  item.tone === "success"
                    ? "bg-[var(--text-inverse)] text-[var(--surface-inverse)]"
                    : "border border-current",
                )}
                aria-hidden
              >
                <Icon className="size-3" strokeWidth={2.5} />
              </span>

              <div className="min-w-0 flex-1 pt-px">
                <p className="text-sm font-medium leading-snug">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-sm leading-snug opacity-65">{item.description}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="pressable -mt-0.5 rounded-[var(--radius-xs)] p-1.5 opacity-55 hover:bg-white/10 hover:opacity-100 dark:hover:bg-black/10"
                aria-label="Fechar aviso"
              >
                <X className="size-4" />
              </button>

              {/* Barra de tempo: mostra que o aviso vai embora sozinho. */}
              <span
                className="absolute inset-x-0 bottom-0 h-px origin-left bg-current opacity-30"
                style={{
                  animation: `toast-timer ${TONE_DURATION[item.tone]}ms linear forwards`,
                }}
                aria-hidden
              />
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
