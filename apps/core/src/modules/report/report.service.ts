import { Injectable } from '@nestjs/common'
import z from 'zod'

import { PrismaService } from '../../processors/prisma/prisma.service'
import { PaginateByTaskIdSchema, PaginateSchema } from './report.dto'

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async paginate({ limit, cursor }: z.infer<typeof PaginateSchema>) {
    const [reports, total] = await Promise.all([
      this.prisma.taskReport.findMany({
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor
          ? {
              id: cursor,
            }
          : undefined,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          task: {
            select: {
              name: true,
            },
          },
          createdAt: true,
          taskId: true,
        },
      }),
      this.prisma.taskReport.count(),
    ])

    return {
      reports,
      total,
      nextCursor: reports.length === limit ? reports[limit - 1].id : undefined,
    }
  }

  async paginateByTaskId({
    taskId,
    limit,
    cursor,
  }: z.infer<typeof PaginateByTaskIdSchema>) {
    const [reports, total] = await Promise.all([
      this.prisma.taskReport.findMany({
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor
          ? {
              id: cursor,
            }
          : undefined,
        where: {
          taskId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          taskId: true,
        },
      }),
      this.prisma.taskReport.count({
        where: {
          taskId,
        },
      }),
    ])

    return {
      reports,
      total,
      nextCursor: reports.length === limit ? reports[limit - 1].id : undefined,
    }
  }
}
