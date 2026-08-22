-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('COMMENT', 'LIKE');

-- CreateTable
CREATE TABLE "OOTDComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OOTDComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "sourceCommentId" TEXT,
    "sourceLikeId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Enforce that each notification points to exactly one source matching its type.
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_type_source_check" CHECK (
    ("type" = 'COMMENT' AND "sourceCommentId" IS NOT NULL AND "sourceLikeId" IS NULL)
    OR
    ("type" = 'LIKE' AND "sourceLikeId" IS NOT NULL AND "sourceCommentId" IS NULL)
);

-- CreateIndex
CREATE INDEX "OOTDComment_postId_createdAt_id_idx" ON "OOTDComment"("postId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "OOTDComment_userId_idx" ON "OOTDComment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_sourceCommentId_key" ON "Notification"("sourceCommentId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_sourceLikeId_key" ON "Notification"("sourceLikeId");

-- CreateIndex
CREATE INDEX "Notification_recipientId_createdAt_id_idx" ON "Notification"("recipientId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_idx" ON "Notification"("recipientId", "readAt");

-- AddForeignKey
ALTER TABLE "OOTDComment" ADD CONSTRAINT "OOTDComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "OOTDPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OOTDComment" ADD CONSTRAINT "OOTDComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_postId_fkey" FOREIGN KEY ("postId") REFERENCES "OOTDPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sourceCommentId_fkey" FOREIGN KEY ("sourceCommentId") REFERENCES "OOTDComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sourceLikeId_fkey" FOREIGN KEY ("sourceLikeId") REFERENCES "OOTDLike"("id") ON DELETE CASCADE ON UPDATE CASCADE;
