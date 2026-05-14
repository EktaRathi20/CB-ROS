-- TrainingSnapshot — one row per "retrain" run. Captures the corpus of
-- experiments that should be considered training context plus calibration
-- stats (signed bias) so future discovery calls can adjust predictions.

CREATE TABLE IF NOT EXISTS "TrainingSnapshot" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "triggered_by_id" TEXT,

    "scope" TEXT NOT NULL DEFAULT 'project',

    "experiments_indexed" INTEGER NOT NULL DEFAULT 0,
    "approved_count"      INTEGER NOT NULL DEFAULT 0,
    "rejected_count"      INTEGER NOT NULL DEFAULT 0,
    "changes_requested_count" INTEGER NOT NULL DEFAULT 0,

    "avg_drift_before" DOUBLE PRECISION,
    "avg_drift_after"  DOUBLE PRECISION,
    "bias_correction"  DOUBLE PRECISION NOT NULL DEFAULT 0,

    "metadata" JSONB NOT NULL DEFAULT '{}',

    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TrainingSnapshot_project_id_idx" ON "TrainingSnapshot"("project_id");
CREATE INDEX IF NOT EXISTS "TrainingSnapshot_created_at_idx" ON "TrainingSnapshot"("created_at");
CREATE INDEX IF NOT EXISTS "TrainingSnapshot_triggered_by_id_idx" ON "TrainingSnapshot"("triggered_by_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TrainingSnapshot_project_id_fkey') THEN
    ALTER TABLE "TrainingSnapshot"
      ADD CONSTRAINT "TrainingSnapshot_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "Project"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TrainingSnapshot_triggered_by_id_fkey') THEN
    ALTER TABLE "TrainingSnapshot"
      ADD CONSTRAINT "TrainingSnapshot_triggered_by_id_fkey"
      FOREIGN KEY ("triggered_by_id") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
