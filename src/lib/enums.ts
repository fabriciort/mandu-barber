import { z } from "zod";

/**
 * O provider SQLite nao suporta enums nativos do Prisma, entao os "enums" do
 * dominio vivem aqui: uma unica fonte de verdade para validacao (Zod), tipos
 * (TypeScript) e rotulos em portugues (UI).
 */

function makeEnum<const T extends readonly [string, ...string[]]>(values: T) {
  return { values, schema: z.enum(values) } as const;
}

export const Role = makeEnum(["CLIENT", "BARBER", "OWNER"] as const);
export type Role = z.infer<typeof Role.schema>;

export const AppointmentStatus = makeEnum([
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELED",
  "NO_SHOW",
] as const);
export type AppointmentStatus = z.infer<typeof AppointmentStatus.schema>;

/** Status que ainda ocupam espaco na agenda do profissional. */
export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "SCHEDULED",
  "CONFIRMED",
  "IN_PROGRESS",
];

/** Status finais: o atendimento nao volta atras a partir daqui. */
export const CLOSED_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "COMPLETED",
  "CANCELED",
  "NO_SHOW",
];

export const PaymentStatus = makeEnum(["PENDING", "PAID", "WAIVED", "REFUNDED"] as const);
export type PaymentStatus = z.infer<typeof PaymentStatus.schema>;

export const PaymentMethod = makeEnum(["PIX", "CARD", "CASH", "TRANSFER", "PLAN"] as const);
export type PaymentMethod = z.infer<typeof PaymentMethod.schema>;

export const SubscriptionStatus = makeEnum([
  "ACTIVE",
  "PAST_DUE",
  "PAUSED",
  "CANCELED",
] as const);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus.schema>;

export const InvoiceStatus = makeEnum(["OPEN", "PAID", "OVERDUE", "VOID"] as const);
export type InvoiceStatus = z.infer<typeof InvoiceStatus.schema>;

export const ServiceCategory = makeEnum([
  "CABELO",
  "BARBA",
  "COMBO",
  "ESTETICA",
  "INFANTIL",
] as const);
export type ServiceCategory = z.infer<typeof ServiceCategory.schema>;

export const AppointmentSource = makeEnum(["ONLINE", "PANEL", "WALK_IN"] as const);
export type AppointmentSource = z.infer<typeof AppointmentSource.schema>;

export const TimeOffType = makeEnum(["BLOCK", "VACATION", "HOLIDAY", "TRAINING"] as const);
export type TimeOffType = z.infer<typeof TimeOffType.schema>;

export const NotificationType = makeEnum([
  "APPOINTMENT_CONFIRMED",
  "APPOINTMENT_CANCELED",
  "APPOINTMENT_RESCHEDULED",
  "REMINDER",
  "SUBSCRIPTION",
  "REVIEW_REQUEST",
  "SYSTEM",
] as const);
export type NotificationType = z.infer<typeof NotificationType.schema>;

// ---------------------------------------------------------------------------
// Rotulos de UI
// ---------------------------------------------------------------------------

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

export const APPOINTMENT_STATUS_TONE: Record<AppointmentStatus, string> = {
  SCHEDULED: "info",
  CONFIRMED: "success",
  IN_PROGRESS: "accent",
  COMPLETED: "neutral",
  CANCELED: "danger",
  NO_SHOW: "warning",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  WAIVED: "Cortesia",
  REFUNDED: "Estornado",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CARD: "Cartão",
  CASH: "Dinheiro",
  TRANSFER: "Transferência",
  PLAN: "Assinatura",
};

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  ACTIVE: "Ativa",
  PAST_DUE: "Pagamento atrasado",
  PAUSED: "Pausada",
  CANCELED: "Cancelada",
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  OPEN: "Em aberto",
  PAID: "Paga",
  OVERDUE: "Vencida",
  VOID: "Cancelada",
};

export const SERVICE_CATEGORY_LABEL: Record<ServiceCategory, string> = {
  CABELO: "Cabelo",
  BARBA: "Barba",
  COMBO: "Combo",
  ESTETICA: "Estética",
  INFANTIL: "Infantil",
};

export const SOURCE_LABEL: Record<AppointmentSource, string> = {
  ONLINE: "Online",
  PANEL: "Painel",
  WALK_IN: "Balcão",
};

export const TIME_OFF_TYPE_LABEL: Record<TimeOffType, string> = {
  BLOCK: "Bloqueio",
  VACATION: "Férias",
  HOLIDAY: "Feriado",
  TRAINING: "Treinamento",
};

export const ROLE_LABEL: Record<Role, string> = {
  CLIENT: "Cliente",
  BARBER: "Profissional",
  OWNER: "Gestor",
};

export const WEEKDAY_LABEL = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"] as const;
