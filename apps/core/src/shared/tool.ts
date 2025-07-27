import { TaskAgentService } from '@core/modules/task-agent/task-agent.service'
import { InferUITool, UIMessage } from 'ai'
import z from 'zod'

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
})

export type MessageMetadata = z.infer<typeof messageMetadataSchema>

export type ChatTools = ReturnType<typeof TaskAgentService.prototype.tools>

export type ChatToolUI = {
  [key in keyof ChatTools]: InferUITool<ChatTools[key]>
}

export type CustomUIDataTypes = {}

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatToolUI
>
