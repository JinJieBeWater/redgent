import { Mastra } from '@mastra/core'
import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PostgresStore } from '@mastra/pg'
import { config } from './config'
import { weatherAgentConfig } from './agents/weather-agent'
import { Memory } from '@mastra/memory'
import { Agent } from '@mastra/core/agent'

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
