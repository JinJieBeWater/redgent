import { Mastra } from '@mastra/core'
import { Agent } from '@mastra/core/agent'
import { PinoLogger } from '@mastra/loggers'
import { Memory } from '@mastra/memory'
import { PostgresStore } from '@mastra/pg'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { weatherAgentConfig } from './agents/weather-agent'
import { weatherWorkflow } from './workflows/weather-workflow'

@Injectable()
export class MastraService extends Mastra {
  private readonly postgresStore: PostgresStore
  constructor(private readonly configService: ConfigService) {
    const storage = new PostgresStore({
      connectionString: configService.get<string>('DATABASE_URL')!,
    })
    const memory = new Memory({
      storage,
    })

    super({
      logger: new PinoLogger({
        name: 'Mastra',
        level: 'info',
      }),
      agents: {
        weatherAgent: new Agent({
          ...weatherAgentConfig,
          memory: memory,
        }),
      },
      workflows: { weatherWorkflow },

      storage,
    })

    this.postgresStore = storage
  }
}
