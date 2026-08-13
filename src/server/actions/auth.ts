"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { prisma } from "@/server/db";
import {
  createSession,
  destroySession,
  hashPassword,
  revokeAllSessions,
  verifyPassword,
} from "@/server/auth/session";
import { actionUser } from "@/server/auth/guards";
import { onlyDigits } from "@/lib/format";
import { failure, runAction, success, type ActionState } from "./result";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe o e-mail.")
  .email("E-mail inválido.")
  .toLowerCase();

const phoneSchema = z
  .string()
  .trim()
  .transform(onlyDigits)
  .refine((v) => v === "" || v.length === 10 || v.length === 11, "Telefone inválido.");

const signUpSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo.").max(120),
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(200),
});

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const input = signUpSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone") ?? "",
      password: formData.get("password"),
    });

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      return failure("Já existe uma conta com este e-mail.", {
        email: "Este e-mail já esta cadastrado. Tente entrar.",
      });
    }

    if (input.phone) {
      const phoneTaken = await prisma.user.findUnique({ where: { phone: input.phone } });
      if (phoneTaken) {
        return failure("Telefone já cadastrado.", { phone: "Este telefone já esta em uso." });
      }
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        passwordHash: await hashPassword(input.password),
        role: "CLIENT",
      },
    });

    await createSession(user.id, await requestMeta());
    return success("Conta criada.");
  });
}

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha."),
});

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const input = signInSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const user = await prisma.user.findUnique({ where: { email: input.email } });

    // Mensagem unica para e-mail inexistente e senha errada: nao entregamos
    // a quem tentar adivinhar a informacao de quais e-mails existem na base.
    const invalid = failure("E-mail ou senha incorretos.");
    if (!user) return invalid;
    if (!(await verifyPassword(input.password, user.passwordHash))) return invalid;
    if (!user.active) return failure("Esta conta esta desativada. Fale com a barbearia.");

    await createSession(user.id, await requestMeta());
    return success("Bem-vindo de volta.", { role: user.role });
  });
}

export async function signOutAction() {
  await destroySession();
  redirect("/");
}

const profileSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo.").max(120),
  phone: phoneSchema,
  birthDate: z.string().trim().optional(),
});

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await actionUser();
    const input = profileSchema.parse({
      name: formData.get("name"),
      phone: formData.get("phone") ?? "",
      birthDate: formData.get("birthDate") ?? "",
    });

    if (input.phone) {
      const taken = await prisma.user.findFirst({
        where: { phone: input.phone, id: { not: user.id } },
        select: { id: true },
      });
      if (taken) return failure("Telefone já cadastrado.", { phone: "Este telefone já esta em uso." });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: input.name,
        phone: input.phone || null,
        birthDate: input.birthDate ? new Date(`${input.birthDate}T12:00:00Z`) : null,
      },
    });

    revalidatePath("/minha-conta");
    return success("Dados atualizados.");
  });
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Informe a senha atual."),
    next: z.string().min(8, "A nova senha precisa de pelo menos 8 caracteres."),
    confirm: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.next === data.confirm, {
    message: "As senhas não conferem.",
    path: ["confirm"],
  });

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const sessionUser = await actionUser();
    const input = passwordSchema.parse({
      current: formData.get("current"),
      next: formData.get("next"),
      confirm: formData.get("confirm"),
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
    if (!(await verifyPassword(input.current, user.passwordHash))) {
      return failure("Senha atual incorreta.", { current: "Senha atual incorreta." });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.next) },
    });

    // Troca de senha derruba as outras sessoes; a atual segue valida.
    await revokeAllSessions(user.id);
    await createSession(user.id, await requestMeta());

    return success("Senha alterada. As outras sessões foram encerradas.");
  });
}

async function requestMeta() {
  const headerList = await headers();
  return {
    userAgent: headerList.get("user-agent") ?? undefined,
    ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
  };
}
