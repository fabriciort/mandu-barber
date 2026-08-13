import * as React from "react";

import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
} as const;

/**
 * Avatar com iniciais. A cor de fundo deriva do nome, entao a mesma pessoa
 * tem sempre a mesma cor em toda a aplicacao — ajuda a bater o olho na agenda.
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
  const hue = hashHue(name);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold",
        sizes[size],
        className,
      )}
      style={{
        backgroundColor: src ? undefined : `hsl(${hue} 32% 82%)`,
        color: src ? undefined : `hsl(${hue} 45% 24%)`,
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

function hashHue(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) % 360;
  }
  return hash;
}
