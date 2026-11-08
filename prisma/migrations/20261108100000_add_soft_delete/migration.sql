-- Soft-delete columns
ALTER TABLE "BaseEntity" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "BaseEntity" ADD COLUMN "deletedById" INTEGER;

ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "BaseEntity_deletedAt_idx" ON "BaseEntity"("deletedAt");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_username_idx" ON "User"("username");

-- Replace full unique constraints with partial unique indexes (active rows only)
DROP INDEX IF EXISTS "User_username_key";
DROP INDEX IF EXISTS "User_email_key";

CREATE UNIQUE INDEX "User_email_active_key" ON "User"("email") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "User_username_active_key" ON "User"("username") WHERE "deletedAt" IS NULL;

ALTER TABLE "BaseEntity" ADD CONSTRAINT "BaseEntity_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
