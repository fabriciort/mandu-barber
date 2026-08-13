"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/server/db";
import { actionOwner, actionStaff } from "@/server/auth/guards";
import { hashPassword } from "@/server/auth/session";
import { audit } from "@/server/services/audit";
import { onlyDigits, slugify } from "@/lib/format";
import { zonedDateTime } from "@/lib/time";
import { getShopConfig } from "@/server/services/settings";
import { failure, runAction, success, type ActionState } from "./result";

// ---------------------------------------------------------------- servicos

const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Informe o nome do servico.").max(80),
  description: z.string().trim().max(400).optional(),
  category: z.enum(["CABELO", "BARBA", "COMBO", "ESTETICA", "INFANTIL"]),
  durationMinutes: z.coerce.number().int().min(5, "Minimo de 5 minutos.").max(480),
  bufferMinutes: z.coerce.number().int().min(0).max(120),
  priceCents: z.coerce.number().int().min(0, "Preco invalido."),
  active: z.boolean(),
  featured: z.boolean(),
  barberIds: z.array(z.string()),
});

export async function saveServiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const owner = await actionOwner();
    const input = serviceSchema.parse({
      id: (formData.get("id") as string) || undefined,
      name: formData.get("name"),
      description: formData.get("description") ?? undefined,
      category: formData.get("category"),
      durationMinutes: formData.get("durationMinutes"),
      bufferMinutes: formData.get("bufferMinutes") ?? 0,
      priceCents: formData.get("priceCents"),
      active: formData.get("active") === "on" || formData.get("active") === "true",
      featured: formData.get("featured") === "on" || formData.get("featured") === "true",
      barberIds: formData.getAll("barberIds").map(String),
    });

    const data = {
      name: input.name,
      description: input.description || null,
      category: input.category,
      durationMinutes: input.durationMinutes,
      bufferMinutes: input.bufferMinutes,
      priceCents: input.priceCents,
      active: input.active,
      featured: input.featured,
    };

    const service = input.id
      ? await prisma.service.update({ where: { id: input.id }, data })
      : await prisma.service.create({
          data: { ...data, slug: await uniqueSlug(input.name) },
        });

    // Reconcilia os profissionais habilitados sem apagar as sobrescritas
    // de preco/duracao de quem continua no servico.
    const current = await prisma.barberService.findMany({
      where: { serviceId: service.id },
      select: { barberId: true },
    });
    const currentIds = new Set(current.map((c) => c.barberId));
    const nextIds = new Set(input.barberIds);

    const toRemove = [...currentIds].filter((id) => !nextIds.has(id));
    const toAdd = [...nextIds].filter((id) => !currentIds.has(id));

    if (toRemove.length) {
      await prisma.barberService.deleteMany({
        where: { serviceId: service.id, barberId: { in: toRemove } },
      });
    }
    if (toAdd.length) {
      await prisma.barberService.createMany({
        data: toAdd.map((barberId) => ({ serviceId: service.id, barberId })),
      });
    }

    await audit(prisma, {
      actorId: owner.id,
      action: input.id ? "service.update" : "service.create",
      entity: "Service",
      entityId: service.id,
      meta: { name: service.name, priceCents: service.priceCents },
    });

    revalidatePath("/painel/servicos");
    revalidatePath("/agendar");
    return success(input.id ? "Servico atualizado." : "Servico criado.");
  });
}

export async function toggleServiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await actionOwner();
    const id = String(formData.get("id") ?? "");
    const service = await prisma.service.findUnique({ where: { id } });
    if (!service) return failure("Servico nao encontrado.");

    await prisma.service.update({ where: { id }, data: { active: !service.active } });
    revalidatePath("/painel/servicos");
    return success(service.active ? "Servico desativado." : "Servico reativado.");
  });
}

// ----------------------------------------------------------- profissionais

const barberSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3, "Informe o nome.").max(120),
  email: z.string().trim().toLowerCase().email("E-mail invalido."),
  phone: z.string().trim().transform(onlyDigits),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(600).optional(),
  specialties: z.string().trim().max(300).optional(),
  commissionPercent: z.coerce.number().int().min(0).max(100),
  agendaColor: z.string().trim().max(9),
  acceptsNewClients: z.boolean(),
  active: z.boolean(),
  password: z.string().optional(),
});

