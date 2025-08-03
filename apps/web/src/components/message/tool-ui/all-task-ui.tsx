import type { UseChatHelpers } from '@ai-sdk/react'
import type { AppMessage, AppToolUI, AppUIDataTypes } from '@core/shared'
import type { UIMessagePart } from 'ai'
import { memo, useEffect, useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Spinner } from '@web/components/spinner'
import { TaskMini } from '@web/components/task/task-list'
import { Badge } from '@web/components/ui/badge'
import { Button } from '@web/components/ui/button'
import { trpc } from '@web/router'
import { generateId } from 'ai'
import { ChevronDown, Hash, List } from 'lucide-react'

import { ErrorMessage, LoadingMessage } from './common'

export const ImplAllTaskUI = ({
  part,
  setMessages,
  addToolResult,
}: {
  part: Extract<
    UIMessagePart<AppUIDataTypes, AppToolUI>,
    { type: 'tool-ShowAllTaskUI' }
  >
  setMessages: UseChatHelpers<AppMessage>['setMessages']
  addToolResult: UseChatHelpers<AppMessage>['addToolResult']
}) => {
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
        staleTime: 1000,
        initialData:
          part.state === 'output-available'
            ? {
                pages: [part.output],
                pageParams: [],
              }
            : undefined,
      },
    ),
  )

  // 合并所有页面的任务数据
  const allTasks = useMemo(() => {
    return data?.pages.flatMap(page => page.tasks) ?? []
  }, [data?.pages])
  const totalCount = useMemo(() => {
    return data?.pages[data.pages.length - 1]?.total ?? 0
  }, [data?.pages])
  const nextCursor = useMemo(() => {
    return data?.pages[data.pages.length - 1]?.nextCursor
  }, [data?.pages])

  // 订阅最新的数据 维护对应 part 的 output
  useEffect(() => {
    if (allTasks.length === 0) return
    addToolResult({
      tool: 'ShowAllTaskUI',
      toolCallId: part.toolCallId,
      output: {
        nextCursor: nextCursor,
        tasks: allTasks,
        total: totalCount,
      },
    })
  }, [allTasks, totalCount, nextCursor, addToolResult, part.toolCallId])

  const isPending = taskListPending
  if (isPending) {
    return <LoadingMessage />
  }

  if (isError) {
    return <ErrorMessage error={error} />
  }

  /** 处理任务点击事件 */
  const handleTaskClick = (task: (typeof allTasks)[number]) => {
    setMessages(messages => {
      // 避免重复添加任务
      const latestMessage = messages[messages.length - 1]
      if (
        latestMessage?.parts[0].type === 'tool-ShowTaskDetailUI' &&
        latestMessage.parts[0].input?.taskId === task.id
      ) {
        return messages
      }
      return [
        ...messages,
        {
          id: generateId(),
          role: 'user',
          parts: [
            {
              type: 'text',
              text: `查看 "${task.name}" 任务`,
            },
          ],
        },
        {
          id: generateId(),
          role: 'assistant',
          parts: [
            {
              type: 'tool-ShowTaskDetailUI',
              toolCallId: generateId(),
              state: 'input-available',
              input: {
                taskId: task.id,
              },
            },
          ],
        },
      ]
    })
  }

  return (
    <div className="space-y-2">
      {/* 任务列表标题 */}
      <div className="flex items-center gap-2">
        <List className="text-muted-foreground h-4 w-4 shrink-0" />
        <span className="text-foreground shrink-0 text-sm font-medium">
          任务列表
        </span>
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
      {hasNextPage &&
        data.pages[data.pages.length - 1]?.total > allTasks.length && (
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

export const AllTaskUI = memo(ImplAllTaskUI)
