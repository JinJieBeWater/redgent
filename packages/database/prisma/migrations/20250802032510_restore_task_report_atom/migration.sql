/*
  Warnings:

  - You are about to drop the column `errorMessage` on the `TaskReport` table. All the data in the column will be lost.
  - Made the column `executionDuration` on table `TaskReport` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `TaskReport` required. This step will fail if there are existing NULL values in that column.
  - Made the column `content` on table `TaskReport` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "TaskReport" DROP COLUMN "errorMessage",
ALTER COLUMN "executionDuration" SET NOT NULL,
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "content" SET NOT NULL;