export async function saveBarberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const owner = await actionOwner();
    const input = barberSchema.parse({
      id: (formData.get("id") as string) || undefined,
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone") ?? "",
      headline: formData.get("headline") ?? undefined,
      bio: formData.get("bio") ?? undefined,
      specialties: formData.get("specialties") ?? undefined,
      commissionPercent: formData.get("commissionPercent") ?? 50,
      agendaColor: formData.get("agendaColor") ?? "#c98b3a",
      acceptsNewClients: formData.get("acceptsNewClients") !== "false",
      active: formData.get("active") !== "false",
      password: (formData.get("password") as string) || undefined,
    });

    const specialties = JSON.stringify(
      (input.specialties ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );

    if (input.id) {
      const profile = await prisma.barberProfile.findUnique({
        where: { id: input.id },
        include: { user: true },
      });
      if (!profile) return failure("Profissional nao encontrado.");

      const emailTaken = await prisma.user.findFirst({
        where: { email: input.email, id: { not: profile.userId } },
        select: { id: true },
      });
      if (emailTaken) return failure("E-mail ja usado por outra conta.", { email: "E-mail em uso." });

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: profile.userId },
          data: {
            name: input.name,
            email: input.email,
            phone: input.phone || null,
            active: input.active,
            ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
          },
        });
        await tx.barberProfile.update({
          where: { id: input.id },
          data: {
            headline: input.headline || null,
            bio: input.bio || null,
            specialties,
            commissionPercent: input.commissionPercent,
            agendaColor: input.agendaColor,
            acceptsNewClients: input.acceptsNewClients,
            active: input.active,
          },
        });
      });

      await audit(prisma, {
        actorId: owner.id,
        action: "barber.update",
        entity: "BarberProfile",
        entityId: input.id,
      });
      revalidatePath("/painel/profissionais");
      return success("Profissional atualizado.");
    }

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      include: { barber: { select: { id: true } } },
    });
    if (existing?.barber) return failure("Este e-mail ja pertence a um profissional.");
    if (!input.password || input.password.length < 8) {
      return failure("Defina uma senha de acesso com pelo menos 8 caracteres.", {
        password: "Minimo de 8 caracteres.",
      });
    }

    const profile = await prisma.$transaction(async (tx) => {
      const user = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { role: "BARBER", name: input.name, passwordHash: await hashPassword(input.password!) },
          })
        : await tx.user.create({
            data: {
              name: input.name,
              email: input.email,
              phone: input.phone || null,
              role: "BARBER",
              passwordHash: await hashPassword(input.password!),
            },
          });

      const count = await tx.barberProfile.count();
      return tx.barberProfile.create({
        data: {
          userId: user.id,
          headline: input.headline || null,
          bio: input.bio || null,
          specialties,
          commissionPercent: input.commissionPercent,
          agendaColor: input.agendaColor,
          acceptsNewClients: input.acceptsNewClients,
          active: input.active,
          displayOrder: count,
        },
      });
    });

    await audit(prisma, {
      actorId: owner.id,
      action: "barber.create",
      entity: "BarberProfile",
      entityId: profile.id,
    });
    revalidatePath("/painel/profissionais");
    return success("Profissional cadastrado.");
  });
}

const workingHoursSchema = z.object({
  barberId: z.string().min(1),
  /** JSON: [{ weekday, blocks: [{ start, end }] }] */
  hours: z.string().min(2),
});

export async function saveWorkingHoursAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const staff = await actionStaff();
    const input = workingHoursSchema.parse({
      barberId: formData.get("barberId"),
      hours: formData.get("hours"),
    });

    if (staff.role === "BARBER" && staff.barberId !== input.barberId) {
      return failure("Voce so pode editar a propria jornada.");
    }

    const parsed = z
      .array(
        z.object({
          weekday: z.number().int().min(0).max(6),
          blocks: z.array(z.object({ start: z.number().int(), end: z.number().int() })),
        }),
      )
      .parse(JSON.parse(input.hours));

    for (const day of parsed) {
      for (const block of day.blocks) {
        if (block.end <= block.start) {
          return failure("Ha um intervalo com fim antes do inicio.");
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.workingHour.deleteMany({ where: { barberId: input.barberId } });
      const rows = parsed.flatMap((day) =>
        day.blocks.map((block) => ({
          barberId: input.barberId,
          weekday: day.weekday,
          startMinute: block.start,
          endMinute: block.end,
        })),
      );
      if (rows.length) await tx.workingHour.createMany({ data: rows });
    });

    await audit(prisma, {
      actorId: staff.id,
      action: "barber.hours",
      entity: "BarberProfile",
      entityId: input.barberId,
    });
    revalidatePath("/painel/profissionais");
    revalidatePath("/agendar");
    return success("Jornada atualizada.");
  });
}

