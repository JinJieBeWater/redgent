import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import * as Joi from 'joi'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { RedditModule } from './modules/reddit/reddit.module'
import { ReportModule } from './modules/report/report'
import { TaskAgentModule } from './modules/task-agent/task-agent.module'
import { TaskExecutionModule } from './modules/task-execution/task-execution.module'
import { TaskScheduleModule } from './modules/task-schedule/task-schedule.module'
import { PrismaModule } from './processors/prisma/prisma.module'

@Module({
  imports: [
    CacheModule.register({
      ttl: 5000,
      isGlobal: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(8000),
        PROXY: Joi.number().default(7890),
        REDDIT_CLIENT_ID: Joi.string().required(),
        REDDIT_SECRET: Joi.string().required(),
        // OPENROUTER_API_KEY: Joi.string().required(),
        DEEPSEEK_API_KEY: Joi.string().required(),
      }),
      validationOptions: {
        abortEarly: true,
      },
    }),
    RedditModule,
    TaskExecutionModule,
    PrismaModule,
    ReportModule,
    TaskScheduleModule,
    TaskAgentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
