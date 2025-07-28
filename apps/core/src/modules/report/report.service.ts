import { Injectable } from '@nestjs/common'
import z from 'zod'

import { PrismaService } from '../../processors/prisma/prisma.service'
import { PaginateByTaskIdSchema, PaginateSchema } from './report.dto'

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async paginate({ take, skip }: z.infer<typeof PaginateSchema>) {
    const [reports, total] = await Promise.all([
      this.prisma.taskReport.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        take,
        skip,
        include: {
          task: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.taskReport.count(),
    ])

    return {
      reports,
      total,
      hasMore: skip + take < total,
    }
  }

  async paginateByTaskId({
    taskId,
    take,
    skip,
  }: z.infer<typeof PaginateByTaskIdSchema>) {
    const [reports, total] = await Promise.all([
      this.prisma.taskReport.findMany({
        where: {
          taskId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take,
        skip,
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
      hasMore: skip + take < total,
    }
  }
}
