import { Injectable } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'

@Injectable()
export class TaskService {
  constructor(private readonly prismaService: PrismaService) {}

  create(createAnalysisTaskDto: CreateTaskDto) {
    return this.prismaService.task.create({
      data: createAnalysisTaskDto,
    })
  }

  update(updateAnalysisTaskDto: UpdateTaskDto) {
    return this.prismaService.task.update({
      data: updateAnalysisTaskDto,
      where: {
        id: updateAnalysisTaskDto.id,
      },
    })
  }
}