const timeOffSchema = z.object({
  barberId: z.string().optional().nullable(),
  title: z.string().trim().min(2, "Descreva o bloqueio.").max(120),
  type: z.enum(["BLOCK", "VACATION", "HOLIDAY", "TRAINING"]),
  startDate: z.string().min(1, "Informe a data inicial."),
  startMinute: z.coerce.number().int().min(0).max(1440),
  endDate: z.string().min(1, "Informe a data final."),
  endMinute: z.coerce.number().int().min(0).max(1440),
});

export async function saveTimeOffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const staff = await actionStaff();
    const shop = await getShopConfig();
    const input = timeOffSchema.parse({
      barberId: (formData.get("barberId") as string) || null,
      title: formData.get("title"),
      type: formData.get("type") ?? "BLOCK",
      startDate: formData.get("startDate"),
      startMinute: formData.get("startMinute") ?? 0,
      endDate: formData.get("endDate"),
      endMinute: formData.get("endMinute") ?? 1440,
    });

    // Profissional bloqueia apenas a propria agenda; bloqueio da loja e do gestor.
    const barberId = staff.role === "BARBER" ? staff.barberId : input.barberId || null;
    if (staff.role === "BARBER" && input.barberId && input.barberId !== staff.barberId) {
      return failure("Voce so pode bloquear a propria agenda.");
    }

    const startsAt = zonedDateTime(input.startDate, input.startMinute, shop.timezone);
    const endsAt = zonedDateTime(input.endDate, input.endMinute, shop.timezone);
    if (endsAt <= startsAt) return failure("O fim do bloqueio precisa ser depois do inicio.");

    const conflicts = await prisma.appointment.count({
      where: {
        ...(barberId ? { barberId } : {}),
        status: { in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (conflicts > 0) {
      return failure(
        `Existem ${conflicts} agendamento(s) neste periodo. Remarque ou cancele antes de bloquear.`,
      );
    }

    const created = await prisma.timeOff.create({
      data: { barberId, title: input.title, type: input.type, startsAt, endsAt },
    });

    await audit(prisma, {
      actorId: staff.id,
      action: "timeoff.create",
      entity: "TimeOff",
      entityId: created.id,
    });
    revalidatePath("/painel/agenda");
    return success("Bloqueio criado.");
  });
}

export async function deleteTimeOffAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const staff = await actionStaff();
    const id = String(formData.get("id") ?? "");
    const timeOff = await prisma.timeOff.findUnique({ where: { id } });
    if (!timeOff) return failure("Bloqueio nao encontrado.");
    if (staff.role === "BARBER" && timeOff.barberId !== staff.barberId) {
      return failure("Este bloqueio nao e seu.");
    }

    await prisma.timeOff.delete({ where: { id } });
    revalidatePath("/painel/agenda");
    return success("Bloqueio removido.");
  });
}

// -------------------------------------------------------------------- planos

const planSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Informe o nome do plano.").max(80),
  tagline: z.string().trim().max(120).optional(),
  description: z.string().trim().max(400).optional(),
  priceCents: z.coerce.number().int().min(0),
  intervalMonths: z.coerce.number().int().min(1).max(12),
  extraDiscountPercent: z.coerce.number().int().min(0).max(100),
  priorityBooking: z.boolean(),
  allowRollover: z.boolean(),
  maxRolloverCredits: z.coerce.number().int().min(0).max(20),
  perks: z.string().trim().optional(),
  accentColor: z.string().trim().max(9),
  highlight: z.boolean(),
  active: z.boolean(),
  /** JSON: [{ serviceId, quantityPerCycle }] */
  benefits: z.string().default("[]"),
});

