-- Project versioning: major bumps on edit, minor (iterations_used) on each
-- discovery run. Reactants/products/catalysis_type are not editable, so they
-- never trigger a version change.
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "version_major" INTEGER NOT NULL DEFAULT 1;
