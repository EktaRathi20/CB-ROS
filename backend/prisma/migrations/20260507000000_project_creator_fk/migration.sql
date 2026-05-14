-- Replace the free-text Project.creator with a proper FK to User.

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "creator_id" TEXT;

-- Best-effort backfill: any existing rows whose creator string matches a
-- seeded user's name get linked. Unmatched rows simply end up with NULL.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Project' AND column_name = 'creator'
  ) THEN
    EXECUTE $sql$
      UPDATE "Project" p
      SET    "creator_id" = u.id
      FROM   "User" u
      WHERE  p."creator_id" IS NULL
      AND    p."creator" IS NOT NULL
      AND    u.name = p."creator"
    $sql$;

    EXECUTE 'ALTER TABLE "Project" DROP COLUMN "creator"';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Project_creator_id_idx" ON "Project"("creator_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Project_creator_id_fkey'
  ) THEN
    ALTER TABLE "Project"
      ADD CONSTRAINT "Project_creator_id_fkey"
      FOREIGN KEY ("creator_id") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
