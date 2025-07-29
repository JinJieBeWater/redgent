import type { AppToolUI, AppUIDataTypes } from '@core/shared'
import type { UIMessagePart } from 'ai'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useChatContext } from '@web/contexts/chat-context'
import { trpc } from '@web/router'
import { generateId } from 'ai'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Hash,
  List,
} from 'lucide-react'

import { Spinner } from '../spinner'
import { TaskMini } from '../task/task-list'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

export const TaskListToolUI = ({
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
        limit: 2,
      },
      {
        getNextPageParam: lastPage => lastPage.nextCursor,
      },
    ),
  )

  const { data: taskCount, isPending: taskCountPending } = useQuery(
    trpc.task.count.queryOptions(),
  )

  const { messages, setMessages } = useChatContext()

  const isPending = taskListPending || taskCountPending
  if (isPending) {
    return <Spinner />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 py-8">
        <div className="flex items-center gap-2">
          <AlertCircle className="text-destructive" />
          <p>任务列表加载失败: {error.message}</p>
        </div>
      </div>
    )
  }

  // 合并所有页面的任务数据
  const allTasks = data?.pages.flatMap(page => page.tasks) ?? []

  return (
    <div className="space-y-3">
      {/* 任务列表标题 */}
      <div className="flex items-center gap-2 pb-2">
        <List className="text-muted-foreground h-4 w-4" />
        <span className="text-foreground text-sm font-medium">任务列表</span>
        {allTasks.length > 0 && (
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <Hash className="h-3 w-3" />
            {taskCount}
          </Badge>
        )}
      </div>

      {/* 任务列表 */}
      {allTasks.length > 0 ? (
        <div className="space-y-2">
          {allTasks.map(task => (
            <TaskMini
              key={task.id}
              task={task}
              onClick={() => {
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

      {/* 加载完成提示 */}
      {!hasNextPage && allTasks.length > 0 && (
        <div className="border-border/50 flex justify-center border-t pt-2">
          <Badge
            variant="secondary"
            className="flex items-center gap-1 text-xs"
          >
            <CheckCircle2 className="h-3 w-3" />
            已全部加载
          </Badge>
        </div>
      )}
    </div>
  )
}
