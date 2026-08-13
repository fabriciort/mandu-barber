import { LogOut } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileForm, PasswordForm } from "./profile-forms";
import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { signOutAction } from "@/server/actions/auth";
import { formatDate } from "@/lib/time";

export const metadata = { title: "Perfil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sessionUser = await requireUser("/minha-conta/perfil");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: {
      name: true,
      email: true,
      phone: true,
      birthDate: true,
      createdAt: true,
      role: true,
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Seus dados</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Usamos seu celular apenas para avisar sobre horários.
        </p>
        <ProfileForm
          defaultValues={{
            name: user.name,
            phone: user.phone,
            birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : "",
          }}
          email={user.email}
        />
      </Card>

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Trocar senha</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Ao trocar a senha, as outras sessões são encerradas.
          </p>
          <PasswordForm />
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold">Conta</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--text-muted)]">Cliente desde</dt>
              <dd className="font-medium">{formatDate(user.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--text-muted)]">E-mail</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
          </dl>

          <form action={signOutAction} className="mt-5">
            <Button type="submit" variant="secondary" block>
              <LogOut className="size-4" />
              Sair da conta
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
