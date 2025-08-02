import type { AppMessage } from '@core/shared'

import { MarkdownRenderer } from '../markdown'
import { AllTaskUI } from './tool-ui/all-task-ui'
import { ImmediatelyExecuteTaskUI } from './tool-ui/immediately-execute-task-ui'
// import { ImmediatelyExecuteTaskUI } from './tool-ui/immediately-execute-task-ui'
import { LatestReportUI } from './tool-ui/latest-report-ui'
import { ReportUI } from './tool-ui/report-ui'
import { RequestUserConsentUI } from './tool-ui/request-user-consent-ui'
import { TaskDetailUI } from './tool-ui/task-detail-ui'

export const AssistantMessage = ({ message }: { message: AppMessage }) => {
  if (message.role !== 'assistant') {
    return null
  }

  const { parts } = message
  return (
    <div className="space-y-4">
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
          case 'tool-ImmediatelyExecuteTask': {
            const { state } = part
            if (state === 'output-available') {
              return (
                <ImmediatelyExecuteTaskUI
                  key={index}
                  part={part}
                  message={message}
                />
              )
            }
            return null
          }
          case 'tool-ShowLatestReportUI': {
            const { state } = part
            if (state === 'input-available' || state === 'output-available') {
              return <LatestReportUI key={index} part={part} />
            }
            return null
          }
          case 'tool-ShowReportUI': {
            const { state } = part
            if (state === 'input-available' || state === 'output-available') {
              return <ReportUI key={index} message={message} part={part} />
            }
            return null
          }
          case 'tool-ShowAllTaskUI': {
            const { state } = part
            if (state === 'input-available' || state === 'output-available') {
              return <AllTaskUI key={index} message={message} part={part} />
            }
            return null
          }
          case 'tool-ShowTaskDetailUI': {
            const { state } = part
            if (state === 'input-available' || state === 'output-available') {
              return <TaskDetailUI key={index} message={message} part={part} />
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
    </div>
  )
}
