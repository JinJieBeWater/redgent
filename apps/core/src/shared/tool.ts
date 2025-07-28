import { TaskAgentService } from '@core/modules/task-agent/task-agent.service'
import { InferUITool, UIMessage } from 'ai'
import z from 'zod'

export const AppMetadataSchema = z.object({
  createdAt: z.string(),
})

export type AppMetadata = z.infer<typeof AppMetadataSchema>

export type AppTools = ReturnType<typeof TaskAgentService.prototype.tools>

export type AppToolUI = {
  [key in keyof AppTools]: InferUITool<AppTools[key]>
}

export type AppUIDataTypes = {}

export type AppMessage = UIMessage<AppMetadata, AppUIDataTypes, AppToolUI>
