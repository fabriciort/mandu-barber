"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Campos de formulario.
 *
 * Altura de 44px (h-11) por padrao: e o alvo minimo confortavel no celular, e
 * tambem impede o zoom automatico do Safari, que amplia a pagina quando o
 * texto do campo tem menos de 16px. Por isso o tamanho da fonte sobe para
 * base no mobile e volta para sm no desktop.
 */
const controlBase = [
  "w-full rounded-[var(--radius-md)] border bg-[var(--surface)] px-3.5",
  "border-[var(--border-default)] text-[var(--text-primary)]",
  "placeholder:text-[var(--text-muted)]",
  "transition-[border-color,box-shadow,background-color] duration-150",
  "hover:border-[var(--border-strong)]",
  "focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10",
  "disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:opacity-60",
  "text-base sm:text-sm",
].join(" ");

/** Marca o campo que falhou na validacao sem depender de cor. */
const controlInvalid =
  "border-[var(--text-primary)] border-2 focus:ring-[var(--accent)]/15";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(controlBase, "h-11", invalid && controlInvalid, className)}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(controlBase, "min-h-24 py-2.5 leading-relaxed", invalid && controlInvalid, className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <select
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      controlBase,
      "h-11 cursor-pointer appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-10",
      invalid && controlInvalid,
      className,
    )}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23808088' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
    }}
    {...props}
  />
));
Select.displayName = "Select";

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn("text-sm font-medium text-[var(--text-primary)]", className)}
      {...props}
    >
      {children}
      {required ? (
        <span className="ml-1 text-[var(--text-muted)]" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

/**
 * Interruptor booleano que sempre envia um valor.
 *
 * Um checkbox desmarcado simplesmente nao entra no FormData, o que faria
 * "desligar" virar "nao informado". O hidden logo depois cobre esse caso — a
 * ordem importa: o FormData segue a ordem do DOM e `get()` devolve o primeiro.
 */
export function CheckboxField({
  name,
  label,
  hint,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "pressable flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3.5",
        "hover:border-[var(--border-strong)] has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--surface-muted)]",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-0.5 size-[18px] shrink-0 accent-[var(--accent)]"
      />
      <input type="hidden" name={name} value="false" />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-muted)]">
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}

/** Agrupa rotulo, controle, dica e erro com a acessibilidade ja ligada. */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p
          className="flex items-start gap-1.5 text-xs font-medium text-[var(--text-primary)]"
          role="alert"
        >
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Aviso de erro do formulario inteiro.
 *
 * Bloco invertido (preto no claro, branco no escuro): sem vermelho para
 * chamar atencao, o contraste maximo e o que garante que ninguem passa direto.
 */
export function FormAlert({ children }: { children: React.ReactNode }) {
  if (!children) return null;

  return (
    <p
      role="alert"
      className="flex animate-[var(--animate-pop)] items-start gap-2.5 rounded-[var(--radius-md)] bg-[var(--surface-inverse)] px-4 py-3 text-sm font-medium text-[var(--text-inverse)]"
    >
      <AlertCircle className="mt-px size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}
