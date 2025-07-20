import { Mastra } from '@mastra/core'
import { config } from './config'
import { memory, storage } from './storage'
import { weatherAgentConfig } from './agents/weather-agent'
import { Agent } from '@mastra/core/agent'

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
