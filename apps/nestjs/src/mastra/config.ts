import { Mastra } from '@mastra/core'
import { PinoLogger } from '@mastra/loggers'
import { weatherWorkflow } from './workflows/weather-workflow'

export const config: ConstructorParameters<typeof Mastra>[0] = {
  workflows: { weatherWorkflow },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
}
