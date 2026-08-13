"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { replyReviewAction } from "@/server/actions/booking";
import type { ActionState } from "@/server/actions/result";

export function ReplyReviewForm({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(replyReviewAction, {
    ok: false,
  });

  React.useEffect(() => {
    if (state.ok) {
      toast.success("Resposta publicada");
      setOpen(false);
      router.refresh();
    } else if (state.message) {
      toast.error("Não foi possível responder", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!open) {
    return (
      <Button size="sm" variant="ghost" className="mt-3" onClick={() => setOpen(true)}>
        <Send className="size-4" />
        Responder
      </Button>
    );
  }

  return (
    <form action={formAction} className="mt-4 space-y-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <Textarea
        name="reply"
        rows={3}
        required
        maxLength={600}
        autoFocus
        placeholder="Agradeca, explique ou convide para uma nova visita. O cliente vê esta resposta."
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={pending}>
          Publicar resposta
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
