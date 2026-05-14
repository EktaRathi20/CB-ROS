-- Rename the default seeded company to match the edited seed migration.
UPDATE "Company"
SET    "name" = 'ABC Research',
       "slug" = 'abc-research'
WHERE  "id" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
AND    "slug" = 'scilife-research';
