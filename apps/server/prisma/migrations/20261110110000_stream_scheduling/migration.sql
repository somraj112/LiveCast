-- AlterEnum
ALTER TYPE "StreamStatus" ADD VALUE 'DRAFT' BEFORE 'SCHEDULED';

-- AlterTable
ALTER TABLE "streams"
ADD COLUMN "scheduled_at" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "streams_status_scheduled_at_idx" ON "streams"("status", "scheduled_at");

-- SeedReferenceCategories
INSERT INTO "categories" ("id", "name", "icon") VALUES
  ('30000000-0000-4000-8000-000000000001', 'Education', 'graduation-cap'),
  ('30000000-0000-4000-8000-000000000002', 'Gaming', 'gamepad-2'),
  ('30000000-0000-4000-8000-000000000003', 'Music', 'music'),
  ('30000000-0000-4000-8000-000000000004', 'Sports', 'trophy'),
  ('30000000-0000-4000-8000-000000000005', 'Talk Shows', 'mic-2')
ON CONFLICT ("name") DO NOTHING;
