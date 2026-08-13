"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Pencil, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckboxField, Field, Input, Textarea } from "@/components/ui/field";
import { PhoneInput } from "@/components/phone-input";
import { useToast } from "@/components/ui/toast";
import { saveBarberAction } from "@/server/actions/management";
import type { ActionState } from "@/server/actions/result";
import { cn } from "@/lib/cn";

const COLORS = ["#c98b3a", "#7fa66a", "#c96f4a", "#5f8a4c", "#8a5227", "#6b6058", "#b45a37"];

type BarberInput = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  headline: string | null;
  bio: string | null;
  specialties: string;
  commissionPercent: number;
  agendaColor: string;
  acceptsNewClients: boolean;
  active: boolean;
};

export function BarberFormDialog({ barber }: { barber?: BarberInput }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [color, setColor] = React.useState(barber?.agendaColor ?? COLORS[0]);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveBarberAction, {
    ok: false,
  });

  React.useEffect(() => {
    if (state.ok) {
      toast.success(barber ? "Profissional atualizado" : "Profissional cadastrado");
      setOpen(false);
      router.refresh();
    } else if (state.message) {
      toast.error("Nao foi possivel salvar", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {barber ? (
          <Button size="sm" variant="secondary">
            <Pencil className="size-4" />
            Editar
          </Button>
        ) : (
          <Button size="sm">
            <UserPlus className="size-4" />
            Novo profissional
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{barber ? "Editar profissional" : "Novo profissional"}</DialogTitle>
          <DialogDescription>
            {barber
              ? "Atualize perfil, comissao e acesso ao painel."
              : "O profissional recebe acesso ao painel com a senha definida aqui."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          {barber ? <input type="hidden" name="id" value={barber.id} /> : null}
          <input type="hidden" name="agendaColor" value={color} />

          <DialogBody className="space-y-4">
            <Field label="Nome" htmlFor="name" required error={state.fieldErrors?.name}>
              <Input id="name" name="name" defaultValue={barber?.name} required maxLength={120} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-mail de acesso" htmlFor="email" required error={state.fieldErrors?.email}>
                <Input id="email" name="email" type="email" defaultValue={barber?.email} required />
              </Field>
              <Field label="Celular" htmlFor="phone">
                <PhoneInput id="phone" name="phone" defaultValue={barber?.phone} />
              </Field>
            </div>

            <Field
              label={barber ? "Nova senha" : "Senha de acesso"}
              htmlFor="password"
              required={!barber}
              error={state.fieldErrors?.password}
              hint={barber ? "Deixe em branco para manter a senha atual." : "Minimo de 8 caracteres."}
            >
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required={!barber}
                autoComplete="new-password"
              />
            </Field>

            <Field label="Chamada curta" htmlFor="headline" hint="Aparece abaixo do nome no site.">
              <Input
                id="headline"
                name="headline"
                defaultValue={barber?.headline ?? ""}
                maxLength={120}
                placeholder="Ex.: Especialista em degrade e navalha"
              />
            </Field>

            <Field label="Bio" htmlFor="bio">
              <Textarea id="bio" name="bio" defaultValue={barber?.bio ?? ""} rows={3} maxLength={600} />
            </Field>

            <Field
              label="Especialidades"
              htmlFor="specialties"
              hint="Separe por virgula. Viram etiquetas no site."
            >
              <Input
                id="specialties"
                name="specialties"
                defaultValue={barber?.specialties ?? ""}
                placeholder="Degrade, Navalha, Barba"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Comissao (%)"
                htmlFor="commissionPercent"
                hint="Usada no relatorio de repasse."
              >
                <Input
                  id="commissionPercent"
                  name="commissionPercent"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={barber?.commissionPercent ?? 50}
                />
              </Field>

              <Field label="Cor na agenda" hint="Identifica a coluna do profissional.">
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {COLORS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColor(option)}
                      className={cn(
                        "size-7 rounded-full border-2 transition-transform",
                        color === option
                          ? "scale-110 border-[var(--text-primary)]"
                          : "border-transparent hover:scale-105",
                      )}
                      style={{ backgroundColor: option }}
                      aria-label={`Cor ${option}`}
                      aria-pressed={color === option}
                    />
                  ))}
                </div>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <CheckboxField
                name="acceptsNewClients"
                label="Aceita novos clientes"
                hint="Desmarcado, some da escolha 'qualquer profissional'."
                defaultChecked={barber?.acceptsNewClients ?? true}
              />
              <CheckboxField
                name="active"
                label="Profissional ativo"
                hint="Inativo perde acesso e sai da agenda."
                defaultChecked={barber?.active ?? true}
              />
            </div>

            {state.message && !state.ok ? (
              <p className="rounded-lg border border-rust-500/30 bg-rust-500/10 px-3 py-2 text-sm text-rust-500">
                {state.message}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              {barber ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
