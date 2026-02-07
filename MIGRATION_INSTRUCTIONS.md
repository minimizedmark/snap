# Database Migration: PUBLIC_LINE → SNAPLINE

## Apply This Migration

Run this command from the project root:

```bash
npm run prisma:migrate:deploy
# OR
npx prisma migrate deploy
```

## Manual SQL (if migration fails)

If the automatic migration doesn't work, run this SQL directly on your database:

```sql
-- Step 1: Create new enum with SNAPLINE
CREATE TYPE "public"."SubscriptionType_new" AS ENUM ('BASIC', 'SNAPLINE');

-- Step 2: Add temporary column
ALTER TABLE "public"."users" 
ADD COLUMN "subscription_type_new" "public"."SubscriptionType_new";

-- Step 3: Copy and map data
UPDATE "public"."users"
SET "subscription_type_new" = 
  CASE 
    WHEN "subscription_type" = 'PUBLIC_LINE' THEN 'SNAPLINE'::"public"."SubscriptionType_new"
    WHEN "subscription_type" = 'BASIC' THEN 'BASIC'::"public"."SubscriptionType_new"
  END;

-- Step 4: Drop old column
ALTER TABLE "public"."users" DROP COLUMN "subscription_type";

-- Step 5: Rename new column
ALTER TABLE "public"."users" 
RENAME COLUMN "subscription_type_new" TO "subscription_type";

-- Step 6: Set constraints
ALTER TABLE "public"."users" 
ALTER COLUMN "subscription_type" SET NOT NULL;

ALTER TABLE "public"."users" 
ALTER COLUMN "subscription_type" SET DEFAULT 'BASIC'::"public"."SubscriptionType_new";

-- Step 7: Drop old enum
DROP TYPE "public"."SubscriptionType";

-- Step 8: Rename new enum
ALTER TYPE "public"."SubscriptionType_new" RENAME TO "SubscriptionType";
```

## Verification

After applying the migration, verify with:

```sql
-- Check enum values
SELECT enum_range(NULL::public."SubscriptionType");
-- Should return: {BASIC,SNAPLINE}

-- Check user data
SELECT subscription_type, COUNT(*) 
FROM users 
GROUP BY subscription_type;
```

## Rollback (if needed)

To revert this change:

```sql
-- Same process but reverse SNAPLINE → PUBLIC_LINE
CREATE TYPE "public"."SubscriptionType_new" AS ENUM ('BASIC', 'PUBLIC_LINE');
-- ... (reverse the above steps)
```
