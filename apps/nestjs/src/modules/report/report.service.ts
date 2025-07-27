import { Injectable } from '@nestjs/common'

import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 根据任务ID查找所有相关的分析结果
   * @param taskId 任务的ID
   * @returns 分析结果列表
   */
  findAllByTaskId(taskId: string) {
    return this.prisma.taskReport.findMany({
      where: {
        taskId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }
}
