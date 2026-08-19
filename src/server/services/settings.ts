import "server-only";

import { cache } from "react";

import { prisma } from "@/server/db";
import { DEFAULT_TIMEZONE } from "@/lib/time";
import type { Interval } from "@/lib/intervals";

export type ShopConfig = {
  id: string;
  name: string;
  tagline: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  addressLine: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  instagram: string | null;
  mapsUrl: string | null;
  timezone: string;
  slotStepMinutes: number;
  minLeadMinutes: number;
  maxAdvanceDays: number;
  cancellationWindowHours: number;
  allowOnlineBooking: boolean;
  /** Jornada da loja por dia da semana (indice 0..6). Vazio = fechado. */
  businessHours: Interval[][];
};

const FALLBACK_HOURS: Interval[][] = [
  [], // domingo
  [{ start: 9 * 60, end: 20 * 60 }],
  [{ start: 9 * 60, end: 20 * 60 }],
  [{ start: 9 * 60, end: 20 * 60 }],
  [{ start: 9 * 60, end: 20 * 60 }],
  [{ start: 9 * 60, end: 20 * 60 }],
  [{ start: 8 * 60, end: 18 * 60 }],
];

/**
 * Padrao usado quando ainda nao ha registro no banco (primeiro boot, antes da
 * carga inicial) ou quando o banco esta fora do ar.
 */
const FALLBACK_SHOP: ShopConfig = {
  id: "shop",
  name: "Mandu Barber",
  tagline: "Barbearia de bairro com padrão de alta costura.",
  phone: null,
  whatsapp: null,
  email: null,
  addressLine: null,
  district: null,
  city: null,
  state: null,
  zipCode: null,
  instagram: null,
  mapsUrl: null,
  timezone: DEFAULT_TIMEZONE,
  slotStepMinutes: 15,
  minLeadMinutes: 60,
  maxAdvanceDays: 60,
  cancellationWindowHours: 3,
  allowOnlineBooking: true,
  businessHours: FALLBACK_HOURS,
};

/**
 * Configuracao da loja, memoizada por requisicao.
 *
 * NUNCA lanca. Isto aqui e enfeite de pagina — nome, endereco, horario de
 * funcionamento — e nao dado de negocio: se o banco estiver fora do ar ou a
 * variavel de conexao vier vazia, e melhor a pagina abrir com o padrao do que
 * o site inteiro virar tela de erro. Quem depende de dado real (agenda, preco,
 * credito de plano) faz a propria consulta e falha alto, como deve.
 */
export const getShopConfig = cache(async (): Promise<ShopConfig> => {
  let shop: Awaited<ReturnType<typeof findShop>> = null;

  try {
    shop = await findShop();
  } catch (error) {
    console.error(
      "[settings] banco indisponivel ao ler a configuracao da loja; usando o padrao.",
      error instanceof Error ? error.message : error,
    );
    return FALLBACK_SHOP;
  }

  if (!shop) return FALLBACK_SHOP;

  const businessHours: Interval[][] = Array.from({ length: 7 }, () => [] as Interval[]);
  for (const hour of shop.businessHours) {
    if (hour.closed || hour.closeMinute <= hour.openMinute) continue;
    businessHours[hour.weekday]?.push({ start: hour.openMinute, end: hour.closeMinute });
  }

  return {
    id: shop.id,
    name: shop.name,
    tagline: shop.tagline,
    phone: shop.phone,
    whatsapp: shop.whatsapp,
    email: shop.email,
    addressLine: shop.addressLine,
    district: shop.district,
    city: shop.city,
    state: shop.state,
    zipCode: shop.zipCode,
    instagram: shop.instagram,
    mapsUrl: shop.mapsUrl,
    timezone: shop.timezone || DEFAULT_TIMEZONE,
    slotStepMinutes: shop.slotStepMinutes,
    minLeadMinutes: shop.minLeadMinutes,
    maxAdvanceDays: shop.maxAdvanceDays,
    cancellationWindowHours: shop.cancellationWindowHours,
    allowOnlineBooking: shop.allowOnlineBooking,
    businessHours,
  };
});

function findShop() {
  return prisma.shopSettings.findUnique({
    where: { id: "shop" },
    include: { businessHours: { orderBy: { weekday: "asc" } } },
  });
}

export function formatAddress(shop: ShopConfig): string {
  return [shop.addressLine, shop.district, [shop.city, shop.state].filter(Boolean).join("/")]
    .filter(Boolean)
    .join(" - ");
}
