-- CreateEnum
CREATE TYPE "LeaveTxKind" AS ENUM ('GRANT', 'USE', 'REVERSAL', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "leave_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deducts_balance" BOOLEAN NOT NULL DEFAULT false,
    "requires_attachment" BOOLEAN NOT NULL DEFAULT false,
    "allow_half_day" BOOLEAN NOT NULL DEFAULT false,
    "max_days_per_request" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "half_day" BOOLEAN NOT NULL DEFAULT false,
    "days" DECIMAL(4,1) NOT NULL,
    "reason" TEXT NOT NULL,
    "attachment_path" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "approval_request_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_transactions" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "period_year" INTEGER NOT NULL,
    "days" DECIMAL(4,1) NOT NULL,
    "kind" "LeaveTxKind" NOT NULL,
    "leave_request_id" UUID,
    "note" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leave_types_code_key" ON "leave_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "leave_requests_approval_request_id_key" ON "leave_requests"("approval_request_id");

-- CreateIndex
CREATE INDEX "leave_requests_employee_id_start_date_idx" ON "leave_requests"("employee_id", "start_date");

-- CreateIndex
CREATE INDEX "leave_transactions_employee_id_leave_type_id_period_year_idx" ON "leave_transactions"("employee_id", "leave_type_id", "period_year");

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approval_request_id_fkey" FOREIGN KEY ("approval_request_id") REFERENCES "approval_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_transactions" ADD CONSTRAINT "leave_transactions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_transactions" ADD CONSTRAINT "leave_transactions_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_transactions" ADD CONSTRAINT "leave_transactions_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===== Tambahan manual (bukan hasil generate) =====

ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_dates_check" CHECK ("end_date" >= "start_date" AND "days" > 0);
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_half_day_check" CHECK (NOT "half_day" OR "start_date" = "end_date");
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_max_days_check" CHECK ("max_days_per_request" IS NULL OR "max_days_per_request" > 0);
ALTER TABLE "leave_transactions" ADD CONSTRAINT "leave_transactions_note_check" CHECK ("kind" <> 'ADJUSTMENT' OR length(coalesce("note", '')) > 0);
-- Satu hak tahunan per karyawan × jenis × periode (proses saldo aman diulang).
CREATE UNIQUE INDEX "leave_transactions_grant_once" ON "leave_transactions"("employee_id", "leave_type_id", "period_year") WHERE "kind" = 'GRANT';

-- Buku besar saldo: tidak boleh diubah/dihapus.
CREATE OR REPLACE FUNCTION leave_transactions_block_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'leave_transactions bersifat append-only: % tidak diizinkan', TG_OP;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER leave_transactions_no_update_delete BEFORE UPDATE OR DELETE ON "leave_transactions"
  FOR EACH ROW EXECUTE FUNCTION leave_transactions_block_change();

ALTER TABLE "leave_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leave_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leave_transactions" ENABLE ROW LEVEL SECURITY;
