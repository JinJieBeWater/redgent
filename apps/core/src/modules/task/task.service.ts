import { PrismaService } from '@core/processors/prisma/prisma.service'
import { Injectable } from '@nestjs/common'
import z from 'zod'

import { TaskStatus } from '@redgent/db'

import { detailSchema, paginateSchema } from './task.dto'

@Injectable()
export class TaskService {
  constructor(private readonly prismaService: PrismaService) {}

  async paginate({ take, skip, status }: z.infer<typeof paginateSchema>) {
    const [data, total] = await Promise.all([
      this.prismaService.task.findMany({
        take,
        skip,
        where: {
          status: status ? undefined : status,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      }),
      this.prismaService.task.count({
        where: {
          status: status ? undefined : status,
        },
      }),
    ])

    return {
      data,
      total,
      hasMore: skip + take < total,
    }
  }

  async detail({ id }: z.infer<typeof detailSchema>) {
    return await this.prismaService.task.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        status: true,
        keywords: true,
        subreddits: true,
        scheduleType: true,
        scheduleExpression: true,
        enableFiltering: true,
        updatedAt: true,
        createdAt: true,
        lastErrorMessage: true,
        lastExecutedAt: true,
        lastFailureAt: true,
      },
    })
  }
}
