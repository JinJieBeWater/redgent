import type { AppMessage } from '@core/shared'

import { MarkdownRenderer } from '../markdown'
import {
  AllTaskUI,
  LatestReportUI,
  RequestUserConsentUI,
  TaskDetailUI,
} from './tool-message'

export const AssistantMessage = ({ message }: { message: AppMessage }) => {
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
            return (
              part.text && <MarkdownRenderer key={index} content={part.text} />
            )
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
          case 'tool-ShowLatestReportUI': {
            const { state } = part
            if (state === 'input-available') {
              return <LatestReportUI key={index} part={part} />
            }
            return null
          }
          case 'tool-ShowAllTaskUI': {
            const { state } = part
            if (state === 'input-available') {
              return <AllTaskUI key={index} part={part} />
            }
            return null
          }
          case 'tool-ShowTaskDetailUI': {
            const { state } = part
            if (state === 'input-available') {
              return <TaskDetailUI key={index} part={part} />
            }
            return null
          }
          case 'tool-RequestUserConsent': {
            const { state } = part
            if (state === 'input-available') {
              return <RequestUserConsentUI key={index} part={part} />
            }
            return null
          }
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
