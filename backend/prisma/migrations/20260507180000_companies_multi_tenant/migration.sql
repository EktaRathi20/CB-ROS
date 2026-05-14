-- Multi-tenant: each User belongs to a Company. Login flow:
-- 1) GET /api/companies → user picks a company
-- 2) GET /api/users?companyId=... → user picks a person from that company.

-- ---------- Company table ----------
CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Company_slug_key" ON "Company"("slug");

-- Mock companies (deterministic UUIDs so user backfill below can reference them)
INSERT INTO "Company" ("id", "name", "slug") VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ABC Research', 'abc-research'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Acme Catalysis',   'acme-catalysis'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'GreenChem Labs',   'greenchem-labs')
ON CONFLICT (slug) DO NOTHING;

-- ---------- User.company_id ----------
-- Add column nullable first so the backfill can run, then enforce NOT NULL.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "company_id" TEXT;

-- Distribute the four mock users across the three mock companies.
UPDATE "User" SET "company_id" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    WHERE "email" IN ('r.iyer@example.com', 'a.smith@example.com')
    AND   "company_id" IS NULL;
UPDATE "User" SET "company_id" = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    WHERE "email" = 'b.jones@example.com'
    AND   "company_id" IS NULL;
UPDATE "User" SET "company_id" = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    WHERE "email" = 'm.chen@example.com'
    AND   "company_id" IS NULL;

-- Any user not matched above (e.g. ad-hoc rows added manually) gets the
-- default company so the NOT NULL constraint can be applied safely.
UPDATE "User" SET "company_id" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    WHERE "company_id" IS NULL;

ALTER TABLE "User" ALTER COLUMN "company_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "User_company_id_idx" ON "User"("company_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_company_id_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "Company"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
