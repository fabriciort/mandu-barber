/** Formatacao de valores monetarios, telefone e nomes. */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const BRL_COMPACT = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Centavos -> "R$ 45,00". Toda exibicao de dinheiro passa por aqui. */
export function formatMoney(cents: number): string {
  return BRL.format(cents / 100);
}

/** Centavos -> "R$ 12,4 mil" (KPIs e graficos). */
export function formatMoneyCompact(cents: number): string {
  if (Math.abs(cents) < 100_000) return BRL.format(cents / 100);
  return BRL_COMPACT.format(cents / 100);
}

/** "45,00" ou "45.00" -> 4500 centavos. Tolerante ao que o gestor digita. */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input
    .replace(/[R$\s]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  if (cleaned === "" || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits).replace(".", ",")}%`;
}

/** Aplica a mascara (11) 91234-5678 sobre digitos. */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Marcas de acentuacao combinantes (U+0300..U+036F), removidas apos NFD. */
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural}`;
}

/** Lista legivel: "corte, barba e sobrancelha". */
export function listToText(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}
