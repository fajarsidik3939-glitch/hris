"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { requireUser } from "@/server/auth";
import { decideRequest } from "@/server/approval";

export type DecideState = { ok?: boolean; message?: string } | undefined;

const schema = z.object({
  requestId: z.uuid(),
  decision: z.enum(["approve", "reject"]),
  comment: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || null),
});

export async function decide(_: DecideState, formData: FormData): Promise<DecideState> {
  const user = await requireUser();
  if (!user.permissions.has("approval.manager") && !user.permissions.has("approval.hr")) return { message: "Anda tidak punya akses approval." };
  const parsed = schema.safeParse({ requestId: formData.get("requestId"), decision: formData.get("decision"), comment: formData.get("comment") ?? "" });
  if (!parsed.success) return { message: "Data tidak valid." };
  const { requestId, decision, comment } = parsed.data;
  const error = await decideRequest(user, requestId, decision === "approve", comment);
  if (error) return { message: error };
  revalidatePath("/approval");
  return { ok: true, message: decision === "approve" ? "Disetujui." : "Ditolak." };
}
