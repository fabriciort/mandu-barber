"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/server/db";
import { actionStaff, actionUser, canManageAppointment } from "@/server/auth/guards";
import {
  cancelAppointment,
  createAppointment,
  rescheduleAppointment,
  setAppointmentStatus,
  BookingError,
} from "@/server/services/booking";
import { isValidDateKey } from "@/lib/time";
import { failure, runAction, success, type ActionState } from "./result";

const bookingSchema = z.object({
  serviceIds: z.array(z.string().min(1)).min(1, "Escolha pelo menos um serviço."),
  barberId: z.string().min(1).nullable(),
  date: z.string().refine(isValidDateKey, "Data inválida."),
  minute: z.coerce.number().int().min(0).max(24 * 60),
  notes: z.string().trim().max(500).optional(),
  usePlan: z.boolean().default(true),
});

/** Agendamento feito pelo proprio cliente no site. */
export async function createBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await actionUser();
    const input = bookingSchema.parse({
      serviceIds: formData.getAll("serviceIds").map(String),
      barberId: (formData.get("barberId") as string) || null,
      date: formData.get("date"),
      minute: formData.get("minute"),
      notes: formData.get("notes") ?? undefined,
      usePlan: formData.get("usePlan") !== "false",
    });

    const appointment = await createAppointment({
      clientId: user.id,
      barberId: input.barberId,
      serviceIds: input.serviceIds,
      dateISO: input.date,
      minute: input.minute,
      clientNotes: input.notes,
      usePlan: input.usePlan,
      source: "ONLINE",
      actorId: user.id,
    });

    revalidatePath("/minha-conta");
    revalidatePath("/painel/agenda");
    return success("Agendamento confirmado.", {
      appointmentId: appointment.id,
      code: appointment.code,
    });
  });
}

/** Agendamento lancado pela equipe, inclusive para cliente que chegou no balcao. */
const panelBookingSchema = bookingSchema.extend({
  clientId: z.string().min(1, "Selecione o cliente."),
  source: z.enum(["ONLINE", "PANEL", "WALK_IN"]).default("PANEL"),
  internalNotes: z.string().trim().max(500).optional(),
});

export async function createPanelBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const staff = await actionStaff();
    const input = panelBookingSchema.parse({
      clientId: formData.get("clientId"),
      serviceIds: formData.getAll("serviceIds").map(String),
      barberId: (formData.get("barberId") as string) || null,
      date: formData.get("date"),
      minute: formData.get("minute"),
      notes: formData.get("notes") ?? undefined,
      internalNotes: formData.get("internalNotes") ?? undefined,
      usePlan: formData.get("usePlan") !== "false",
      source: (formData.get("source") as string) || "PANEL",
    });

    // Profissional so lanca na propria agenda.
    const barberId =
      staff.role === "BARBER" ? staff.barberId : input.barberId;
    if (staff.role === "BARBER" && input.barberId && input.barberId !== staff.barberId) {
      return failure("Você só pode agendar na sua própria agenda.");
    }

    const appointment = await createAppointment({
      clientId: input.clientId,
      barberId: barberId ?? null,
      serviceIds: input.serviceIds,
      dateISO: input.date,
      minute: input.minute,
      clientNotes: input.notes,
      internalNotes: input.internalNotes,
      usePlan: input.usePlan,
      source: input.source,
      ignoreLeadTime: true,
      actorId: staff.id,
    });

    revalidatePath("/painel/agenda");
    revalidatePath("/painel/agendamentos");
    return success("Agendamento criado.", { appointmentId: appointment.id });
  });
}

export async function cancelBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await actionUser();
    const appointmentId = String(formData.get("appointmentId") ?? "");
    const reason = String(formData.get("reason") ?? "").trim();

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { clientId: true, barberId: true },
    });
    if (!appointment) throw new BookingError("Agendamento não encontrado.");
    if (!canManageAppointment(user, appointment)) {
      return failure("Você não pode cancelar este agendamento.");
    }

    await cancelAppointment({
      appointmentId,
      actorId: user.id,
      actorIsStaff: user.role !== "CLIENT",
      reason: reason || null,
    });

    revalidatePath("/minha-conta");
    revalidatePath("/painel/agenda");
    revalidatePath("/painel/agendamentos");
    return success("Agendamento cancelado.");
  });
}

