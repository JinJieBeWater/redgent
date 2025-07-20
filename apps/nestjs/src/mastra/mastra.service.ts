import { Mastra } from '@mastra/core'
import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { PostgresStore } from '@mastra/pg'
import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { weatherAgentConfig } from './agents/weather-agent'
import { config } from './config'

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
      ...config,
      agents: {
        weatherAgent: new Agent({
          ...weatherAgentConfig,
          memory: memory,
        }),
      },
      storage,
    })

    this.postgresStore = storage
  }
}
