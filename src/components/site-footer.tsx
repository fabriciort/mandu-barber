import Link from "next/link";
import { Instagram, MapPin, Phone } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { getShopConfig, formatAddress } from "@/server/services/settings";
import { formatMinutesLabel } from "@/lib/time";
import { formatPhone } from "@/lib/format";
import { WEEKDAY_LABEL } from "@/lib/enums";

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
                {formatAddress(shop)}
              </p>
            ) : null}
            {shop.whatsapp ? (
              <p className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Phone className="size-4 shrink-0 text-[var(--text-muted)]" />
                <a
                  href={`https://wa.me/55${shop.whatsapp}`}
                  className="underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {formatPhone(shop.whatsapp)}
                </a>
              </p>
            ) : null}
            {shop.instagram ? (
              <p className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Instagram className="size-4 shrink-0 text-[var(--text-muted)]" />
                <a
                  href={`https://instagram.com/${shop.instagram}`}
                  className="underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  @{shop.instagram}
                </a>
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <h3 className="text-2xs font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)]">Horários</h3>
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
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {shop.name}. Todos os direitos reservados.
          </p>
          <p>Feito para durar: agenda, equipe e assinaturas em um lugar só.</p>
        </div>
      </div>
    </footer>
  );
}
