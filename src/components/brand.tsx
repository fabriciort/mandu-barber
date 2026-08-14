import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * Marca da casa: monograma em navalha estilizada + nome. Desenhado em SVG para
 * ficar nitido em qualquer tamanho e herdar a cor do tema.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-[var(--accent)]" />
      <path
        d="M9.5 22.5 22.5 9.5"
        stroke="var(--accent-contrast)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="11" cy="21" r="3" stroke="var(--accent-contrast)" strokeWidth="2" />
      <circle cx="21" cy="11" r="3" stroke="var(--accent-contrast)" strokeWidth="2" />
      <path d="M13.4 18.6 20 12" stroke="var(--accent-contrast)" strokeWidth="1.4" opacity=".55" />
    </svg>
  );
}

export function Logo({
  href = "/",
  className,
  compact,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)}>
      <BrandMark className="transition-transform duration-300 group-hover:rotate-[-8deg]" />
      {compact ? null : (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg leading-none">Mandu</span>
          <span className="mt-1 text-[9px] uppercase tracking-[0.28em] text-[var(--text-muted)]">
            Barber
          </span>
        </span>
      )}
    </Link>
  );
}
