import { PrismaService } from '@core/processors/prisma/prisma.service'
import { Injectable } from '@nestjs/common'
import z from 'zod'

import { DetailSchema, PaginateSchema } from './task.dto'

@Injectable()
export class TaskService {
  constructor(private readonly prismaService: PrismaService) {}

  async paginate({ limit, cursor, status }: z.infer<typeof PaginateSchema>) {
    const [tasks, total] = await Promise.all([
      this.prismaService.task.findMany({
        take: limit,
        skip: cursor ? 1 : 0,
        where: {
          status,
        },
        orderBy: {
          createdAt: 'desc',
        },
        cursor: cursor
          ? {
              id: cursor,
            }
          : undefined,
        select: {
          id: true,
          name: true,
          status: true,
        },
      }),
      this.prismaService.task.count({
        where: {
          status,
        },
      }),
    ])

    return {
      tasks,
      total,
      nextCursor: tasks.length === limit ? tasks[limit - 1].id : undefined,
    }
  }

  async detail({ id }: z.infer<typeof DetailSchema>) {
    return await this.prismaService.task.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        status: true,
        payload: true,
        scheduleType: true,
        scheduleExpression: true,
        enableCache: true,
        updatedAt: true,
        createdAt: true,
        lastErrorMessage: true,
        lastExecutedAt: true,
        lastFailureAt: true,
      },
    })
  }
}
