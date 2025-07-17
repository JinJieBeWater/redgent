import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskSchedulerService } from './task-scheduler.service';
import { TaskExecutionService } from './task-execution.service';
import { RedditModule } from '../reddit/reddit.module';
import { AiSdkModule } from '../ai-sdk/ai-sdk.module';

@Module({
  imports: [
    // 注册 NestJS 定时任务模块
    ScheduleModule.forRoot(),
    // 引入依赖的服务所在的模块
    RedditModule,
    AiSdkModule,
  ],
  providers: [TaskSchedulerService, TaskExecutionService],
})
export class TaskModule {}
