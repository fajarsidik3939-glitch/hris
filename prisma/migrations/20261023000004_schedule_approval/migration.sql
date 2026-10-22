-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalKind" AS ENUM ('LEAVE', 'CORRECTION');

-- CreateEnum
CREATE TYPE "ApproverType" AS ENUM ('MANAGER', 'HR');

-- CreateEnum
CREATE TYPE "StepDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED');

-- CreateTable
CREATE TABLE "employee_schedules" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    "shift_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "employee_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL,
    "kind" "ApprovalKind" NOT NULL,
    "requester_employee_id" UUID NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "current_step" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_steps" (
    "id" UUID NOT NULL,
    "approval_request_id" UUID NOT NULL,
    "step_no" INTEGER NOT NULL,
    "approver_type" "ApproverType" NOT NULL,
    "approver_employee_id" UUID,
    "decision" "StepDecision" NOT NULL DEFAULT 'PENDING',
    "decided_by" UUID,
    "comment" TEXT,
    "decided_at" TIMESTAMPTZ,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_corrections" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    "attendance_record_id" UUID,
    "requested_clock_in" TIMESTAMPTZ,
    "requested_clock_out" TIMESTAMPTZ,
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "approval_request_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "read_at" TIMESTAMPTZ,
    "dedupe_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_schedules_work_date_idx" ON "employee_schedules"("work_date");

-- CreateIndex
CREATE UNIQUE INDEX "employee_schedules_employee_id_work_date_key" ON "employee_schedules"("employee_id", "work_date");

-- CreateIndex
CREATE INDEX "approval_requests_status_current_step_idx" ON "approval_requests"("status", "current_step");

-- CreateIndex
CREATE INDEX "approval_steps_approver_employee_id_decision_idx" ON "approval_steps"("approver_employee_id", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "approval_steps_approval_request_id_step_no_key" ON "approval_steps"("approval_request_id", "step_no");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_corrections_approval_request_id_key" ON "attendance_corrections"("approval_request_id");

-- CreateIndex
CREATE INDEX "attendance_corrections_employee_id_work_date_idx" ON "attendance_corrections"("employee_id", "work_date");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- AddForeignKey
ALTER TABLE "employee_schedules" ADD CONSTRAINT "employee_schedules_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_schedules" ADD CONSTRAINT "employee_schedules_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requester_employee_id_fkey" FOREIGN KEY ("requester_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_approval_request_id_fkey" FOREIGN KEY ("approval_request_id") REFERENCES "approval_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_approver_employee_id_fkey" FOREIGN KEY ("approver_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_approval_request_id_fkey" FOREIGN KEY ("approval_request_id") REFERENCES "approval_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== Tambahan manual (bukan hasil generate) =====

ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_time_check"
  CHECK ("requested_clock_in" IS NOT NULL OR "requested_clock_out" IS NOT NULL);
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_reason_check" CHECK (length("reason") >= 10);
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_reject_comment_check"
  CHECK ("decision" <> 'REJECTED' OR length(coalesce("comment", '')) > 0);

ALTER TABLE "employee_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approval_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approval_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_corrections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
