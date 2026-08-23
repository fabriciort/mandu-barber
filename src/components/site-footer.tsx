import Link from "next/link";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { AConfirmar } from "@/components/a-confirmar";
import { getShopConfig, formatAddress } from "@/server/services/settings";
import { formatMinutesLabel } from "@/lib/time";
import { formatPhone } from "@/lib/format";
import { WEEKDAY_LABEL } from "@/lib/enums";
import { EMPRESA, PENDENCIAS } from "@/content/mr-mandu";

export async function SiteFooter() {
  const shop = await getShopConfig();

  return (
    <footer className="mt-24 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            {/* Mesma ordem do cabecalho: nome e depois o poste, como no
                logotipo da casa. */}
            <span className="font-display text-xl leading-none tracking-[-0.02em]">
              {shop.name}
            </span>
            <BrandMark className="h-8" />
          </div>
          <p className="mt-3 max-w-sm text-sm text-[var(--text-muted)]">{shop.tagline}</p>

          <div className="mt-5 space-y-2 text-sm">
            {shop.addressLine ? (
              <p className="flex items-start gap-2 text-[var(--text-secondary)]">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--text-muted)]" />
                <span>
                  {formatAddress(shop)}
                  {shop.mapsUrl ? (
                    <>
                      {" · "}
                      <a
                        href={shop.mapsUrl}
                        className="underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        ver no mapa
                      </a>
                    </>
                  ) : null}
                </span>
              </p>
            ) : null}

            {/* Os dois fixos confirmados. Nao ha botao de WhatsApp aqui:
                TODO [A DEFINIR] PENDENCIAS.whatsapp — nao sabemos qual numero
                atende no aplicativo, e link de WhatsApp errado e pior do que
                nenhum: o cliente escreve, ninguem responde, e ele acha que a
                barbearia o ignorou. */}
            <p className="flex items-start gap-2 text-[var(--text-secondary)]">
              <Phone className="mt-0.5 size-4 shrink-0 text-[var(--text-muted)]" />
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {EMPRESA.telefones.map((numero) => (
                  <a
                    key={numero}
                    href={`tel:+55${numero}`}
                    className="underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline"
                  >
                    {formatPhone(numero)}
                  </a>
                ))}
                {PENDENCIAS.whatsapp.pendente ? (
                  <AConfirmar o={PENDENCIAS.whatsapp} className="text-2xs">
                    WhatsApp
                  </AConfirmar>
                ) : null}
              </span>
            </p>

            <p className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Mail className="size-4 shrink-0 text-[var(--text-muted)]" />
              <a
                href={`mailto:${EMPRESA.email}`}
                className="break-all underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline"
              >
                {EMPRESA.email}
              </a>
            </p>

            <p className="flex items-start gap-2 text-[var(--text-secondary)]">
              <Instagram className="mt-0.5 size-4 shrink-0 text-[var(--text-muted)]" />
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <a
                  href={`https://instagram.com/${EMPRESA.redes.instagram}`}
                  className="underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  @{EMPRESA.redes.instagram}
                </a>
                <span className="text-[var(--text-muted)]">·</span>
                <a
                  href={`https://instagram.com/${EMPRESA.redes.instagramFundador}`}
                  className="underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  @{EMPRESA.redes.instagramFundador}
                </a>
              </span>
            </p>

            <p className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Facebook className="size-4 shrink-0 text-[var(--text-muted)]" />
              {EMPRESA.redes.facebook}
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-2xs font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)]">Horários</h3>

          {/* TODO [A DEFINIR] PENDENCIAS.horarios — mesma regra da home: a
              tabela do banco existe para o motor de agenda calcular horario
              livre, e nao e a jornada real da loja. Rodape e o lugar onde as
              pessoas VAO conferir se esta aberto; publicar horario errado aqui
              faz alguem atravessar a cidade a toa. */}
          {PENDENCIAS.horarios.pendente ? (
            <div className="mt-3">
              <AConfirmar o={PENDENCIAS.horarios}>horários</AConfirmar>
              <p className="mt-2.5 text-sm leading-snug text-[var(--text-muted)]">
                Em conferência. Confirme por telefone antes de vir — a agenda online já mostra os
                horários livres de verdade.
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm text-[var(--text-muted)]">
              {shop.businessHours.map((blocks, weekday) => (
                <li key={weekday} className="flex justify-between gap-4 tabular-nums">
                  <span>{WEEKDAY_LABEL[weekday]}</span>
                  <span className={blocks.length === 0 ? "text-[var(--text-muted)]" : "font-medium text-[var(--text-secondary)]"}>
                    {blocks.length === 0
                      ? "Fechado"
                      : blocks
                          .map((b) => `${formatMinutesLabel(b.start)}-${formatMinutesLabel(b.end)}`)
                          .join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-2xs font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)]">Atalhos</h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
            <li>
              <Link href="/agendar" className="underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline">
                Agendar horário
              </Link>
            </li>
            <li>
              <Link href="/planos" className="underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline">
                Planos de assinatura
              </Link>
            </li>
            <li>
              <Link href="/minha-conta" className="underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline">
                Minha conta
              </Link>
            </li>
            <li>
              <Link href="/entrar" className="underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline">
                Área da equipe
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--border-subtle)]">
        {/* Identificacao da empresa: razao social e CNPJ. Nao e enfeite — e o
            que permite a quem contrata uma assinatura mensal saber com quem
            esta contratando. */}
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-[var(--text-muted)] sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <p className="leading-relaxed">
            © {new Date().getFullYear()} {EMPRESA.nomeFantasia}. Todos os direitos reservados.
            <br />
            <span className="text-[var(--text-muted)]">
              {EMPRESA.razaoSocial} · CNPJ {EMPRESA.cnpj}
            </span>
          </p>
          <p className="sm:text-right">Agenda, equipe e assinaturas em um lugar só.</p>
        </div>
      </div>
    </footer>
  );
}
