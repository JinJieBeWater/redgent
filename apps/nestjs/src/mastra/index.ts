import { Mastra } from '@mastra/core'
import { Agent } from '@mastra/core/agent'
import { PinoLogger } from '@mastra/loggers'

import { weatherAgentConfig } from './agents/weather-agent'
import { memory } from './storage'
import { weatherWorkflow } from './workflows/weather-workflow'

export const mastra: Mastra = new Mastra({
  workflows: { weatherWorkflow },
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
  // storage: storage,
})
