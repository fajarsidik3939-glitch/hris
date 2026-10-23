import { employeeScopeWhere } from "@/lib/scope";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { LEAVE_BUCKET, signedUrl } from "@/server/storage";

/** Lampiran cuti: pemohon sendiri atau yang punya izin leave.read sesuai scope → URL sementara 5 menit. */
export async function GET(_req: Request, ctx: RouteContext<"/api/leave/attachment/[leaveId]">) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return new Response("Unauthorized", { status: 401 });
  const scope = user.permissions.get("leave.read");
  if (!scope) return new Response("Forbidden", { status: 403 });

  const { leaveId } = await ctx.params;
  const leave = await db.leaveRequest
    .findFirst({ where: { id: leaveId, employee: employeeScopeWhere(user, scope) }, select: { attachmentPath: true } })
    .catch(() => null);
  if (!leave?.attachmentPath) return new Response("Not found", { status: 404 });
  return new Response(null, { status: 302, headers: { Location: await signedUrl(LEAVE_BUCKET, leave.attachmentPath), "Cache-Control": "private, no-store" } });
}
