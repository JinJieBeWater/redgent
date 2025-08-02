import type { AppMessage, AppToolUI, AppUIDataTypes } from '@core/shared'
import type { UIMessagePart } from 'ai'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSubscription } from '@trpc/tanstack-react-query'
import { Button } from '@web/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@web/components/ui/collapsible'
import { Progress } from '@web/components/ui/progress'
import { useChatContext } from '@web/contexts/chat-context'
import { cn } from '@web/lib/utils'
import { trpc } from '@web/router'
import { generateId } from 'ai'
import {
  AlertCircle,
  Brain,
  CheckCircle,
  ChevronsUpDown,
  Download,
  FileText,
  Filter,
  Info,
  Loader2,
  Play,
  Search,
  SearchCode,
  XCircle,
} from 'lucide-react'
import z from 'zod'

import type {
  ExecuteSubscribeOutputSchema,
  TaskProgress,
} from '@redgent/shared'

/**
 * 明确! 数据通过 addToolOutput 进行持久化
 * 正常流程
 * agent 调用该工具, 触发任务执行后显示该组件, 该组件通过 sse 接受数据, 并使用 addToolOutput 中持久化
 *
 * 假 runnig 状态检查 (在任务执行时离开页面, 导致任务停留在 running 状态)
 * 需要进行确认后端缓存是否真的是在执行中
 * 1. 是 进行正常流程
 * 2. 否 说明 running 是假状态
 * - 查询 reportId 对应的报告是否存在
 * - 如果存在, 则显示正确状态, 设置 success 状态
 * - 如果不存在, 则显示错误状态, 设置 failure 状态
 */

// 获取状态对应的图标
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'TASK_START':
      return Play
    case 'FETCH_START':
    case 'FETCH_COMPLETE':
      return Download
    case 'FILTER_START':
    case 'FILTER_COMPLETE':
      return Filter
    case 'SELECT_START':
    case 'SELECT_COMPLETE':
      return Search
    case 'FETCH_CONTENT_START':
    case 'FETCH_CONTENT_COMPLETE':
      return FileText
    case 'ANALYZE_START':
    case 'ANALYZE_COMPLETE':
      return Brain
    case 'TASK_COMPLETE':
      return CheckCircle
    case 'TASK_CANCEL':
      return AlertCircle
    case 'TASK_ERROR':
      return XCircle
    default:
      return Info
  }
}

const getClientStatus = (status: TaskProgress['status']) => {
  switch (status) {
    case 'TASK_START':
      return 'running'
    case 'TASK_COMPLETE':
      return 'success'
    case 'TASK_CANCEL':
      return 'cancel'
    case 'TASK_ERROR':
      return 'failure'
    default:
      return 'running'
  }
}

