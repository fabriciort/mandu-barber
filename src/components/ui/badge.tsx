import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-[var(--border-strong)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
        accent: "border-brass-500/30 bg-brass-500/12 text-brass-700 dark:text-brass-300",
        success: "border-moss-500/30 bg-moss-500/12 text-moss-600 dark:text-moss-400",
        warning: "border-clay-400/30 bg-clay-400/12 text-clay-500 dark:text-clay-400",
        danger: "border-rust-500/30 bg-rust-500/12 text-rust-500 dark:text-rust-400",
        info: "border-ink-400/30 bg-ink-400/12 text-ink-600 dark:text-ink-300",
        outline: "border-[var(--border-strong)] text-[var(--text-secondary)]",
      },
      size: {
        sm: "px-2 py-0 text-[11px]",
        md: "px-2.5 py-0.5 text-xs",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export function Badge({
  className,
  tone,
  size,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

/** Ponto colorido para status em listas densas. */
export function StatusDot({ tone = "neutral", className }: { tone?: string; className?: string }) {
  const color =
    {
      success: "bg-moss-500",
      accent: "bg-brass-500",
      warning: "bg-clay-400",
      danger: "bg-rust-500",
      info: "bg-ink-400",
      neutral: "bg-ink-400",
    }[tone] ?? "bg-ink-400";

  return <span className={cn("inline-block size-2 rounded-full", color, className)} aria-hidden />;
}

export { badgeVariants };
