/*
  Warnings:

  - Made the column `payload` on table `Task` required. This step will fail if there are existing NULL values in that column.
  - Made the column `executionDuration` on table `TaskReport` required. This step will fail if there are existing NULL values in that column.
  - Made the column `content` on table `TaskReport` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "payload" SET NOT NULL;

-- AlterTable
ALTER TABLE "TaskReport" ALTER COLUMN "executionDuration" SET NOT NULL,
ALTER COLUMN "content" SET NOT NULL;
