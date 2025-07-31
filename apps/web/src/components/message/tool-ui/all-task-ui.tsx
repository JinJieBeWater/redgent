import type { AppToolUI, AppUIDataTypes } from '@core/shared'
import type { UIMessagePart } from 'ai'
import { useEffect } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useSubscription } from '@trpc/tanstack-react-query'
import { Spinner } from '@web/components/spinner'
import { TaskMini } from '@web/components/task/task-list'
import { Badge } from '@web/components/ui/badge'
import { Button } from '@web/components/ui/button'
import { useChatContext } from '@web/contexts/chat-context'
import { trpc } from '@web/router'
import { generateId } from 'ai'
import { ChevronDown, Hash, List } from 'lucide-react'

import { ErrorMessage, LoadingMessage } from './common'

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
  const { data: subscripttionData, status: subscripttionStatus } =
    useSubscription(trpc.task.execute.subscribe.subscriptionOptions({}))
  useEffect(() => {
    console.log('subscripttionStatus', subscripttionStatus)
    console.log('subscripttionData', subscripttionData)
  }, [subscripttionData, subscripttionStatus])

  const { messages, setMessages } = useChatContext()

  const isPending = taskListPending
  if (isPending) {
    return <LoadingMessage />
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
        <div className="grid grid-cols-1 gap-2">
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
