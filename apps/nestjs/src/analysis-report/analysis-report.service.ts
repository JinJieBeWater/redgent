import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateAnalysisReportDto } from './dto/create-analysis-report.dto'
import { Prisma } from '@prisma/client'

@Injectable()
export class AnalysisReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建并存储一个新的分析结果
   * @param createAnalysisReportDto 包含任务ID和分析内容的DTO
   * @returns 创建后的分析结果
   */
  create(createAnalysisReportDto: CreateAnalysisReportDto) {
    const { taskId, content } = createAnalysisReportDto

    const data: Prisma.AnalysisReportCreateInput = {
      content: content,
      task: {
        connect: {
          id: taskId,
        },
      },
    }

    return this.prisma.analysisReport.create({
      data,
    })
  }

  /**
   * 根据任务ID查找所有相关的分析结果
   * @param taskId 任务的ID
   * @returns 分析结果列表
   */
  findAllByTaskId(taskId: string) {
    return this.prisma.analysisReport.findMany({
      where: {
        taskId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }
}