export const ImmediatelyExecuteTaskUI = ({
  part,
}: {
  message: AppMessage
  part: UIMessagePart<AppUIDataTypes, AppToolUI>
}) => {
  if (part.type !== 'tool-ImmediatelyExecuteTask') return null
  if (part.state !== 'output-available') return

  const { input, output } = part

  const [isOpen, setIsOpen] = useState(false)

  const { messages, setMessages, addToolResult } = useChatContext()

  const { data } = useSubscription(
    trpc.task.execute.subscribe.subscriptionOptions({}),
  )

  const sseData = (data as any)?.data as
    | z.infer<typeof ExecuteSubscribeOutputSchema>
    | undefined

  // 订阅最新的数据 维护对应 part 的 output
  useEffect(() => {
    // 确定是正确的报告
    if (sseData?.reportId === output.reportId) {
      // 去重
      const exists = output.progress.some(
        p => p.status === sseData.progress.status,
      )
      if (exists) return

      const curProgress = sseData.progress
      addToolResult({
        tool: 'ImmediatelyExecuteTask',
        toolCallId: part.toolCallId,
        output: {
          ...output,
          message: curProgress.message,
          progress: [...output.progress, curProgress],
          status: getClientStatus(curProgress.status),
        },
      })
    }
  }, [sseData])

  // 计算整体进度
  const getProgress = () => {
    const status = output.progress[output.progress.length - 1]?.status

    // 根据状态返回大致进度
    const progressMap: Record<string, number> = {
      TASK_START: 5,
      FETCH_START: 15,
      FETCH_COMPLETE: 30,
      FILTER_START: 35,
      FILTER_COMPLETE: 50,
      SELECT_START: 55,
      SELECT_COMPLETE: 65,
      FETCH_CONTENT_START: 70,
      FETCH_CONTENT_COMPLETE: 80,
      ANALYZE_START: 85,
      ANALYZE_COMPLETE: 95,
      TASK_COMPLETE: 100,
    }

    return progressMap[status] || 0
  }

  // 假 running 状态检查 (在任务执行时离开页面, 导致任务停留在 running 状态)
  const isRunning = output.status === 'running'
  const { data: runningReportId, status: runningReportIdStatus } = useQuery(
    trpc.taskExecution.isRunning.queryOptions(
      { taskId: input.taskId },
      {
        enabled: isRunning,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    ),
  )

  const { data: reportData, status: reportStatus } = useQuery(
    trpc.report.byId.queryOptions(
      { id: output.reportId },
      {
        enabled: runningReportId !== output.reportId,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    ),
  )

  useEffect(() => {
    if (isRunning && runningReportIdStatus === 'success') {
      // 当前任务正在执行并且确定是在执行当前对应报告的id
      if (runningReportId === output.reportId) {
        // 什么都不做
      } else {
        // 当前报告对应的任务组合并不在执行中
        // 查询当前报告
        if (reportStatus === 'success') {
          // 当前报告存在
          if (reportData?.title) {
            addToolResult({
              tool: 'ImmediatelyExecuteTask',
              toolCallId: part.toolCallId,
              output: {
                ...output,
                message: '任务成功执行完毕',
                status: 'success',
              },
            })
          } else {
            addToolResult({
              tool: 'ImmediatelyExecuteTask',
              toolCallId: part.toolCallId,
              output: {
                ...output,
                message: '任务执行失败',
                status: 'failure',
              },
            })
          }
        }
      }
    }
  }, [
    runningReportId,
    isRunning,
    runningReportIdStatus,
    reportData,
    reportStatus,
    addToolResult,
  ])

  return (
    <div className="space-y-4 rounded-lg border p-3">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="flex w-full flex-col gap-4"
      >
        {/* 任务标题和进度 */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-end gap-2">
              <h3 className="font-semibold">{output.taskName}</h3>
              {output?.status === 'running' && (
                <div className="text-muted-foreground text-sm">
                  {getProgress()}%
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* 完成后查看报告 */}
              <Button
                variant={'ghost'}
                size={'icon'}
                className="size-7"
                disabled={output?.status !== 'success'}
                onClick={() => {
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
                            id: output?.reportId,
                          },
                        },
                      ],
                    },
                  ])
                }}
              >
                <SearchCode />
                <span className="sr-only">查看报告</span>
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <ChevronsUpDown />
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          {output?.status === 'running' ? (
            <Progress value={getProgress()} className="h-2" />
          ) : output?.status === 'cancel' ? (
            <div className="flex items-center gap-2 text-xs">
              <AlertCircle className="text-destructive h-4 w-4" />
              <p>{output.message}</p>
            </div>
          ) : output?.status === 'success' ? (
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
              <p>{output.message}</p>
            </div>
          ) : output?.status === 'failure' ? (
            <div className="flex items-center gap-2 text-xs">
              <AlertCircle className="text-destructive h-4 w-4" />
              <p>{output.message}</p>
            </div>
          ) : (
            <Progress value={getProgress()} className="h-2" />
          )}
        </div>
        <CollapsibleContent className="flex flex-col gap-2">
          {/* 执行步骤列表 */}
          <div className="max-h-64 space-y-2">
            {output.progress.map((progress, index) => {
              const Icon = getStatusIcon(progress.status)
              const isLatest = index === output.progress.length - 1
              const isError = progress.status === 'TASK_ERROR'
              const isComplete =
                progress.status.includes('COMPLETE') ||
                progress.status === 'TASK_COMPLETE'

              return (
                <div key={index} className="flex items-start gap-2">
                  <div
                    className={`mt-0.5 flex-shrink-0 ${
                      isError
                        ? 'text-destructive'
                        : isComplete
                          ? 'text-green-600'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {isLatest && isRunning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-xs',
                        isError ? 'text-destructive' : 'text-foreground',
                      )}
                    >
                      {progress.message}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
