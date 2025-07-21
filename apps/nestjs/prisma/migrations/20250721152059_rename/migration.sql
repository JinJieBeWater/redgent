/*
  Warnings:

  - You are about to drop the `AnalysisReport` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AnalysisTask` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('active', 'paused', 'running');

-- DropForeignKey
ALTER TABLE "AnalysisReport" DROP CONSTRAINT "AnalysisReport_taskId_fkey";

-- DropTable
DROP TABLE "AnalysisReport";

-- DropTable
DROP TABLE "AnalysisTask";

-- DropEnum
DROP TYPE "AnalysisTaskStatus";

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "keywords" TEXT[],
    "subreddits" TEXT[],
    "status" "TaskStatus" NOT NULL DEFAULT 'active',
    "enableFiltering" BOOLEAN NOT NULL DEFAULT true,
    "llmModel" TEXT,
    "lastExecutedAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" JSONB NOT NULL,
    "executionDuration" INTEGER,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
