-- Drop the User.role column. All users are scientists; companies need at
-- least 2 of them, so seed extras while we're at it.

-- Add new scientists across the three mock companies (idempotent).
INSERT INTO "User" ("id", "name", "email", "company_id") VALUES
    ('55555555-5555-5555-5555-555555555555', 'Dr. K. Patel',     'k.patel@example.com',     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    ('66666666-6666-6666-6666-666666666666', 'Dr. L. Wright',    'l.wright@example.com',    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ('77777777-7777-7777-7777-777777777777', 'Dr. T. Nakamura',  't.nakamura@example.com',  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ('88888888-8888-8888-8888-888888888888', 'Dr. S. Khan',      's.khan@example.com',      'cccccccc-cccc-cccc-cccc-cccccccccccc')
ON CONFLICT (email) DO NOTHING;

-- Drop the role column itself.
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
