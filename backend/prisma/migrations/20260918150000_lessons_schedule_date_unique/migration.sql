-- Unique (schedule_id, date) prevents duplicate REGULAR occurrences from generation.
-- PostgreSQL treats NULLs as distinct, so ONE_OFF/MAKEUP with schedule_id NULL remain allowed
-- even on the same date.
CREATE UNIQUE INDEX "lessons_schedule_id_date_unique" ON "lessons"("schedule_id", "date");
