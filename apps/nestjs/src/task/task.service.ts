import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { PrismaService } from '../prisma/prisma.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'

@Injectable()
export class TaskService implements OnModuleInit {
  private readonly logger = new Logger(TaskService.name)

  constructor(private readonly prismaService: PrismaService) {}
  onModuleInit() {}

  async registerTask() {
    // 查询数据库中所有激活的任务
    const activeTasks = await this.prismaService.task.findMany({
      where: {
        status: 'active',
      },
    })
    // 遍历每个任务，注册到调度器
    for (const task of activeTasks) {
      //   // 这里可以使用调度器注册任务的逻辑
    }
  }

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

  @Cron(CronExpression.EVERY_30_SECONDS)
  handleCron() {
    this.logger.debug('Called every 30 seconds')
  }
}
