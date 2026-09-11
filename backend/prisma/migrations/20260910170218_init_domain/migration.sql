-- CreateEnum
CREATE TYPE "student_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "lesson_type" AS ENUM ('REGULAR', 'MAKEUP', 'ONE_OFF');

-- CreateEnum
CREATE TYPE "lesson_status" AS ENUM ('SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "cancellation_reason" AS ENUM ('HOLIDAY', 'VACATION', 'TEACHER_CANCELLED', 'STUDENT_CANCELLED', 'OTHER');

-- CreateEnum
CREATE TYPE "monthly_charge_status" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "start_date" DATE NOT NULL,
    "monthly_fee" DECIMAL(12,2) NOT NULL,
    "status" "student_status" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "weekday" "weekday" NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_until" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "schedule_id" UUID,
    "date" DATE NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "type" "lesson_type" NOT NULL,
    "status" "lesson_status" NOT NULL,
    "cancellation_reason" "cancellation_reason",
    "content" TEXT,
    "exercises" TEXT,
    "observations" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_tags" (
    "lesson_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "lesson_tags_pkey" PRIMARY KEY ("lesson_id","tag_id")
);

-- CreateTable
CREATE TABLE "monthly_charges" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "reference_month" CHAR(7) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" DATE,
    "status" "monthly_charge_status" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "monthly_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "students_status_idx" ON "students"("status");

-- CreateIndex
CREATE INDEX "students_name_idx" ON "students"("name");

-- CreateIndex
CREATE INDEX "schedules_student_id_idx" ON "schedules"("student_id");

-- CreateIndex
CREATE INDEX "schedules_student_active_idx" ON "schedules"("student_id", "active");

-- CreateIndex
CREATE INDEX "lessons_student_id_idx" ON "lessons"("student_id");

-- CreateIndex
CREATE INDEX "lessons_schedule_id_idx" ON "lessons"("schedule_id");

-- CreateIndex
CREATE INDEX "lessons_student_date_idx" ON "lessons"("student_id", "date");

-- CreateIndex
CREATE INDEX "lessons_status_idx" ON "lessons"("status");

-- CreateIndex
CREATE INDEX "lessons_type_idx" ON "lessons"("type");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_unique" ON "tags"("name");

-- CreateIndex
CREATE INDEX "lesson_tags_tag_id_idx" ON "lesson_tags"("tag_id");

-- CreateIndex
CREATE INDEX "monthly_charges_student_id_idx" ON "monthly_charges"("student_id");

-- CreateIndex
CREATE INDEX "monthly_charges_status_idx" ON "monthly_charges"("status");

-- CreateIndex
CREATE INDEX "monthly_charges_reference_month_idx" ON "monthly_charges"("reference_month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_charges_student_month_unique" ON "monthly_charges"("student_id", "reference_month");

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_tags" ADD CONSTRAINT "lesson_tags_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_tags" ADD CONSTRAINT "lesson_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_charges" ADD CONSTRAINT "monthly_charges_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraints (from docs/database.md; not expressible in Prisma schema alone)
ALTER TABLE "students" ADD CONSTRAINT "students_monthly_fee_non_negative" CHECK ("monthly_fee" >= 0);

ALTER TABLE "schedules" ADD CONSTRAINT "schedules_duration_positive" CHECK ("duration_minutes" > 0);
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_validity_range" CHECK ("valid_until" IS NULL OR "valid_until" >= "valid_from");

ALTER TABLE "lessons" ADD CONSTRAINT "lessons_duration_positive" CHECK ("duration_minutes" > 0);

ALTER TABLE "monthly_charges" ADD CONSTRAINT "monthly_charges_amount_non_negative" CHECK ("amount" >= 0);
ALTER TABLE "monthly_charges" ADD CONSTRAINT "monthly_charges_reference_month_format" CHECK ("reference_month" ~ '^\d{4}-(0[1-9]|1[0-2])$');
