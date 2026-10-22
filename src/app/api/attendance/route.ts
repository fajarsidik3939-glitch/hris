import { randomUUID } from "node:crypto";
import * as z from "zod";
import { Prisma } from "@/generated/prisma/client";
import { earlyLeaveMinutes, isJpeg, lateMinutes, locationLabel, minutesBetween, resolveWorkDate, wibDate, addDays } from "@/lib/attendance";
import { db } from "@/server/db";
import { requestMeta, writeAudit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { numberSetting } from "@/server/settings";
import { removePhoto, uploadPhoto } from "@/server/storage";

const MAX_PHOTO_BYTES = 1024 * 1024;
const MIN_SHIFT_MS = 30 * 60 * 1000; // tap kedua < 30 menit setelah clock-in = dobel

const optionalNumber = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), z.coerce.number().min(min).max(max).nullable());

const bodySchema = z.object({
  idempotencyKey: z.uuid(),
  latitude: optionalNumber(-90, 90),
  longitude: optionalNumber(-180, 180),
  accuracy: optionalNumber(0, 1_000_000),
});

const fail = (status: number, message: string) => Response.json({ ok: false, message }, { status });

type Result = { ok: true; type: "IN" | "OUT"; at: string; workDate: string; label: string; distanceM: number | null; locationName: string | null; lateMinutes: number };

function result(e: { type: string; occurredAt: Date; locationLabel: string | null; distanceM: number | null; workLocation: { name: string } | null }, record: { workDate: Date; lateMinutes: number }): Result {
  return {
    ok: true,
    type: e.type as "IN" | "OUT",
    at: e.occurredAt.toISOString(),
    workDate: record.workDate.toISOString().slice(0, 10),
    label: e.locationLabel ?? "",
    distanceM: e.distanceM,
    locationName: e.workLocation?.name ?? null,
    lateMinutes: record.lateMinutes,
  };
}

