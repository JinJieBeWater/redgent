/*
  Warnings:

  - You are about to drop the column `enableFiltering` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `keywords` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `subreddits` on the `Task` table. All the data in the column will be lost.
  - Added the required column `title` to the `TaskReport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Task" DROP COLUMN "enableFiltering",
DROP COLUMN "keywords",
DROP COLUMN "subreddits",
ADD COLUMN     "enableCache" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "payload" JSONB;

-- AlterTable
ALTER TABLE "TaskReport" ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "content" DROP NOT NULL,
ALTER COLUMN "content" SET DATA TYPE TEXT;
