import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

import { prisma } from "@/server/db";
import type { Role } from "@/lib/enums";

const COOKIE_NAME = "mandu_session";
const SESSION_DAYS = 30;

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error(
      "AUTH_SECRET ausente ou muito curto. Defina um valor de pelo menos 32 caracteres no .env",
    );
  }
  return new TextEncoder().encode(value);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
  barberId: string | null;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Cria a sessao persistida (permite revogar de verdade, coisa que um JWT
 * puramente stateless nao entrega) e devolve o cookie assinado.
 */
export async function createSession(userId: string, meta?: { userAgent?: string; ip?: string }) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
      userAgent: meta?.userAgent?.slice(0, 255),
      ip: meta?.ip?.slice(0, 64),
    },
  });

  const token = await new SignJWT({ sid: session.id })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  store.delete(COOKIE_NAME);
  if (!token) return;

  try {
    const { payload } = await jwtVerify(token, secret());
    const sid = payload.sid as string | undefined;
    if (sid) {
      await prisma.session.updateMany({
        where: { id: sid, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  } catch {
    // Token invalido: o cookie ja foi removido, nao ha sessao a revogar.
  }
}

/** Revoga todas as sessoes do usuario (troca de senha, "sair de todos"). */
export async function revokeAllSessions(userId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Usuario da requisicao atual. Memoizado por requisicao via `cache`, entao
 * chamar em varios componentes da mesma pagina custa uma unica consulta.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let sid: string | undefined;
  let sub: string | undefined;
  try {
    const { payload } = await jwtVerify(token, secret());
    sid = payload.sid as string | undefined;
    sub = payload.sub;
  } catch {
    return null;
  }
  if (!sid || !sub) return null;

  const session = await prisma.session.findUnique({
    where: { id: sid },
    include: { user: { include: { barber: { select: { id: true } } } } },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (session.userId !== sub) return null;
  if (!session.user.active) return null;

  const { user } = session;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role as Role,
    avatarUrl: user.avatarUrl,
    barberId: user.barber?.id ?? null,
  };
});
