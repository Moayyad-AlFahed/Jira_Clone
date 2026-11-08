-- Membership creation timestamp (backfill uses migration apply time for existing rows).
ALTER TABLE "ProjectUsers" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
