-- CreateTable
CREATE TABLE "timetable_slots" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "class_subject_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "room" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timetable_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timetable_slots_school_id_idx" ON "timetable_slots"("school_id");

-- CreateIndex
CREATE INDEX "timetable_slots_class_subject_id_idx" ON "timetable_slots"("class_subject_id");

-- CreateIndex
CREATE INDEX "timetable_slots_school_id_day_of_week_idx" ON "timetable_slots"("school_id", "day_of_week");

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