const rescheduleSchema = z.object({
  appointmentId: z.string().min(1),
  date: z.string().refine(isValidDateKey, "Data inválida."),
  minute: z.coerce.number().int().min(0).max(24 * 60),
  barberId: z.string().optional().nullable(),
});

export async function rescheduleBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await actionUser();
    const input = rescheduleSchema.parse({
      appointmentId: formData.get("appointmentId"),
      date: formData.get("date"),
      minute: formData.get("minute"),
      barberId: (formData.get("barberId") as string) || null,
    });

    const appointment = await prisma.appointment.findUnique({
      where: { id: input.appointmentId },
      select: { clientId: true, barberId: true },
    });
    if (!appointment) throw new BookingError("Agendamento não encontrado.");
    if (!canManageAppointment(user, appointment)) {
      return failure("Você não pode remarcar este agendamento.");
    }

    await rescheduleAppointment({
      appointmentId: input.appointmentId,
      dateISO: input.date,
      minute: input.minute,
      barberId: user.role === "CLIENT" ? null : input.barberId,
      actorId: user.id,
      actorIsStaff: user.role !== "CLIENT",
    });

    revalidatePath("/minha-conta");
    revalidatePath("/painel/agenda");
    return success("Agendamento remarcado.");
  });
}

const statusSchema = z.object({
  appointmentId: z.string().min(1),
  status: z.enum(["CONFIRMED", "IN_PROGRESS", "COMPLETED", "NO_SHOW"]),
  paymentMethod: z.enum(["PIX", "CARD", "CASH", "TRANSFER", "PLAN"]).nullable().optional(),
  amountCents: z.coerce.number().int().min(0).optional(),
});

export async function setStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const staff = await actionStaff();
    const input = statusSchema.parse({
      appointmentId: formData.get("appointmentId"),
      status: formData.get("status"),
      paymentMethod: (formData.get("paymentMethod") as string) || null,
      amountCents: formData.get("amountCents") ?? undefined,
    });

    const appointment = await prisma.appointment.findUnique({
      where: { id: input.appointmentId },
      select: { barberId: true },
    });
    if (!appointment) throw new BookingError("Agendamento não encontrado.");
    if (staff.role === "BARBER" && staff.barberId !== appointment.barberId) {
      return failure("Este atendimento e de outro profissional.");
    }

    await setAppointmentStatus({
      appointmentId: input.appointmentId,
      status: input.status,
      actorId: staff.id,
      paymentMethod: input.paymentMethod ?? null,
      amountCents: input.amountCents ?? null,
    });

    revalidatePath("/painel/agenda");
    revalidatePath("/painel/agendamentos");
    revalidatePath("/painel");
    return success("Atendimento atualizado.");
  });
}

const reviewSchema = z.object({
  appointmentId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Escolha de 1 a 5 estrelas.").max(5),
  comment: z.string().trim().max(600).optional(),
});

export async function reviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await actionUser();
    const input = reviewSchema.parse({
      appointmentId: formData.get("appointmentId"),
      rating: formData.get("rating"),
      comment: formData.get("comment") ?? undefined,
    });

    const appointment = await prisma.appointment.findUnique({
      where: { id: input.appointmentId },
      include: { review: true },
    });
    if (!appointment) throw new BookingError("Agendamento não encontrado.");
    if (appointment.clientId !== user.id) return failure("Este atendimento não e seu.");
    if (appointment.status !== "COMPLETED") {
      return failure("Só e possível avaliar atendimentos concluídos.");
    }
    if (appointment.review) return failure("Você já avaliou este atendimento.");

    await prisma.review.create({
      data: {
        appointmentId: appointment.id,
        clientId: user.id,
        barberId: appointment.barberId,
        rating: input.rating,
        comment: input.comment?.trim() || null,
      },
    });

    revalidatePath("/minha-conta");
    return success("Obrigado pela avaliação.");
  });
}

/** Resposta publica do gestor a uma avaliacao. */
export async function replyReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const staff = await actionStaff();
    const reviewId = String(formData.get("reviewId") ?? "");
    const reply = String(formData.get("reply") ?? "").trim();
    if (!reply) return failure("Escreva uma resposta.");

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return failure("Avaliação não encontrada.");
    if (staff.role === "BARBER" && review.barberId !== staff.barberId) {
      return failure("Esta avaliação e de outro profissional.");
    }

    await prisma.review.update({
      where: { id: reviewId },
      data: { reply, repliedAt: new Date() },
    });

    revalidatePath("/painel/avaliacoes");
    return success("Resposta publicada.");
  });
}
