import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'
import { CreateReportDto } from './dto/create-report.dto'

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建并存储一个新的分析结果
   * @param createAnalysisReportDto 包含任务ID和分析内容的DTO
   * @returns 创建后的分析结果
   */
  create(createAnalysisReportDto: CreateReportDto) {
    return this.prisma.report.create({
      data: createAnalysisReportDto,
    })
  }

  /**
   * 根据任务ID查找所有相关的分析结果
   * @param taskId 任务的ID
   * @returns 分析结果列表
   */
  findAllByTaskId(taskId: string) {
    return this.prisma.report.findMany({
      where: {
        taskId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }
}
