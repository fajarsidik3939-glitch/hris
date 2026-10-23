import { employeeScopeWhere } from "@/lib/scope";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { PHOTO_BUCKET, signedUrl } from "@/server/storage";

/** Foto absensi: cek izin + scope, lalu arahkan ke URL sementara 5 menit (bucket privat). */
export async function GET(_req: Request, ctx: RouteContext<"/api/attendance/photo/[eventId]">) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return new Response("Unauthorized", { status: 401 });
  const scope = user.permissions.get("attendance.photo.read");
  if (!scope) return new Response("Forbidden", { status: 403 });

  const { eventId } = await ctx.params;
  const event = await db.attendanceEvent
    .findFirst({ where: { id: eventId, employee: employeeScopeWhere(user, scope) }, select: { photoPath: true } })
    .catch(() => null);
  if (!event?.photoPath) return new Response("Not found", { status: 404 });

  return new Response(null, {
    status: 302,
    headers: { Location: await signedUrl(PHOTO_BUCKET, event.photoPath), "Cache-Control": "private, no-store" },
  });
}
