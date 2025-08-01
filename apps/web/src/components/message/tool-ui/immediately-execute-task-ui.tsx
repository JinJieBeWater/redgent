import type { AppMessage, AppToolUI, AppUIDataTypes } from '@core/shared'
import type { UIMessagePart } from 'ai'
import { useEffect, useState } from 'react'
import { useSubscription } from '@trpc/tanstack-react-query'
import { Progress } from '@web/components/ui/progress'
import { trpc } from '@web/router'
import {
  AlertCircle,
  Brain,
  CheckCircle,
  Download,
  FileText,
  Filter,
  Info,
  Loader2,
  Play,
  Search,
  XCircle,
} from 'lucide-react'
import z from 'zod'

import type { ExecuteSubscribeOutputSchema } from '@redgent/shared'

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

export const ImmediatelyExecuteTaskUI = ({
  part,
}: {
  message: AppMessage
  part: UIMessagePart<AppUIDataTypes, AppToolUI>
}) => {
  if (part.type !== 'tool-ImmediatelyExecuteTask') return null

  const { input } = part

  const { data } = useSubscription(
    trpc.task.execute.subscribe.subscriptionOptions({}),
  )
  const [executeHistory, setExecuteHistory] =
    useState<z.infer<typeof ExecuteSubscribeOutputSchema>[]>()

  const output = (data as any)?.data as z.infer<
    typeof ExecuteSubscribeOutputSchema
  >

  useEffect(() => {
    if (output?.taskId === input?.taskId) {
      // 避免重复添加相同的执行记录
      const exists = executeHistory?.some(
        item =>
          item.taskId === output.taskId &&
          item.progress.status === output.progress.status,
      )
      setExecuteHistory(prev => {
        if (exists) return prev
        return [...(prev || []), output]
      })
    }
  }, [output, input?.taskId, executeHistory])

  const latestHistory = executeHistory?.[executeHistory.length - 1]

  // 计算整体进度
  const getProgress = () => {
    if (!latestHistory) return 0
    const status = latestHistory.progress.status

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

  // 判断是否正在进行中
  const isInProgress =
    latestHistory &&
    !['TASK_COMPLETE', 'TASK_CANCEL', 'TASK_ERROR'].includes(
      latestHistory.progress.status,
    )

  if (!executeHistory?.length) {
    return (
      <div className="rounded-lg border p-3">
        <div className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>等待任务执行...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border p-3">
      {/* 任务标题和进度 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{latestHistory?.name || '任务执行'}</h3>
          <div className="text-muted-foreground text-sm">{getProgress()}%</div>
        </div>
        <Progress value={getProgress()} className="h-2" />
      </div>

      {/* 执行步骤列表 */}
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {executeHistory.map((item, index) => {
          const Icon = getStatusIcon(item.progress.status)
          const isLatest = index === executeHistory.length - 1
          const isError = item.progress.status === 'TASK_ERROR'
          const isComplete =
            item.progress.status.includes('COMPLETE') ||
            item.progress.status === 'TASK_COMPLETE'

          return (
            <div key={index} className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex-shrink-0 ${
                  isError
                    ? 'text-destructive'
                    : isComplete
                      ? 'text-green-600'
                      : 'text-muted-foreground'
                }`}
              >
                {isLatest && isInProgress ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm ${
                    isError ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  {item.progress.message}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
