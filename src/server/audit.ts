import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

type Tx = Pick<typeof db, "auditLog">;

export async function requestMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown",
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
  };
}

/** Catat audit log. Jangan pernah memasukkan password, hash, atau token ke before/after. */
export async function writeAudit(
  entry: {
    actorUserId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
    reason?: string | null;
  },
  tx: Tx = db,
) {
  const meta = await requestMeta();
  await tx.auditLog.create({ data: { ...entry, ip: meta.ip, userAgent: meta.userAgent } });
}
