/*
  Warnings:

  - You are about to drop the `AnalysisResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AnalysisTaskStatus" AS ENUM ('active', 'paused', 'running');

-- DropForeignKey
ALTER TABLE "AnalysisResult" DROP CONSTRAINT "AnalysisResult_taskId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_ownerId_fkey";

-- DropTable
DROP TABLE "AnalysisResult";

-- DropTable
DROP TABLE "Task";

-- DropEnum
DROP TYPE "TaskStatus";

-- CreateTable
CREATE TABLE "AnalysisTask" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "keywords" TEXT[],
    "subreddits" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "AnalysisTaskStatus" NOT NULL,
    "lastExecutedAt" TIMESTAMP(3),
    "enableFiltering" BOOLEAN NOT NULL,
    "lastFailureAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "llmModel" TEXT,

    CONSTRAINT "AnalysisTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisReport" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" JSONB NOT NULL,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "AnalysisReport_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AnalysisTask" ADD CONSTRAINT "AnalysisTask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisReport" ADD CONSTRAINT "AnalysisReport_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AnalysisTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
