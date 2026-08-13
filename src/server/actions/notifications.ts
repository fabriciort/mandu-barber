"use server";

import { revalidatePath } from "next/cache";

import { actionUser } from "@/server/auth/guards";
import { markNotificationsRead } from "@/server/services/notifications";

export async function markNotificationsReadAction(ids?: string[]) {
  const user = await actionUser();
  await markNotificationsRead(user.id, ids);
  revalidatePath("/painel", "layout");
  revalidatePath("/minha-conta", "layout");
}
