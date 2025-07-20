import { Mastra } from '@mastra/core'
import { Agent } from '@mastra/core/agent'

import { weatherAgentConfig } from './agents/weather-agent'
import { config } from './config'
import { memory, storage } from './storage'

export const mastra: Mastra = new Mastra({
  ...config,
  agents: {
    weatherAgent: new Agent({
      ...weatherAgentConfig,
      memory: memory,
    }),
  },
  storage: storage,
})
