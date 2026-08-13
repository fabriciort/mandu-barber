import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser, type SessionUser } from "./session";
import type { Role } from "@/lib/enums";

/** Erro de dominio para acoes que exigem autenticacao/permissao. */
export class AuthorizationError extends Error {
  constructor(message = "Voce nao tem permissao para esta acao.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Para Server Components: redireciona para o login preservando o destino. */
export async function requireUser(redirectTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = redirectTo ? `?proximo=${encodeURIComponent(redirectTo)}` : "";
    redirect(`/entrar${target}`);
  }
  return user;
}

export async function requireRole(roles: Role[], redirectTo?: string): Promise<SessionUser> {
  const user = await requireUser(redirectTo);
  if (!roles.includes(user.role)) redirect("/sem-acesso");
  return user;
}

/** Qualquer membro da equipe (profissional ou gestor). */
export async function requireStaff(redirectTo?: string): Promise<SessionUser> {
  return requireRole(["BARBER", "OWNER"], redirectTo);
}

export async function requireOwner(redirectTo?: string): Promise<SessionUser> {
  return requireRole(["OWNER"], redirectTo);
}

/**
 * Para Server Actions: lanca em vez de redirecionar, porque a acao precisa
 * devolver um resultado de erro tratavel pelo formulario.
 */
export async function actionUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("Sua sessao expirou. Entre novamente.");
  return user;
}

export async function actionRole(roles: Role[]): Promise<SessionUser> {
  const user = await actionUser();
  if (!roles.includes(user.role)) throw new AuthorizationError();
  return user;
}

export async function actionStaff(): Promise<SessionUser> {
  return actionRole(["BARBER", "OWNER"]);
}

export async function actionOwner(): Promise<SessionUser> {
  return actionRole(["OWNER"]);
}

/**
 * Um profissional so enxerga a propria agenda; o gestor enxerga todas.
 * Devolve o barberId que a consulta deve usar (null = sem filtro).
 */
export function scopeToBarber(user: SessionUser, requestedBarberId?: string | null): string | null {
  if (user.role === "OWNER") return requestedBarberId ?? null;
  if (!user.barberId) throw new AuthorizationError("Perfil de profissional nao encontrado.");
  return user.barberId;
}

export function canManageAppointment(user: SessionUser, appointment: { clientId: string; barberId: string }) {
  if (user.role === "OWNER") return true;
  if (user.role === "BARBER" && user.barberId === appointment.barberId) return true;
  return user.id === appointment.clientId;
}
