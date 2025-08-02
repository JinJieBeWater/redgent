import type { AppMessage, AppToolUI, AppUIDataTypes } from '@core/shared'
import type { UIMessagePart } from 'ai'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@web/components/ui/button'
import { useChatContext } from '@web/contexts/chat-context'
import { trpc } from '@web/router'
import { generateId } from 'ai'

import { ErrorMessage, LoadingMessage } from './common'

export const ImmediatelyExecuteTaskUI = ({
  part,
}: {
  message: AppMessage
  part: Extract<
    UIMessagePart<AppUIDataTypes, AppToolUI>,
    { type: 'tool-ImmediatelyExecuteTask'; state: 'output-available' }
  >
}) => {
  const { input, output } = part

  const { addToolResult, setMessages, messages } = useChatContext()

  // 查看报告函数
  const handleViewReport = () => {
    if (output.reportId) {
      setMessages([
        ...messages,
        {
          id: generateId(),
          role: 'user',
          parts: [
            {
              type: 'text',
              text: `查看报告`,
            },
          ],
        },
        {
          id: generateId(),
          role: 'assistant',
          parts: [
            {
              type: 'tool-ShowReportUI',
              toolCallId: generateId(),
              state: 'input-available',
              input: {
                id: output.reportId,
              },
            },
          ],
        },
      ])
    }
  }

  // 轮询
  const { data, isPending, isError, error } = useQuery(
    trpc.taskExecution.reportStatus.queryOptions(
      { taskId: input.taskId, reportId: output.reportId },
      {
        enabled: output.status === 'running',
        refetchInterval: 3000,
      },
    ),
  )
  const { reportId, taskName } = output
  useEffect(() => {
    switch (data?.status) {
      case 'running':
        break
      case 'success':
        addToolResult({
          tool: 'ImmediatelyExecuteTask',
          toolCallId: part.toolCallId,
          output: {
            reportId: reportId,
            taskName: taskName,
            status: data.status,
            message: '任务执行成功',
          },
        })
        break
      case 'failure':
        addToolResult({
          tool: 'ImmediatelyExecuteTask',
          toolCallId: part.toolCallId,
          output: {
            reportId: reportId,
            taskName: taskName,
            status: data.status,
            message: '任务执行失败',
          },
        })
        break
      default:
        break
    }
  }, [data, addToolResult, part.toolCallId, reportId, taskName])

  if (!data && isPending) {
    return <LoadingMessage message="正在查询任务执行状态..." />
  }

  if (isError) {
    return <ErrorMessage error={error} />
  }

  // 根据状态显示不同的UI
  const renderStatus = () => {
    const currentStatus = output.status
    const currentMessage = output.message

    switch (currentStatus) {
      case 'running':
        return (
          <div className="text-primary flex items-center gap-2">
            <div className="bg-primary h-2 w-2 shrink-0 animate-pulse rounded-full" />
            <span className="line-clamp-1 text-sm font-medium">
              {currentMessage}
            </span>
          </div>
        )

      case 'success':
        return (
          <div className="flex items-center gap-2">
            <div className="bg-accent-foreground h-2 w-2 shrink-0 rounded-full" />
            {output.reportId && (
              <Button
                size="sm"
                onClick={handleViewReport}
                className="ml-auto h-6 px-2 text-xs"
              >
                查看报告
              </Button>
            )}
          </div>
        )

      case 'failure':
        return (
          <div className="text-destructive flex items-center gap-2">
            <div className="bg-destructive h-2 w-2 shrink-0 rounded-full" />
            <span className="line-clamp-1 text-sm font-medium">
              {currentMessage}
            </span>
          </div>
        )

      default:
        return (
          <div className="text-muted-foreground flex items-center gap-2">
            <div className="bg-muted-foreground h-2 w-2 shrink-0 rounded-full" />
            <span className="line-clamp-1 text-sm font-medium">
              {currentMessage}
            </span>
          </div>
        )
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-6">
        <h3 className="line-clamp-1 text-sm font-medium">{output.taskName}</h3>
        {renderStatus()}
      </div>
    </div>
  )
}
