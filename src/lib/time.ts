import { addDays, addMinutes, differenceInMinutes, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * Regra do projeto: o banco guarda instantes em UTC, a UI fala no fuso da
 * barbearia. Toda conversao passa por estas funcoes — nenhum componente deve
 * chamar `new Date(string)` para interpretar um horario local.
 */

/** "2026-08-13" + 570 minutos (09:30) no fuso da loja -> instante UTC. */
export function zonedDateTime(dateISO: string, minutes: number, timezone = DEFAULT_TIMEZONE): Date {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const stamp = `${dateISO}T${pad(hours)}:${pad(mins)}:00`;
  return fromZonedTime(stamp, timezone);
}

/** Instante UTC -> minutos desde a meia-noite no fuso da loja. */
export function minutesOfDay(date: Date, timezone = DEFAULT_TIMEZONE): number {
  const zoned = toZonedTime(date, timezone);
  return zoned.getHours() * 60 + zoned.getMinutes();
}

/** Instante UTC -> dia da semana (0 = domingo) no fuso da loja. */
export function weekdayOf(date: Date, timezone = DEFAULT_TIMEZONE): number {
  return toZonedTime(date, timezone).getDay();
}

/** Instante UTC -> "yyyy-MM-dd" no fuso da loja. */
export function toDateKey(date: Date, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

/** Limites UTC do dia local informado — usado em toda consulta por data. */
export function dayBoundaries(dateISO: string, timezone = DEFAULT_TIMEZONE) {
  const start = zonedDateTime(dateISO, 0, timezone);
  const end = fromZonedTime(`${addDaysISO(dateISO, 1)}T00:00:00`, timezone);
  return { start, end };
}

/** Limites UTC de um intervalo de dias locais [fromISO, toISO] (inclusivo). */
export function rangeBoundaries(fromISO: string, toISO: string, timezone = DEFAULT_TIMEZONE) {
  return {
    start: dayBoundaries(fromISO, timezone).start,
    end: dayBoundaries(toISO, timezone).end,
  };
}

export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export function diffInDaysISO(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** "Hoje" no fuso da loja, como "yyyy-MM-dd". */
export function todayKey(timezone = DEFAULT_TIMEZONE, now = new Date()): string {
  return toDateKey(now, timezone);
}

/** Data local (meia-noite) usada apenas para calculos de calendario na UI. */
export function parseDateKey(dateISO: string): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseDateKey(value);
  return !Number.isNaN(parsed.getTime()) && toLocalKey(parsed) === value;
}

function toLocalKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ---------------------------------------------------------------------------
// Formatacao (sempre pt-BR, sempre no fuso da loja)
// ---------------------------------------------------------------------------

export function formatTime(date: Date, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(date, timezone, "HH:mm");
}

export function formatDate(date: Date, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(date, timezone, "dd/MM/yyyy");
}

export function formatDateTime(date: Date, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(date, timezone, "dd/MM/yyyy 'às' HH:mm");
}

export function formatLongDate(date: Date, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(date, timezone, "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function formatShortDate(date: Date, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(date, timezone, "d 'de' MMM", { locale: ptBR });
}

export function formatMonth(date: Date, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(date, timezone, "MMMM 'de' yyyy", { locale: ptBR });
}

export function formatMinutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${pad(h)}:${pad(m)}`;
}

/** "1 h 30 min", "45 min" — usado para durar servicos. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** "em 2 dias", "há 3 horas" — texto relativo enxuto para listas. */
export function formatRelative(date: Date, now = new Date()): string {
  const diff = differenceInMinutes(date, now);
  const abs = Math.abs(diff);
  const suffix = (label: string) => (diff >= 0 ? `em ${label}` : `há ${label}`);
  if (abs < 1) return "agora";
  if (abs < 60) return suffix(`${abs} min`);
  if (abs < 60 * 24) return suffix(`${Math.round(abs / 60)} h`);
  const days = Math.round(abs / (60 * 24));
  if (days < 30) return suffix(days === 1 ? "1 dia" : `${days} dias`);
  const months = Math.round(days / 30);
  return suffix(months === 1 ? "1 mês" : `${months} meses`);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export { addDays, addMinutes, startOfDay, differenceInMinutes, toZonedTime, fromZonedTime };
