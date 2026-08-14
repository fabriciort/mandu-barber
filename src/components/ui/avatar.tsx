import * as React from "react";

import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-2xl",
} as const;

/**
 * Avatar com iniciais.
 *
 * No monocromatico nao da para tingir por pessoa, entao a distincao vem do
 * TOM: o nome define um degrau da escala de cinza, sempre o mesmo para a mesma
 * pessoa. O texto alterna entre claro e escuro conforme o fundo, para o
 * contraste nunca cair.
 */
export function Avatar({
  name,
  src,
  size = "md",
  className,
  ring,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
  ring?: string;
}) {
  const step = hashStep(name);
  // 6 degraus estaveis; abaixo de 45% de luminosidade o texto vira claro.
  const lightness = 22 + step * 13;
  const light = lightness > 45;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold",
        sizes[size],
        className,
      )}
      style={{
        backgroundColor: src ? undefined : `hsl(0 0% ${lightness}%)`,
        color: src ? undefined : light ? "hsl(0 0% 12%)" : "hsl(0 0% 97%)",
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
      }}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

function hashStep(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) % 997;
  }
  return hash % 5;
}
