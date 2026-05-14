-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable: Company
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateTable: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_company_id_idx" ON "User"("company_id");

-- CreateTable: Project
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reaction_input" TEXT NOT NULL,
    "reactants" TEXT,
    "products" TEXT,
    "temp" TEXT,
    "pressure" TEXT,
    "catalysis_type" TEXT,
    "creator_id" TEXT,
    "sustainability_tag" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "notes" TEXT,
    "conditions" JSONB,
    "iterations_used" INTEGER NOT NULL DEFAULT 0,
    "max_iterations" INTEGER NOT NULL DEFAULT 3,
    "version_major" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Candidate
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "iteration_number" INTEGER NOT NULL DEFAULT 1,
    "formula" TEXT NOT NULL,
    "predicted_score" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "stability" DOUBLE PRECISION,
    "activity_score" DOUBLE PRECISION,
    "activation_energy" DOUBLE PRECISION,
    "operating_temp" TEXT,
    "operating_pressure" TEXT,
    "source" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "embedding" vector(768),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Candidate_project_id_idx" ON "Candidate"("project_id");
CREATE INDEX "Candidate_project_id_iteration_number_idx" ON "Candidate"("project_id", "iteration_number");
CREATE INDEX "Candidate_created_at_idx" ON "Candidate"("created_at");

-- CreateTable: ExperimentSubmission
CREATE TABLE "ExperimentSubmission" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "submitted_by_id" TEXT,
    "predicted_score" DOUBLE PRECISION NOT NULL,
    "actual_score" DOUBLE PRECISION,
    "outcome" TEXT,
    "observations" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExperimentSubmission_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ExperimentSubmission_candidate_id_idx" ON "ExperimentSubmission"("candidate_id");
CREATE INDEX "ExperimentSubmission_status_idx" ON "ExperimentSubmission"("status");
CREATE INDEX "ExperimentSubmission_submitted_by_id_idx" ON "ExperimentSubmission"("submitted_by_id");

-- CreateTable: ExperimentReview
CREATE TABLE "ExperimentReview" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExperimentReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExperimentReview_submission_id_reviewer_id_key" ON "ExperimentReview"("submission_id", "reviewer_id");
CREATE INDEX "ExperimentReview_submission_id_idx" ON "ExperimentReview"("submission_id");
CREATE INDEX "ExperimentReview_reviewer_id_idx" ON "ExperimentReview"("reviewer_id");

-- CreateTable: CalibrationLog
CREATE TABLE "CalibrationLog" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "predicted_score" DOUBLE PRECISION NOT NULL,
    "actual_score" DOUBLE PRECISION NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CalibrationLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CalibrationLog_candidate_id_idx" ON "CalibrationLog"("candidate_id");
CREATE INDEX "CalibrationLog_created_at_idx" ON "CalibrationLog"("created_at");

-- CreateTable: TrainingSnapshot
CREATE TABLE "TrainingSnapshot" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "triggered_by_id" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'project',
    "experiments_indexed" INTEGER NOT NULL DEFAULT 0,
    "approved_count" INTEGER NOT NULL DEFAULT 0,
    "rejected_count" INTEGER NOT NULL DEFAULT 0,
    "changes_requested_count" INTEGER NOT NULL DEFAULT 0,
    "avg_drift_before" DOUBLE PRECISION,
    "avg_drift_after" DOUBLE PRECISION,
    "bias_correction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TrainingSnapshot_project_id_idx" ON "TrainingSnapshot"("project_id");
CREATE INDEX "TrainingSnapshot_created_at_idx" ON "TrainingSnapshot"("created_at");
CREATE INDEX "TrainingSnapshot_triggered_by_id_idx" ON "TrainingSnapshot"("triggered_by_id");

-- CreateTable: FailureInsight
CREATE TABLE "FailureInsight" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FailureInsight_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FailureInsight_project_id_idx" ON "FailureInsight"("project_id");

-- Foreign Keys
ALTER TABLE "User" ADD CONSTRAINT "User_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExperimentSubmission" ADD CONSTRAINT "ExperimentSubmission_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExperimentSubmission" ADD CONSTRAINT "ExperimentSubmission_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExperimentReview" ADD CONSTRAINT "ExperimentReview_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "ExperimentSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExperimentReview" ADD CONSTRAINT "ExperimentReview_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CalibrationLog" ADD CONSTRAINT "CalibrationLog_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainingSnapshot" ADD CONSTRAINT "TrainingSnapshot_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainingSnapshot" ADD CONSTRAINT "TrainingSnapshot_triggered_by_id_fkey" FOREIGN KEY ("triggered_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FailureInsight" ADD CONSTRAINT "FailureInsight_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
