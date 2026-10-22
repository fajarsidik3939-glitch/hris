-- CreateEnum
CREATE TYPE "AttendanceEventType" AS ENUM ('IN', 'OUT', 'SCAN');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('SELFIE', 'FINGERPRINT', 'CORRECTION');

-- CreateEnum
CREATE TYPE "LocationLabel" AS ENUM ('IN_RADIUS', 'OUT_OF_RADIUS', 'LOW_ACCURACY', 'FIELD', 'FINGERPRINT');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "default_shift_id" UUID;

-- CreateTable
CREATE TABLE "shifts" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "late_tolerance_min" INTEGER NOT NULL DEFAULT 15,
    "clock_in_window_min" INTEGER NOT NULL DEFAULT 240,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    "shift_id" UUID,
    "scheduled_start" TIMESTAMPTZ,
    "scheduled_end" TIMESTAMPTZ,
    "clock_in_at" TIMESTAMPTZ,
    "clock_out_at" TIMESTAMPTZ,
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_leave_minutes" INTEGER NOT NULL DEFAULT 0,
    "work_minutes" INTEGER NOT NULL DEFAULT 0,
    "clock_in_label" "LocationLabel",
    "clock_out_label" "LocationLabel",
    "has_correction" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_events" (
    "id" UUID NOT NULL,
    "attendance_record_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "type" "AttendanceEventType" NOT NULL,
    "source" "AttendanceSource" NOT NULL,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "accuracy_m" DECIMAL(8,1),
    "distance_m" INTEGER,
    "work_location_id" UUID,
    "location_label" "LocationLabel",
    "photo_path" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shifts_code_key" ON "shifts"("code");

-- CreateIndex
CREATE INDEX "attendance_records_work_date_idx" ON "attendance_records"("work_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_employee_id_work_date_key" ON "attendance_records"("employee_id", "work_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_events_idempotency_key_key" ON "attendance_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "attendance_events_attendance_record_id_idx" ON "attendance_events"("attendance_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_events_employee_id_source_occurred_at_key" ON "attendance_events"("employee_id", "source", "occurred_at");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_default_shift_id_fkey" FOREIGN KEY ("default_shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_work_location_id_fkey" FOREIGN KEY ("work_location_id") REFERENCES "work_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===== Tambahan manual (bukan hasil generate) =====

ALTER TABLE "shifts" ADD CONSTRAINT "shifts_minutes_check" CHECK (
  "start_minute" BETWEEN 0 AND 1439 AND "end_minute" BETWEEN 0 AND 1439 AND "start_minute" <> "end_minute"
  AND "late_tolerance_min" BETWEEN 0 AND 240 AND "clock_in_window_min" BETWEEN 0 AND 720);

ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_minutes_check"
  CHECK ("late_minutes" >= 0 AND "early_leave_minutes" >= 0 AND "work_minutes" >= 0);

-- Event absensi tidak boleh dihapus/diubah; satu-satunya pengecualian: photo_path dikosongkan (retensi foto).
CREATE OR REPLACE FUNCTION attendance_events_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' OR (to_jsonb(NEW) - 'photo_path') IS DISTINCT FROM (to_jsonb(OLD) - 'photo_path')
     OR NEW.photo_path IS NOT NULL AND NEW.photo_path IS DISTINCT FROM OLD.photo_path THEN
    RAISE EXCEPTION 'attendance_events tidak boleh diubah/dihapus (kecuali mengosongkan photo_path)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_events_no_change
  BEFORE UPDATE OR DELETE ON "attendance_events"
  FOR EACH ROW EXECUTE FUNCTION attendance_events_guard();

ALTER TABLE "shifts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_events" ENABLE ROW LEVEL SECURITY;
