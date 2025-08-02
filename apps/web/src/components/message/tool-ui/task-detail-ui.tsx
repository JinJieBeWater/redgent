import type { AppMessage, AppToolUI, AppUIDataTypes } from '@core/shared'
import type { UIMessagePart } from 'ai'
import { useEffect, useMemo } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Spinner } from '@web/components/spinner'
import { getStatusInfo } from '@web/components/task/task-list'
import { Badge } from '@web/components/ui/badge'
import { Button } from '@web/components/ui/button'
import { Card, CardContent, CardTitle } from '@web/components/ui/card'
import { useChatContext } from '@web/contexts/chat-context'
import { formatIntervalTime } from '@web/lib/format-interval-time'
import { formatRelativeTime } from '@web/lib/format-relative-time'
import { cn } from '@web/lib/utils'
import { trpc } from '@web/router'
import { generateId } from 'ai'
import cronstrue from 'cronstrue'
import {
  AlertCircle,
  ChevronDown,
  Clock,
  FileText,
  Hash,
  Play,
} from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import type { TaskReportMiniSchema } from '@redgent/shared'

import { ErrorMessage, LoadingMessage } from './common'

export const TaskDetailUI = ({
  part,
}: {
  message: AppMessage
  part: Extract<
    UIMessagePart<AppUIDataTypes, AppToolUI>,
    {
      type: 'tool-ShowTaskDetailUI'
      state: 'input-available' | 'output-available'
    }
  >
}) => {
  const { input } = part

  const { sendMessage, addToolResult, setMessages, messages, status } =
    useChatContext()

  // 获取任务详情
  const {
    data: task,
    isPending: taskPending,
    isError: taskError,
    error: taskErrorMessage,
  } = useQuery(
    trpc.task.detail.queryOptions(
      { id: input.taskId },
      {
        initialData: part.output?.task,
        staleTime: 1000,
      },
    ),
  )

  // 获取任务的报告列表
  const {
    data: reportsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending: reportsPending,
    isError: reportsError,
    error: reportsErrorMessage,
  } = useInfiniteQuery(
    trpc.report.paginateByTaskId.infiniteQueryOptions(
      {
        taskId: input.taskId,
        limit: 4,
      },
      {
        getNextPageParam: lastPage => lastPage.nextCursor,
        staleTime: 1000,
        initialData:
          part.state === 'output-available'
            ? {
                pages: [part.output.page],
                pageParams: [],
              }
            : undefined,
      },
    ),
  )

  const allReports = useMemo(() => {
    return reportsData?.pages.flatMap(page => page.reports) ?? []
  }, [reportsData?.pages])
  const totalCount = useMemo(() => {
    return reportsData?.pages[reportsData.pages.length - 1]?.total ?? 0
  }, [reportsData?.pages])
  const nextCursor = useMemo(() => {
    return reportsData?.pages[reportsData.pages.length - 1]?.nextCursor
  }, [reportsData?.pages])

  // 订阅最新的数据 维护对应 part 的 output
  useEffect(() => {
    if (allReports.length === 0 || !task) return
    addToolResult({
      tool: 'ShowTaskDetailUI',
      toolCallId: part.toolCallId,
      output: {
        task,
        page: {
          reports: allReports,
          total: totalCount,
          nextCursor: nextCursor,
        },
      },
    })
  }, [allReports, totalCount, nextCursor, task, addToolResult, part.toolCallId])

  if (taskPending || reportsPending) {
    return <LoadingMessage />
  }

  if (taskError) {
    return <ErrorMessage error={taskErrorMessage} />
  }

  if (!task) {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="text-destructive h-4 w-4" />
        <p className="text-sm">任务不存在</p>
      </div>
    )
  }

  const statusInfo = getStatusInfo(task.status)
  const StatusIcon = statusInfo.icon

  /** 处理报告点击事件 */
  const handleReportClick = (report: z.infer<typeof TaskReportMiniSchema>) => {
    // 避免重复添加任务
    const latestMessage = messages[messages.length - 1]
    if (
      latestMessage?.parts[0].type === 'tool-ShowReportUI' &&
      latestMessage.parts[0].input?.id === report.id
    ) {
      return
    }
    setMessages([
      ...messages,
      {
        id: generateId(),
        role: 'user',
        parts: [
          {
            type: 'text',
            text: `查看 "${report.title}" 报告`,
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
              id: report.id,
            },
          },
        ],
      },
    ])
  }

  return (
    <div className="mt-1 space-y-3">
      {/* 任务信息卡片 - 使用 Card 组件 */}
      <Card className="gap-2 px-3 py-3">
        <CardContent className="space-y-3 px-1">
          {/* 任务名称 */}
          <div className="flex items-center justify-between gap-2 text-base">
            <div className="flex flex-1 items-center space-x-2">
              <CardTitle className="truncate">
                {task.name || '未命名任务'}
              </CardTitle>
            </div>
            <Badge
              variant={statusInfo.variant}
              className="ml-2 flex items-center gap-1 text-xs"
            >
              <StatusIcon className="h-4 w-4" />
              {statusInfo.label}
            </Badge>
          </div>

          {/* 任务配置 */}
          <div className="grid grid-flow-col gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-2 truncate text-xs">
              <Clock className="text-muted-foreground h-3 w-3" />
              {task.scheduleType === 'cron'
                ? cronstrue.toString(task.scheduleExpression)
                : formatIntervalTime(Number(task.scheduleExpression))}
            </div>
          </div>

          {/* 执行报告部分 */}
          <div className="flex items-center gap-2">
            <FileText className="text-muted-foreground h-3 w-3" />
            <span className="text-foreground text-xs font-medium">
              {totalCount > 0 ? '最新报告' : '暂无报告'}
            </span>
            {totalCount > 0 && (
              <Badge
                variant="outline"
                className="flex items-center gap-1 text-xs"
              >
                <Hash className="h-2 w-2" />
                {totalCount}
              </Badge>
            )}
          </div>

          {reportsError ? (
            <div className="flex items-center justify-center">
              <ErrorMessage error={reportsErrorMessage} />
            </div>
          ) : (
            allReports.length > 0 && (
              <div>
                <div
                  className={cn(
                    'grid grid-cols-1 gap-2 gap-x-3',
                    allReports.length > 1 && 'md:grid-cols-2',
                  )}
                >
                  {allReports.map((report, index) => (
                    <Button
                      variant={'outline'}
                      key={report.id}
                      size={'sm'}
                      className="text-foreground flex justify-between px-2 text-xs"
                      onClick={() => {
                        handleReportClick(report)
                      }}
                      title={report.title || '未命名报告'}
                    >
                      <div className="line-clamp-1 flex gap-1">
                        <span className="text-muted-foreground">#{index}</span>
                        <span className="truncate">
                          {report.title || '未命名报告'}
                        </span>
                      </div>
                      {/* 创建时间 */}
                      <div className="text-muted-foreground text-xs">
                        {formatRelativeTime(report.createdAt)}
                      </div>
                    </Button>
                  ))}
                </div>

                {/* 加载更多按钮 */}
                {hasNextPage &&
                  reportsData.pages[reportsData.pages.length - 1]?.total >
                    allReports.length && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="flex h-6 items-center gap-1 text-xs"
                      >
                        {isFetchingNextPage ? (
                          <>
                            <Spinner className="h-3 w-3" />
                            加载中
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3" />
                            更多
                          </>
                        )}
                      </Button>
                    </div>
                  )}
              </div>
            )
          )}

          {/* 立即执行任务 */}
          <Button
            size={'sm'}
            className="w-full text-xs"
            onClick={() => {
              if (status === 'ready') {
                sendMessage({
                  text: `立即执行任务 "${task.name}"`,
                })
              } else {
                toast.info('请等待当前任务完成')
              }
            }}
          >
            <Play className="h-4 w-4" />
            立即执行
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
