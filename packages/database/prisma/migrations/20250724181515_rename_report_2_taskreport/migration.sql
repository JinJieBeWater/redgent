-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('cron', 'interval');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('active', 'paused', 'running');

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "keywords" TEXT[],
    "subreddits" TEXT[],
    "scheduleType" "ScheduleType" NOT NULL,
    "scheduleExpression" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'active',
    "enableFiltering" BOOLEAN NOT NULL DEFAULT true,
    "lastExecutedAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskReport" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" JSONB NOT NULL,
    "executionDuration" INTEGER,
    "taskId" UUID NOT NULL,

    CONSTRAINT "TaskReport_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TaskReport" ADD CONSTRAINT "TaskReport_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
