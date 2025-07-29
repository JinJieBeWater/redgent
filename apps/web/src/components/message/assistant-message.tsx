import type { AppMessage } from '@core/shared'

import { MarkdownRenderer } from '../markdown'
import { TaskListToolUI } from './tool-message'

export const MessageAssistant = ({ message }: { message: AppMessage }) => {
  if (message.role !== 'assistant') {
    return null
  }

  const { parts } = message
  return (
    <>
      {parts.map((part, index) => {
        const { type } = part
        switch (type) {
          case 'step-start':
            return null
          case 'text':
            return <MarkdownRenderer key={index} content={part.text} />
          case 'file':
            return <MarkdownRenderer key={index} content="暂不支持 file" />
          case 'reasoning':
            return <MarkdownRenderer key={index} content="暂不支持 reasoning" />
          case 'source-document':
            return (
              <MarkdownRenderer
                key={index}
                content="暂不支持 source-document"
              />
            )
          case 'source-url':
            return (
              <MarkdownRenderer key={index} content="暂不支持 source-url" />
            )
          case 'tool-GetAllTasks':
          case 'tool-GetTaskDetail':
          case 'tool-CreateTask':
          case 'tool-UpdateTask':
          case 'tool-DeleteTask':
            return null
          case 'tool-ImmediatelyExecuteTask':
            return (
              <MarkdownRenderer
                key={index}
                content="暂不支持 ImmediatelyExecuteTask"
              />
            )
          case 'tool-ShowAllTaskUI': {
            const { state } = part
            if (state === 'input-available') {
              return <TaskListToolUI key={index} part={part} />
            }
            return null
          }
          case 'tool-ShowTaskDetailUI':
            return (
              <MarkdownRenderer
                key={index}
                content="暂不支持 ShowTaskDetailUI"
              />
            )
          default:
            return (
              <MarkdownRenderer
                key={index}
                content={'未知的消息类型，请反馈给开发者'}
              />
            )
        }
      })}
    </>
  )
}
