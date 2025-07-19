/*
  Warnings:

  - You are about to drop the column `ownerId` on the `AnalysisTask` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AnalysisReport" DROP CONSTRAINT "AnalysisReport_taskId_fkey";

-- DropForeignKey
ALTER TABLE "AnalysisTask" DROP CONSTRAINT "AnalysisTask_ownerId_fkey";

-- AlterTable
ALTER TABLE "AnalysisReport" ADD COLUMN     "executionDuration" INTEGER;

-- AlterTable
ALTER TABLE "AnalysisTask" DROP COLUMN "ownerId",
ALTER COLUMN "status" SET DEFAULT 'active',
ALTER COLUMN "enableFiltering" SET DEFAULT true;

-- DropTable
DROP TABLE "User";

-- AddForeignKey
ALTER TABLE "AnalysisReport" ADD CONSTRAINT "AnalysisReport_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AnalysisTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
