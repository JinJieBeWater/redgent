import type { AppToolUI, AppUIDataTypes } from '@core/shared'
import type { UIMessagePart } from 'ai'
import type { ComponentProps } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useChatContext } from '@web/contexts/chat-context'
import { formatRelativeTime } from '@web/lib/format-relative-time'
import { trpc } from '@web/router'
import { generateId } from 'ai'
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  Clock,
  Eye,
  FileText,
  Hash,
  List,
  Settings,
} from 'lucide-react'

import { Spinner } from '../spinner'
import { getStatusInfo, TaskMini } from '../task/task-list'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardTitle } from '../ui/card'

// 错误显示组件
const ErrorMessage = ({
  error,
  ...props
}: ComponentProps<'div'> & {
  error?: {
    message?: string
  } | null
}) => (
  <div className="mt-2.5 flex items-center gap-2" {...props}>
    <AlertCircle className="h-4 w-4" />
    <p>加载失败: {error?.message}</p>
  </div>
)

export const LatestReportUI = ({
  part,
}: {
  part: UIMessagePart<AppUIDataTypes, AppToolUI>
}) => {
  if (part.type !== 'tool-ShowLatestReportUI') return null

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending: reportListPending,
    isError,
    error,
  } = useInfiniteQuery(
    trpc.report.paginate.infiniteQueryOptions(
      {
        limit: 4,
      },
      {
        getNextPageParam: lastPage => lastPage.nextCursor,
      },
    ),
  )

  const isPending = reportListPending
  if (isPending) {
    return <Spinner />
  }

  if (isError) {
    return <ErrorMessage error={error} />
  }

  // 合并所有页面的报告数据
  const allReports = data?.pages.flatMap(page => page.reports) ?? []
  const totalCount = data?.pages[data.pages.length - 1]?.total ?? 0

  return (
    <div className="space-y-2">
      {/* 报告列表标题 */}
      <div className="flex items-center gap-2">
        <FileText className="text-muted-foreground h-4 w-4" />
        <span className="text-foreground text-sm font-medium">最新报告</span>
        {allReports.length > 0 && (
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <Hash className="h-3 w-3" />
            {totalCount}
          </Badge>
        )}
      </div>

      {/* 报告列表 */}
      {allReports.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 gap-x-3 md:grid-cols-2">
          {allReports.map((report, index) => (
            <Button
              variant={'outline'}
              key={report.id}
              size={'sm'}
              className="text-foreground h-auto flex-col items-start justify-start px-2 py-2 text-xs"
            >
              <div className="flex w-full items-center gap-2">
                <span>#{index + 1}</span>
                <span className="truncate">{report.title || '未命名报告'}</span>
              </div>
              <div className="mt-1 flex w-full items-center gap-2 text-xs">
                {report.task?.name && (
                  <Badge variant="secondary" className="text-xs">
                    {report.task.name}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {formatRelativeTime(report.createdAt)}
                </Badge>
              </div>
            </Button>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <p className="text-muted-foreground text-sm">暂无报告</p>
        </div>
      )}

      {/* 加载更多按钮 */}
      {hasNextPage && (
        <div className="border-border/50 flex justify-center border-t pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 text-xs"
          >
            {isFetchingNextPage ? (
              <>
                <Spinner />
                加载中...
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                加载更多
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

export const AllTaskUI = ({
  part,
}: {
  part: UIMessagePart<AppUIDataTypes, AppToolUI>
}) => {
  if (part.type !== 'tool-ShowAllTaskUI') return null
  const { input } = part
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending: taskListPending,
    isError,
    error,
  } = useInfiniteQuery(
    trpc.task.paginate.infiniteQueryOptions(
      {
        status: input?.status,
      },
      {
        getNextPageParam: lastPage => lastPage.nextCursor,
      },
    ),
  )

  const { messages, setMessages } = useChatContext()

  const isPending = taskListPending
  if (isPending) {
    return <Spinner />
  }

  if (isError) {
    return <ErrorMessage error={error} />
  }

  // 合并所有页面的任务数据
  const allTasks = data?.pages.flatMap(page => page.tasks) ?? []
  const totalCount = data?.pages[data.pages.length - 1]?.total ?? 0

  /** 处理任务点击事件 */
  const handleTaskClick = (task: (typeof allTasks)[number]) => {
    // 避免重复添加任务
    const latestMessage = messages[messages.length - 1]
    if (
      latestMessage?.parts[0].type === 'tool-ShowTaskDetailUI' &&
      latestMessage.parts[0].input?.taskId === task.id
    ) {
      return
    }
    setMessages([
      ...messages,
      {
        role: 'assistant',
        id: generateId(),
        parts: [
          {
            type: 'tool-ShowTaskDetailUI',
            state: 'input-available',
            toolCallId: generateId(),
            input: {
              taskId: task.id,
            },
          },
        ],
      },
    ])
  }

  return (
    <div className="space-y-2">
      {/* 任务列表标题 */}
      <div className="flex items-center gap-2">
        <List className="text-muted-foreground h-4 w-4" />
        <span className="text-foreground text-sm font-medium">任务列表</span>
        {allTasks.length > 0 && (
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <Hash className="h-3 w-3" />
            {totalCount}
          </Badge>
        )}
      </div>

      {/* 任务列表 */}
      {allTasks.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {allTasks.map(task => (
            <TaskMini
              key={task.id}
              task={task}
              onClick={() => {
                handleTaskClick(task)
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          <p>暂无任务</p>
        </div>
      )}

      {/* 加载更多按钮 */}
      {hasNextPage && (
        <div className="border-border/50 flex justify-center border-t pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 text-xs"
          >
            {isFetchingNextPage ? (
              <>
                <Spinner />
                加载中...
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                加载更多
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

export const TaskDetailUI = ({
  part,
}: {
  part: UIMessagePart<AppUIDataTypes, AppToolUI>
}) => {
  if (part.type !== 'tool-ShowTaskDetailUI') return null
  const { input } = part
  if (!input?.taskId) return null

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

  const statusInfo = getStatusInfo(task.status || 'active')
  const StatusIcon = statusInfo.icon

  return (
    <div className="mt-1 space-y-3">
      {/* 任务信息卡片 - 使用 Card 组件 */}
      <Card className="gap-2 px-3 py-3">
        <CardContent className="space-y-2 px-1">
          {/* 任务名称 */}
          <div className="flex items-center justify-between pb-2">
            <div className="flex flex-1 items-center space-x-2">
              <Eye className="h-4 w-4 flex-shrink-0" />
              <CardTitle className="text-nowrap text-base font-semibold">
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

          {/* 调度信息 - 优化布局 */}
          <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center">
              <Calendar className="mr-1 h-3 w-3" />
              <span className="capitalize">{task.scheduleType}</span>
            </div>
            <div className="flex items-center">
              <Clock className="mr-1 h-3 w-3" />
              <span>
                {task.lastExecutedAt
                  ? formatRelativeTime(task.lastExecutedAt)
                  : formatRelativeTime(task.createdAt)}
              </span>
            </div>
            <div className="flex items-center">
              <Settings className="mr-1 h-3 w-3" />
              <span className="font-mono">{task.scheduleExpression}</span>
            </div>
          </div>

          {/* 执行报告部分 */}
          <div className="flex items-center gap-2">
            <FileText className="text-muted-foreground h-3 w-3" />
            <span className="text-foreground text-xs font-medium">
              最新报告
            </span>
            {allReports.length > 0 && (
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
          ) : allReports.length > 0 ? (
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
          ) : (
            <div className="py-2 text-center">
              <p className="text-muted-foreground text-xs">暂无报告</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export const RequestUserConsentUI = ({
  part,
}: {
  part: UIMessagePart<AppUIDataTypes, AppToolUI>
}) => {
  if (part.type !== 'tool-RequestUserConsent') return null
  const { input } = part
  if (!input?.message) return null

  return (
    <Card className="border-warning bg-warning/10 gap-2 px-3 py-3">
      <CardContent className="flex items-start gap-2 px-1">
        <AlertCircle className="text-warning h-5 w-5 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <p className="text-foreground text-sm">{input.message}</p>
        </div>
      </CardContent>
    </Card>
  )
}
