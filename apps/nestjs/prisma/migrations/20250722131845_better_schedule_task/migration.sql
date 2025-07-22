/*
  Warnings:

  - You are about to drop the column `cron` on the `Task` table. All the data in the column will be lost.
  - Added the required column `scheduleExpression` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduleType` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('cron', 'interval');

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "cron",
ADD COLUMN     "scheduleExpression" TEXT NOT NULL,
ADD COLUMN     "scheduleType" "ScheduleType" NOT NULL;