export async function savePlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const owner = await actionOwner();
    const input = planSchema.parse({
      id: (formData.get("id") as string) || undefined,
      name: formData.get("name"),
      tagline: formData.get("tagline") ?? undefined,
      description: formData.get("description") ?? undefined,
      priceCents: formData.get("priceCents"),
      intervalMonths: formData.get("intervalMonths") ?? 1,
      extraDiscountPercent: formData.get("extraDiscountPercent") ?? 0,
      priorityBooking: formData.get("priorityBooking") === "true",
      allowRollover: formData.get("allowRollover") === "true",
      maxRolloverCredits: formData.get("maxRolloverCredits") ?? 0,
      perks: formData.get("perks") ?? "",
      accentColor: formData.get("accentColor") ?? "#c98b3a",
      highlight: formData.get("highlight") === "true",
      active: formData.get("active") !== "false",
      benefits: formData.get("benefits") ?? "[]",
    });

    const benefits = z
      .array(z.object({ serviceId: z.string().min(1), quantityPerCycle: z.number().int().min(-1) }))
      .parse(JSON.parse(input.benefits))
      .filter((b) => b.quantityPerCycle !== 0);

    const perks = JSON.stringify(
      (input.perks ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    );

    const data = {
      name: input.name,
      tagline: input.tagline || null,
      description: input.description || null,
      priceCents: input.priceCents,
      intervalMonths: input.intervalMonths,
      extraDiscountPercent: input.extraDiscountPercent,
      priorityBooking: input.priorityBooking,
      allowRollover: input.allowRollover,
      maxRolloverCredits: input.maxRolloverCredits,
      perks,
      accentColor: input.accentColor,
      highlight: input.highlight,
      active: input.active,
    };

    const plan = await prisma.$transaction(async (tx) => {
      const saved = input.id
        ? await tx.plan.update({ where: { id: input.id }, data })
        : await tx.plan.create({ data: { ...data, slug: await uniqueSlug(input.name, "plan") } });

      await tx.planBenefit.deleteMany({ where: { planId: saved.id } });
      if (benefits.length) {
        await tx.planBenefit.createMany({
          data: benefits.map((b) => ({ ...b, planId: saved.id })),
        });
      }
      return saved;
    });

    await audit(prisma, {
      actorId: owner.id,
      action: input.id ? "plan.update" : "plan.create",
      entity: "Plan",
      entityId: plan.id,
    });

    revalidatePath("/painel/planos");
    revalidatePath("/planos");
    return success(input.id ? "Plano atualizado." : "Plano criado.");
  });
}

// ------------------------------------------------------------------ clientes

const clientSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3, "Informe o nome.").max(120),
  email: z.string().trim().toLowerCase().email("E-mail invalido."),
  phone: z.string().trim().transform(onlyDigits),
  notes: z.string().trim().max(600).optional(),
  active: z.boolean().default(true),
});

export async function saveClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const staff = await actionStaff();
    const input = clientSchema.parse({
      id: (formData.get("id") as string) || undefined,
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone") ?? "",
      notes: formData.get("notes") ?? undefined,
      active: formData.get("active") !== "false",
    });

    const conflict = await prisma.user.findFirst({
      where: { email: input.email, ...(input.id ? { id: { not: input.id } } : {}) },
      select: { id: true },
    });
    if (conflict) return failure("E-mail ja cadastrado.", { email: "E-mail ja cadastrado." });

    if (input.id) {
      await prisma.user.update({
        where: { id: input.id },
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone || null,
          notes: input.notes || null,
          active: input.active,
        },
      });
      revalidatePath(`/painel/clientes/${input.id}`);
      revalidatePath("/painel/clientes");
      return success("Cliente atualizado.");
    }

    // Cadastro de balcao: senha provisoria e o telefone, trocada no primeiro acesso.
    const provisional = input.phone || "mandu" + Math.random().toString(36).slice(2, 8);
    const created = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        notes: input.notes || null,
        role: "CLIENT",
        passwordHash: await hashPassword(provisional),
      },
    });

    await audit(prisma, {
      actorId: staff.id,
      action: "client.create",
      entity: "User",
      entityId: created.id,
    });
    revalidatePath("/painel/clientes");
    return success("Cliente cadastrado.", { clientId: created.id, provisionalPassword: provisional });
  });
}

// ------------------------------------------------------------- configuracoes

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(160),
  phone: z.string().trim().transform(onlyDigits),
  whatsapp: z.string().trim().transform(onlyDigits),
  email: z.string().trim().toLowerCase().email("E-mail invalido.").or(z.literal("")),
  addressLine: z.string().trim().max(160),
  district: z.string().trim().max(80),
  city: z.string().trim().max(80),
  state: z.string().trim().max(2),
  zipCode: z.string().trim().max(12),
  instagram: z.string().trim().max(60),
  mapsUrl: z.string().trim().max(400),
  slotStepMinutes: z.coerce.number().int().min(5).max(60),
  minLeadMinutes: z.coerce.number().int().min(0).max(1440),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  cancellationWindowHours: z.coerce.number().int().min(0).max(72),
  allowOnlineBooking: z.boolean(),
  /** JSON: [{ weekday, openMinute, closeMinute, closed }] */
  businessHours: z.string().default("[]"),
});

