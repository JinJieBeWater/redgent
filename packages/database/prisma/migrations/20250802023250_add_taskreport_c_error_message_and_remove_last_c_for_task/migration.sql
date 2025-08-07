/*
  Warnings:

  - You are about to drop the column `lastErrorMessage` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `lastExecutedAt` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `lastFailureAt` on the `Task` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Task" DROP COLUMN "lastErrorMessage",
DROP COLUMN "lastExecutedAt",
DROP COLUMN "lastFailureAt";

-- AlterTable
ALTER TABLE "TaskReport" ADD COLUMN     "errorMessage" TEXT,
ALTER COLUMN "executionDuration" DROP NOT NULL,
ALTER COLUMN "content" DROP NOT NULL;
