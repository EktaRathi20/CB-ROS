-- Idempotent migration: safe to run on a fresh DB, on a DB created via
-- prisma db push, or on a DB that already has the original `_dummy` schema.

-- Ensure the pgvector extension exists (no-op if already present)
CREATE EXTENSION IF NOT EXISTS "vector";

-- ---------- User ----------
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'scientist',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- ---------- Project ----------
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "reactants" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "products" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "temp" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "pressure" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "catalysis_type" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "creator" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "sustainability_tag" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'Active';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "iterations_used" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "max_iterations" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Project" ALTER COLUMN "conditions" DROP NOT NULL;

-- ---------- Candidate ----------
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "iteration_number" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "stability" DOUBLE PRECISION;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "activity_score" DOUBLE PRECISION;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "activation_energy" DOUBLE PRECISION;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "operating_temp" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "operating_pressure" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "source" TEXT;

-- Switch embedding dimension to match Gemini (768). Drop is safe because
-- we only ever wrote placeholder embeddings, and they're regenerated on
-- next discovery run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Candidate' AND column_name = 'embedding'
  ) THEN
    EXECUTE 'ALTER TABLE "Candidate" DROP COLUMN "embedding"';
  END IF;
END $$;
ALTER TABLE "Candidate" ADD COLUMN "embedding" vector(768);

CREATE INDEX IF NOT EXISTS "Candidate_project_id_iteration_number_idx"
    ON "Candidate"("project_id", "iteration_number");

-- ---------- ExperimentSubmission ----------
ALTER TABLE "ExperimentSubmission" ADD COLUMN IF NOT EXISTS "submitted_by_id" TEXT;
ALTER TABLE "ExperimentSubmission" ADD COLUMN IF NOT EXISTS "outcome" TEXT;
ALTER TABLE "ExperimentSubmission" ADD COLUMN IF NOT EXISTS "observations" TEXT;

CREATE INDEX IF NOT EXISTS "ExperimentSubmission_submitted_by_id_idx"
    ON "ExperimentSubmission"("submitted_by_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ExperimentSubmission_submitted_by_id_fkey'
  ) THEN
    ALTER TABLE "ExperimentSubmission"
      ADD CONSTRAINT "ExperimentSubmission_submitted_by_id_fkey"
      FOREIGN KEY ("submitted_by_id") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------- ExperimentReview ----------
CREATE TABLE IF NOT EXISTS "ExperimentReview" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExperimentReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExperimentReview_submission_id_reviewer_id_key"
    ON "ExperimentReview"("submission_id", "reviewer_id");
CREATE INDEX IF NOT EXISTS "ExperimentReview_submission_id_idx"
    ON "ExperimentReview"("submission_id");
CREATE INDEX IF NOT EXISTS "ExperimentReview_reviewer_id_idx"
    ON "ExperimentReview"("reviewer_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ExperimentReview_submission_id_fkey'
  ) THEN
    ALTER TABLE "ExperimentReview"
      ADD CONSTRAINT "ExperimentReview_submission_id_fkey"
      FOREIGN KEY ("submission_id") REFERENCES "ExperimentSubmission"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ExperimentReview_reviewer_id_fkey'
  ) THEN
    ALTER TABLE "ExperimentReview"
      ADD CONSTRAINT "ExperimentReview_reviewer_id_fkey"
      FOREIGN KEY ("reviewer_id") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------- Mock users ----------
INSERT INTO "User" ("id", "name", "email", "role") VALUES
    ('11111111-1111-1111-1111-111111111111', 'Dr. R. Iyer',  'r.iyer@example.com',  'scientist'),
    ('22222222-2222-2222-2222-222222222222', 'Dr. A. Smith', 'a.smith@example.com', 'scientist'),
    ('33333333-3333-3333-3333-333333333333', 'Dr. B. Jones', 'b.jones@example.com', 'reviewer'),
    ('44444444-4444-4444-4444-444444444444', 'Dr. M. Chen',  'm.chen@example.com',  'reviewer')
ON CONFLICT (email) DO NOTHING;