/** Clock-in / clock-out selfie GPS. Jam resmi = jam server; absensi tidak ditolak karena lokasi (keputusan Q5). */
export async function POST(req: Request) {
  // Route handler tidak punya cek Origin bawaan seperti Server Action → cegah CSRF di sini.
  const origin = req.headers.get("origin");
  if (!origin || new URL(origin).host !== req.headers.get("host")) return fail(403, "Permintaan ditolak.");

  const user = await getCurrentUser();
  if (!user) return fail(401, "Sesi berakhir. Silakan login lagi.");
  if (user.mustChangePassword) return fail(403, "Ganti password sementara dulu.");
  if (!user.permissions.has("attendance.clock")) return fail(403, "Anda tidak punya akses absen.");
  if (!user.employee) return fail(403, "Akun Anda belum terhubung ke data karyawan. Hubungi HR.");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "Data tidak valid.");
  }
  const parsed = bodySchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  const photo = form.get("photo");
  if (!parsed.success || !(photo instanceof File)) return fail(400, "Data absensi tidak lengkap.");
  if (photo.size === 0 || photo.size > MAX_PHOTO_BYTES) return fail(400, "Ukuran foto tidak valid (maks. 1 MB).");
  const bytes = new Uint8Array(await photo.arrayBuffer());
  if (!isJpeg(bytes)) return fail(400, "Foto harus berformat JPEG dari kamera.");
  const { idempotencyKey, latitude, longitude, accuracy } = parsed.data;
  const employeeId = user.employee.id;

  // Kirim ulang (klik dobel / jaringan mengulang) → kembalikan hasil yang sama, tanpa event baru.
  const replay = await db.attendanceEvent.findUnique({ where: { idempotencyKey }, include: { record: true, workLocation: { select: { name: true } } } });
  if (replay) return replay.employeeId === employeeId ? Response.json(result(replay, replay.record)) : fail(409, "Permintaan ganda.");

  const employee = await db.employee.findUniqueOrThrow({
    where: { id: employeeId },
    select: { status: true, workType: true, attendanceMethod: true, branchId: true, workDays: true, defaultShift: true },
  });
  if (employee.status !== "ACTIVE") return fail(403, "Data karyawan Anda nonaktif.");
  if (employee.attendanceMethod === "FINGERPRINT") return fail(403, "Metode absen Anda fingerprint. Silakan absen di mesin.");

  const now = new Date();
  const [threshold, maxShiftHours, locations] = await Promise.all([
    numberSetting("gps.accuracy_threshold_m", 100),
    numberSetting("attendance.max_shift_hours", 20),
    db.workLocation.findMany({ where: { branchId: employee.branchId, isActive: true }, select: { id: true, name: true, latitude: true, longitude: true, radiusM: true } }),
  ]);
  const loc = locationLabel({
    workType: employee.workType,
    latitude,
    longitude,
    accuracyM: accuracy,
    accuracyThresholdM: threshold,
    locations: locations.map((l) => ({ ...l, latitude: Number(l.latitude), longitude: Number(l.longitude) })),
  });

  // Record terbuka/terbaru dalam batas durasi shift → tap ini adalah clock-out.
  const recent = await db.attendanceRecord.findFirst({
    where: { employeeId, clockInAt: { gte: new Date(now.getTime() - maxShiftHours * 3600_000) } },
    orderBy: { clockInAt: "desc" },
    include: { shift: true },
  });
  if (recent?.clockInAt && !recent.clockOutAt && now.getTime() - recent.clockInAt.getTime() < MIN_SHIFT_MS) {
    return fail(409, `Anda sudah clock-in pukul ${recent.clockInAt.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })}. Clock-out bisa dilakukan minimal 30 menit setelahnya.`);
  }
  const type: "IN" | "OUT" = recent ? "OUT" : "IN";

  let resolved: ReturnType<typeof resolveWorkDate> | null = null;
  if (type === "IN") {
    const today = wibDate(now);
    const holidays = await db.holiday.findMany({
      where: { date: { in: [new Date(today), new Date(addDays(today, -1))] }, OR: [{ branchId: null }, { branchId: employee.branchId }] },
      select: { date: true },
    });
    resolved = resolveWorkDate(now, employee.defaultShift, employee.workDays, new Set(holidays.map((h) => h.date.toISOString().slice(0, 10))));
  }

  const photoPath = `${employeeId}/${wibDate(now).slice(0, 7)}/${randomUUID()}.jpg`;
  try {
    await uploadPhoto(photoPath, bytes);
  } catch (e) {
    console.error(JSON.stringify({ msg: "attendance.photo_upload_failed", error: String(e) }));
    return fail(503, "Foto gagal disimpan. Periksa internet lalu coba lagi.");
  }

  const meta = await requestMeta();
  try {
    const saved = await db.$transaction(async (tx) => {
      let record;
      if (type === "OUT") {
        record = await tx.attendanceRecord.update({
          where: { id: recent!.id },
          data: {
            clockOutAt: now,
            clockOutLabel: loc.label,
            workMinutes: minutesBetween(recent!.clockInAt!, now),
            earlyLeaveMinutes: recent!.scheduledEnd ? earlyLeaveMinutes(now, recent!.scheduledEnd) : 0,
          },
        });
      } else {
        const { workDate, schedule } = resolved!;
        const existing = await tx.attendanceRecord.findUnique({ where: { employeeId_workDate: { employeeId, workDate: new Date(workDate) } } });
        if (existing?.clockInAt) throw new DuplicateError(existing.clockInAt);
        const data = {
          shiftId: schedule ? employee.defaultShift!.id : null,
          scheduledStart: schedule?.start ?? null,
          scheduledEnd: schedule?.end ?? null,
          clockInAt: now,
          clockInLabel: loc.label,
          lateMinutes: schedule ? lateMinutes(now, schedule.start, employee.defaultShift!.lateToleranceMin) : 0,
        };
        record = existing
          ? await tx.attendanceRecord.update({ where: { id: existing.id }, data })
          : await tx.attendanceRecord.create({ data: { ...data, employeeId, workDate: new Date(workDate) } });
      }
      const event = await tx.attendanceEvent.create({
        data: {
          attendanceRecordId: record.id,
          employeeId,
          type,
          source: "SELFIE",
          occurredAt: now,
          latitude,
          longitude,
          accuracyM: accuracy,
          distanceM: loc.distanceM,
          workLocationId: loc.locationId,
          locationLabel: loc.label,
          photoPath,
          ip: meta.ip,
          userAgent: meta.userAgent,
          idempotencyKey,
        },
        include: { workLocation: { select: { name: true } } },
      });
      await writeAudit(
        {
          actorUserId: user.id,
          action: type === "IN" ? "attendance.clock_in" : "attendance.clock_out",
          entityType: "attendance_record",
          entityId: record.id,
          after: { label: loc.label, distanceM: loc.distanceM, workDate: record.workDate.toISOString().slice(0, 10) },
        },
        tx,
      );
      return result(event, record);
    });
    return Response.json(saved);
  } catch (e) {
    await removePhoto(photoPath);
    if (e instanceof DuplicateError) return fail(409, `Anda sudah clock-in hari ini pukul ${e.at.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })}.`);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(409, "Absensi ini sudah tercatat.");
    throw e;
  }
}

class DuplicateError extends Error {
  constructor(public at: Date) {
    super("duplicate");
  }
}
