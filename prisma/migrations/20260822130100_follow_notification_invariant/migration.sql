-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "postId" DROP NOT NULL;
ALTER TABLE "Notification" ADD COLUMN "sourceFollowId" TEXT;

-- Replace the source invariant after the FOLLOW enum value has committed.
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_type_source_check";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_type_source_check" CHECK (
    ("type" = 'COMMENT' AND "postId" IS NOT NULL AND "sourceCommentId" IS NOT NULL AND "sourceLikeId" IS NULL AND "sourceFollowId" IS NULL)
    OR
    ("type" = 'LIKE' AND "postId" IS NOT NULL AND "sourceLikeId" IS NOT NULL AND "sourceCommentId" IS NULL AND "sourceFollowId" IS NULL)
    OR
    ("type" = 'FOLLOW' AND "postId" IS NULL AND "sourceFollowId" IS NOT NULL AND "sourceCommentId" IS NULL AND "sourceLikeId" IS NULL)
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_sourceFollowId_key" ON "Notification"("sourceFollowId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sourceFollowId_fkey" FOREIGN KEY ("sourceFollowId") REFERENCES "Follow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
