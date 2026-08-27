"use client";

import * as React from "react";
import { Apple, CalendarPlus, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

/**
 * "Adicionar à agenda" — leva o horario para o calendario do cliente.
 *
 * POR QUE DUAS OPCOES, E NAO UM BOTAO SO
 *
 * Nao existe um destino que sirva bem aos dois telefones. No Android, o link
 * do Google Agenda abre o proprio app. No iPhone, esse link cai no navegador e
 * pede login; ja o arquivo .ics abre a folha "Adicionar evento" do Calendario
 * direto, sem login nenhum.
 *
 * Daria para adivinhar pelo aparelho e mostrar um botao so. Nao adivinho: tem
 * gente de iPhone que vive no Google Agenda e gente de Android que usa a
 * agenda da Samsung. Errar o palpite custa o cliente cair numa tela de login
 * que ele nao pediu. Entao as duas ficam a vista, e o aparelho so ganha uma
 * marca de "recomendado" — dica, nao decisao.
 *
 * A marca so aparece DEPOIS de montar, de proposito: o servidor nao sabe o
 * aparelho, e renderizar coisas diferentes nos dois lados quebraria a
 * hidratacao.
 */
export function AddToCalendar({
  appointmentId,
  className,
  variant = "secondary",
  size = "sm",
  block = false,
}: {
  appointmentId: string;
  className?: string;
  variant?: "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  block?: boolean;
}) {
  const [ehApple, setEhApple] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    // iPad moderno se anuncia como Mac; o toque e o que o denuncia.
    const ua = navigator.userAgent;
    const tocaEEhMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    setEhApple(/iPhone|iPad|iPod/.test(ua) || tocaEEhMac);
  }, []);

  const base = `/api/agendamentos/${appointmentId}/agenda`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} block={block} className={className}>
          <CalendarPlus className="size-4" />
          Adicionar à agenda
        </Button>
      </DialogTrigger>

      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Adicionar à agenda</DialogTitle>
          <DialogDescription>
            Escolha onde salvar. O evento já vai com endereço, profissional e um aviso duas horas
            antes.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-2.5">
          <Opcao
            href={`${base}?d=google`}
            // Sai do site: o Google abre a tela de confirmar o evento.
            externo
            titulo="Google Agenda"
            apoio="Abre o app no Android, ou o site no computador"
            recomendado={ehApple === false}
            icone={<GoogleAgendaIcone />}
          />

          <Opcao
            href={`${base}?d=ics`}
            titulo="Calendário do iPhone, Outlook e outros"
            apoio="Baixa o convite e a agenda do aparelho abre sozinha"
            recomendado={ehApple === true}
            icone={<Apple className="size-[18px]" strokeWidth={1.6} />}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function Opcao({
  href,
  titulo,
  apoio,
  icone,
  recomendado,
  externo,
}: {
  href: string;
  titulo: string;
  apoio: string;
  icone: React.ReactNode;
  recomendado: boolean;
  externo?: boolean;
}) {
  return (
    <a
      href={href}
      // Link comum, e nao <Link> do Next: os dois destinos saem do site (um
      // desvia para o Google, o outro baixa arquivo). Roteador de cliente nao
      // tem o que fazer aqui e so atrapalharia o download.
      {...(externo ? { target: "_blank", rel: "noreferrer" } : {})}
      className={cn(
        "pressable flex items-center gap-3.5 rounded-[var(--radius-lg)] border p-3.5",
        "border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]",
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)]">
        {icone}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium">{titulo}</span>
          {recomendado ? (
            <span className="rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-[11px] leading-4 text-[var(--text-secondary)]">
              recomendado
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-[var(--text-muted)]">{apoio}</span>
      </span>

      <ChevronRight className="size-4 shrink-0 text-[var(--text-muted)]" />
    </a>
  );
}

/** O "31" do calendario do Google, em monocromatico como o resto da casa. */
function GoogleAgendaIcone() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" aria-hidden>
      <rect
        x="3"
        y="4.5"
        width="18"
        height="16"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3v3M16 3v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <text
        x="12"
        y="17.5"
        textAnchor="middle"
        fontSize="7"
        fontWeight="600"
        fill="currentColor"
        fontFamily="system-ui, sans-serif"
      >
        31
      </text>
    </svg>
  );
}