export async function saveSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const owner = await actionOwner();
    const input = settingsSchema.parse({
      name: formData.get("name"),
      tagline: formData.get("tagline") ?? "",
      phone: formData.get("phone") ?? "",
      whatsapp: formData.get("whatsapp") ?? "",
      email: formData.get("email") ?? "",
      addressLine: formData.get("addressLine") ?? "",
      district: formData.get("district") ?? "",
      city: formData.get("city") ?? "",
      state: formData.get("state") ?? "",
      zipCode: formData.get("zipCode") ?? "",
      instagram: formData.get("instagram") ?? "",
      mapsUrl: formData.get("mapsUrl") ?? "",
      slotStepMinutes: formData.get("slotStepMinutes") ?? 15,
      minLeadMinutes: formData.get("minLeadMinutes") ?? 60,
      maxAdvanceDays: formData.get("maxAdvanceDays") ?? 60,
      cancellationWindowHours: formData.get("cancellationWindowHours") ?? 3,
      allowOnlineBooking: formData.get("allowOnlineBooking") !== "false",
      businessHours: formData.get("businessHours") ?? "[]",
    });

    const hours = z
      .array(
        z.object({
          weekday: z.number().int().min(0).max(6),
          openMinute: z.number().int().min(0).max(1440),
          closeMinute: z.number().int().min(0).max(1440),
          closed: z.boolean(),
        }),
      )
      .parse(JSON.parse(input.businessHours));

    for (const day of hours) {
      if (!day.closed && day.closeMinute <= day.openMinute) {
        return failure("Ha um dia com fechamento antes da abertura.");
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.shopSettings.upsert({
        where: { id: "shop" },
        create: {
          id: "shop",
          name: input.name,
          tagline: input.tagline,
          phone: input.phone || null,
          whatsapp: input.whatsapp || null,
          email: input.email || null,
          addressLine: input.addressLine || null,
          district: input.district || null,
          city: input.city || null,
          state: input.state || null,
          zipCode: input.zipCode || null,
          instagram: input.instagram || null,
          mapsUrl: input.mapsUrl || null,
          slotStepMinutes: input.slotStepMinutes,
          minLeadMinutes: input.minLeadMinutes,
          maxAdvanceDays: input.maxAdvanceDays,
          cancellationWindowHours: input.cancellationWindowHours,
          allowOnlineBooking: input.allowOnlineBooking,
        },
        update: {
          name: input.name,
          tagline: input.tagline,
          phone: input.phone || null,
          whatsapp: input.whatsapp || null,
          email: input.email || null,
          addressLine: input.addressLine || null,
          district: input.district || null,
          city: input.city || null,
          state: input.state || null,
          zipCode: input.zipCode || null,
          instagram: input.instagram || null,
          mapsUrl: input.mapsUrl || null,
          slotStepMinutes: input.slotStepMinutes,
          minLeadMinutes: input.minLeadMinutes,
          maxAdvanceDays: input.maxAdvanceDays,
          cancellationWindowHours: input.cancellationWindowHours,
          allowOnlineBooking: input.allowOnlineBooking,
        },
      });

      for (const day of hours) {
        await tx.businessHour.upsert({
          where: { shopId_weekday: { shopId: "shop", weekday: day.weekday } },
          create: { shopId: "shop", ...day },
          update: { openMinute: day.openMinute, closeMinute: day.closeMinute, closed: day.closed },
        });
      }
    });

    await audit(prisma, { actorId: owner.id, action: "settings.update", entity: "ShopSettings" });

    revalidatePath("/", "layout");
    return success("Configuracoes salvas.");
  });
}

// ------------------------------------------------------------------ auxiliar

async function uniqueSlug(name: string, kind: "service" | "plan" = "service"): Promise<string> {
  const base = slugify(name) || "item";
  let candidate = base;
  let counter = 2;

  for (;;) {
    const taken =
      kind === "service"
        ? await prisma.service.findUnique({ where: { slug: candidate }, select: { id: true } })
        : await prisma.plan.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
    candidate = `${base}-${counter++}`;
  }
}
