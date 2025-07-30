import type { AppToolUI, AppUIDataTypes } from '@core/shared'
import type { UIMessagePart } from 'ai'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Spinner } from '@web/components/spinner'
import { getStatusInfo } from '@web/components/task/task-list'
import { Badge } from '@web/components/ui/badge'
import { Button } from '@web/components/ui/button'
import { Card, CardContent, CardTitle } from '@web/components/ui/card'
import { useChatContext } from '@web/contexts/chat-context'
import { formatIntervalTime } from '@web/lib/format-interval-time'
import { trpc } from '@web/router'
import cronstrue from 'cronstrue'
import {
  AlertCircle,
  ChevronDown,
  Clock,
  FileText,
  Hash,
  Play,
} from 'lucide-react'

import { ErrorMessage } from './common'

export const TaskDetailUI = ({
  part,
}: {
  part: UIMessagePart<AppUIDataTypes, AppToolUI>
}) => {
  if (part.type !== 'tool-ShowTaskDetailUI') return null
  const { input } = part
  if (!input?.taskId) return null

  const { sendMessage } = useChatContext()

  // 获取任务详情
  const {
    data: task,
    isPending: taskPending,
    isError: taskError,
    error: taskErrorMessage,
  } = useQuery(trpc.task.detail.queryOptions({ id: input.taskId }))

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
      },
    ),
  )

  const allReports = reportsData?.pages.flatMap(page => page.reports) ?? []
  const totalCount =
    reportsData?.pages[reportsData.pages.length - 1]?.total ?? 0

  if (taskPending || reportsPending) {
    return <Spinner />
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
            <div className="flex items-center gap-1 truncate text-xs">
              <Clock className="text-muted-foreground h-3 w-3" />
              {task.scheduleType === 'cron'
                ? cronstrue.toString(task.scheduleExpression, {
                    locale: 'zh_CN',
                  })
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
                <div className="grid grid-cols-1 gap-2 gap-x-3 md:grid-cols-2">
                  {allReports.map((report, index) => (
                    <Button
                      variant={'outline'}
                      key={report.id}
                      size={'sm'}
                      className="text-foreground justify-start px-2 text-xs"
                    >
                      <span>#{index}</span>
                      <span className="truncate">{report.title}</span>
                    </Button>
                  ))}
                </div>

                {/* 加载更多按钮 */}
                {hasNextPage && (
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
                          <Spinner />
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
              sendMessage({
                text: `立即执行任务 ${task.name}`,
              })
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
