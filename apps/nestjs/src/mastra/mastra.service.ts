import { Mastra } from '@mastra/core'
import { LibSQLStore } from '@mastra/libsql'
import { PinoLogger } from '@mastra/loggers'
import { Injectable } from '@nestjs/common'
import { weatherAgent } from './agents/weather-agent'
import { weatherWorkflow } from './workflows/weather-workflow'

@Injectable()
export class MastraService extends Mastra {
  constructor() {
    super({
      workflows: { weatherWorkflow },
      agents: { weatherAgent },
      storage: new LibSQLStore({
        // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
        url: ':memory:',
      }),
      logger: new PinoLogger({
        name: 'Mastra',
        level: 'info',
      }),
    })
  }
}
