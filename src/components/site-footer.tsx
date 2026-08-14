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
            <BrandMark />
            <span className="font-display text-xl">
              {shop.name}
            </span>
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
                  className="hover:text-[var(--accent)]"
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
                  className="hover:text-[var(--accent)]"
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
          <h3 className="text-sm font-semibold">Horários</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-[var(--text-muted)]">
            {shop.businessHours.map((blocks, weekday) => (
              <li key={weekday} className="flex justify-between gap-4">
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
          <h3 className="text-sm font-semibold">Atalhos</h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
            <li>
              <Link href="/agendar" className="hover:text-[var(--accent)]">
                Agendar horário
              </Link>
            </li>
            <li>
              <Link href="/planos" className="hover:text-[var(--accent)]">
                Planos de assinatura
              </Link>
            </li>
            <li>
              <Link href="/minha-conta" className="hover:text-[var(--accent)]">
                Minha conta
              </Link>
            </li>
            <li>
              <Link href="/entrar" className="hover:text-[var(--accent)]">
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
