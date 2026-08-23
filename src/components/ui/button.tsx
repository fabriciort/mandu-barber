import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Botao.
 *
 * Alturas pensadas para o dedo antes do mouse: o tamanho padrao tem 44px de
 * area de toque, que e o minimo confortavel em celular. O "afundar" no
 * :active existe porque em tela de toque nao ha hover — sem ele, o toque
 * fica sem resposta ate a tela mudar.
 */
const buttonVariants = cva(
  [
    "pressable relative inline-flex select-none items-center justify-center gap-2",
    "whitespace-nowrap rounded-[var(--radius-md)] font-medium",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-sm)] hover:bg-[var(--accent-hover)]",
        // Os botoes que NAO sao a acao principal ganham vidro: eles convivem
        // com o conteudo, e o translucido os mantem presentes sem competir. O
        // primario segue solido de proposito — no monocromatico, quem carrega
        // a enfase e a inversao, e vidro no primario a apagaria.
        secondary:
          "glass-soft border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]",
        outline:
          "glass-soft border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
        ghost:
          "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
        subtle:
          "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
        // Para uso DENTRO de blocos invertidos (faixa preta no tema claro):
        // troca os papeis de superficie e texto para manter contraste alto.
        inverse:
          "bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
        "inverse-outline":
          "border border-current/30 bg-transparent text-current hover:bg-white/10 dark:hover:bg-black/10",
        // Destrutivo no monocromatico: contorno grosso e texto forte, para
        // pesar mais que um botao comum sem depender de vermelho.
        danger:
          "border-2 border-[var(--text-primary)] bg-transparent font-semibold text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)]",
        link: "h-auto p-0 text-[var(--accent)] underline underline-offset-4 decoration-[var(--border-strong)] hover:decoration-[var(--accent)]",
      },
      size: {
        sm: "h-9 px-3.5 text-sm [&_svg]:size-4",
        md: "h-11 px-4 text-sm [&_svg]:size-4",
        lg: "h-13 px-6 text-base [&_svg]:size-[18px]",
        icon: "size-10 [&_svg]:size-[18px]",
        "icon-sm": "size-9 [&_svg]:size-4",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, block, asChild = false, loading, children, disabled, ...props },
    ref,
  ) => {
    // Slot exige exatamente um filho, entao o spinner so entra no <button>.
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(buttonVariants({ variant, size, block }), className)}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, block }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {/* O conteudo perde opacidade em vez de sumir: o botao nao muda de
            largura ao carregar, entao o layout nao "pula". */}
        <span
          className={cn(
            "inline-flex items-center gap-2 transition-opacity duration-150",
            loading && "opacity-0",
          )}
        >
          {children}
        </span>
        {loading ? (
          <span className="absolute inset-0 grid place-items-center">
            <Loader2 className="size-4 animate-spin" aria-hidden />
          </span>
        ) : null}
      </button>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
