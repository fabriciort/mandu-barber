"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Dialogo responsivo.
 *
 * No celular vira folha que sobe do rodape (bottom sheet): fica no alcance do
 * polegar, ganha a largura toda e usa o gesto que a pessoa ja conhece dos apps
 * nativos. No desktop e a caixa centralizada de sempre. E o mesmo componente —
 * quem usa nao precisa escolher.
 */
export function DialogContent({
  className,
  children,
  size = "md",
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  size?: "sm" | "md" | "lg";
}) {
  const width = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-3xl" }[size];

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-[3px]",
          "data-[state=open]:animate-[var(--animate-fade)]",
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          // Vidro forte: e camada sobreposta, como a navegacao. Sobre o veu
          // escuro do fundo, o desfoque mostra que a pagina continua ali atras.
          "glass fixed z-50 flex flex-col overflow-hidden",
          "shadow-[var(--shadow-xl)] focus:outline-none",
          // Celular: folha colada embaixo, cantos arredondados so em cima.
          "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[var(--radius-2xl)]",
          "data-[state=open]:animate-[var(--animate-sheet-up)]",
          // Desktop: caixa centralizada.
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-3rem)]",
          "sm:max-h-[88vh] sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:rounded-[var(--radius-xl)] sm:border sm:border-[var(--border-default)]",
          "sm:data-[state=open]:animate-[var(--animate-pop)]",
          width,
          className,
        )}
        {...props}
      >
        {/* Alca visual da folha: sinaliza "isto sobe e desce" no celular. */}
        <div className="flex justify-center pt-3 sm:hidden" aria-hidden>
          <span className="h-1 w-9 rounded-full bg-[var(--border-strong)]" />
        </div>

        {children}

        <DialogPrimitive.Close
          className="pressable absolute right-3 top-3 hidden rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] sm:block"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 border-b border-[var(--border-subtle)] px-5 pb-4 pt-4 sm:pr-14",
        className,
      )}
      {...props}
    />
  );
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex-1 overflow-y-auto overscroll-contain p-5", className)} {...props} />
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // No celular os botoes empilham e o principal fica em cima (mais perto
        // do polegar); no desktop voltam para a linha, alinhados a direita.
        "flex flex-col-reverse gap-2 border-t border-[var(--border-subtle)] p-5 pb-safe",
        "sm:flex-row sm:justify-end sm:pb-5",
        "[&>*]:w-full sm:[&>*]:w-auto",
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-lg font-semibold tracking-[var(--tracking-tight)]", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm leading-relaxed text-[var(--text-muted)]", className)}
      {...props}
    />
  );
}
