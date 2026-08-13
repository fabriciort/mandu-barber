"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/server/db";
import { actionOwner, actionUser } from "@/server/auth/guards";
import {
  cancelSubscription,
  createSubscription,
  resumeSubscription,
} from "@/server/services/subscriptions";
import { notify } from "@/server/services/notifications";
import { audit } from "@/server/services/audit";
import { failure, runAction, success, type ActionState } from "./result";

const subscribeSchema = z.object({
  planId: z.string().min(1, "Escolha um plano."),
  paymentMethod: z.enum(["PIX", "CARD", "CASH", "TRANSFER"]).default("PIX"),
});

/** Contratacao feita pelo proprio cliente. */
export async function subscribeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await actionUser();
    const input = subscribeSchema.parse({
      planId: formData.get("planId"),
      paymentMethod: (formData.get("paymentMethod") as string) || "PIX",
    });

    const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
    if (!plan?.active) return failure("Este plano nao esta mais disponivel.");

    const subscription = await createSubscription({
      clientId: user.id,
      planId: input.planId,
      paymentMethod: input.paymentMethod,
    });

    await notify(prisma, {
      userId: user.id,
      type: "SUBSCRIPTION",
      title: `Plano ${plan.name} ativado`,
      body: "Seus creditos ja estao disponiveis. A primeira fatura ficou em aberto no seu painel.",
      link: "/minha-conta/plano",
    });
    await audit(prisma, {
      actorId: user.id,
      action: "subscription.create",
      entity: "Subscription",
      entityId: subscription.id,
      meta: { planId: plan.id },
    });

    revalidatePath("/minha-conta");
    revalidatePath("/planos");
    return success(`Plano ${plan.name} ativado.`);
  });
}

export async function cancelSubscriptionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await actionUser();
    const subscriptionId = String(formData.get("subscriptionId") ?? "");

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: { select: { name: true } } },
    });
    if (!subscription) return failure("Assinatura nao encontrada.");

    const isOwner = user.role === "OWNER";
    if (subscription.clientId !== user.id && !isOwner) {
      return failure("Voce nao pode alterar esta assinatura.");
    }

    // Cliente encerra no fim do ciclo (ja pagou o mes); gestor pode cortar na hora.
    const immediate = isOwner && formData.get("immediate") === "true";
    await cancelSubscription(subscriptionId, immediate);
    await audit(prisma, {
      actorId: user.id,
      action: immediate ? "subscription.cancel_now" : "subscription.cancel_at_period_end",
      entity: "Subscription",
      entityId: subscriptionId,
    });

    revalidatePath("/minha-conta/plano");
    revalidatePath("/painel/assinaturas");
    return success(
      immediate
        ? "Assinatura encerrada."
        : "Assinatura sera encerrada no fim do ciclo. Ate la, seus creditos continuam valendo.",
    );
  });
}

export async function resumeSubscriptionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await actionUser();
    const subscriptionId = String(formData.get("subscriptionId") ?? "");

    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!subscription) return failure("Assinatura nao encontrada.");
    if (subscription.clientId !== user.id && user.role !== "OWNER") {
      return failure("Voce nao pode alterar esta assinatura.");
    }

    await resumeSubscription(subscriptionId);
    revalidatePath("/minha-conta/plano");
    revalidatePath("/painel/assinaturas");
    return success("Assinatura reativada.");
  });
}

/** Gestor contrata um plano em nome do cliente (venda no balcao). */
export async function assignSubscriptionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const owner = await actionOwner();
    const clientId = String(formData.get("clientId") ?? "");
    const planId = String(formData.get("planId") ?? "");
    const paymentMethod = (formData.get("paymentMethod") as string) || "PIX";

    if (!clientId || !planId) return failure("Selecione o cliente e o plano.");

    const subscription = await createSubscription({ clientId, planId, paymentMethod });
    const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { name: true } });

    await notify(prisma, {
      userId: clientId,
      type: "SUBSCRIPTION",
      title: `Plano ${plan?.name ?? ""} ativado`,
      body: "A barbearia ativou seu plano. Seus creditos ja estao disponiveis.",
      link: "/minha-conta/plano",
    });
    await audit(prisma, {
      actorId: owner.id,
      action: "subscription.assign",
      entity: "Subscription",
      entityId: subscription.id,
      meta: { clientId, planId },
    });

    revalidatePath("/painel/assinaturas");
    return success("Assinatura criada.");
  });
}

/** Baixa manual de fatura — o caixa da barbearia recebe por Pix ou dinheiro. */
export async function payInvoiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const owner = await actionOwner();
    const invoiceId = String(formData.get("invoiceId") ?? "");
    const method = (formData.get("method") as string) || "PIX";

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return failure("Fatura nao encontrada.");
    if (invoice.status === "PAID") return failure("Esta fatura ja esta paga.");

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: "PAID", paidAt: new Date() },
      });
      await tx.payment.create({
        data: {
          invoiceId,
          amountCents: invoice.amountCents,
          method,
          receivedById: owner.id,
        },
      });
      if (invoice.subscriptionId) {
        await tx.subscription.updateMany({
          where: { id: invoice.subscriptionId, status: "PAST_DUE" },
          data: { status: "ACTIVE" },
        });
      }
      await audit(tx, {
        actorId: owner.id,
        action: "invoice.pay",
        entity: "Invoice",
        entityId: invoiceId,
        meta: { method, amountCents: invoice.amountCents },
      });
    });

    revalidatePath("/painel/assinaturas");
    revalidatePath("/painel/financeiro");
    return success("Fatura baixada.");
  });
}
