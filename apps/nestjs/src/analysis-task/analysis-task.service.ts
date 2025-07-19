import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateAnalysisTaskDto } from './dto/create-analysis-task.dto'
import { UpdateAnalysisTaskDto } from './dto/update-analysis-task.dto'

@Injectable()
export class AnalysisTaskService {
  constructor(private readonly prismaService: PrismaService) {}

  create(createAnalysisTaskDto: CreateAnalysisTaskDto) {
    return this.prismaService.analysisTask.create({
      data: createAnalysisTaskDto,
    })
  }

  update(updateAnalysisTaskDto: UpdateAnalysisTaskDto) {
    return this.prismaService.analysisTask.update({
      data: updateAnalysisTaskDto,
      where: {
        id: updateAnalysisTaskDto.id,
      },
    })
  }
}
