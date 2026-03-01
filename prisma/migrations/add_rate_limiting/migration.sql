-- CreateTable: rate_limit_attempts
-- Backing store for sliding window rate limiting across serverless instances.
-- Records every attempt (allowed or rejected) per key.
-- Expired records are lazily deleted on each check — no separate cleanup job needed.
-- The composite index on (key, timestamp) makes both the window count query
-- and the expired-record delete fast even under heavy load.

CREATE TABLE "public"."rate_limit_attempts" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rate_limit_attempts_key_timestamp_idx" ON "public"."rate_limit_attempts"("key", "timestamp");
