import type { AppToolUI, AppUIDataTypes } from '@core/shared'
import type { UIMessagePart } from 'ai'
import type z from 'zod'
import { useEffect, useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Spinner } from '@web/components/spinner'
import { Badge } from '@web/components/ui/badge'
import { Button } from '@web/components/ui/button'
import { useChatContext } from '@web/contexts/chat-context'
import { formatRelativeTime } from '@web/lib/format-relative-time'
import { trpc } from '@web/router'
import { generateId } from 'ai'
import { ChevronDown, FileText, Hash } from 'lucide-react'

import type { TaskReportMiniSchema } from '@redgent/shared'

import { ErrorMessage, LoadingMessage } from './common'

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
  // 合并所有页面的报告数据
  const allReports = useMemo(() => {
    return data?.pages.flatMap(page => page.reports) ?? []
  }, [data?.pages])
  const totalCount = useMemo(() => {
    return data?.pages[data.pages.length - 1]?.total ?? 0
  }, [data?.pages])
  const nextCursor = useMemo(() => {
    return data?.pages[data.pages.length - 1]?.nextCursor
  }, [data?.pages])

  const { addToolResult, setMessages, messages } = useChatContext()

  // 订阅最新的数据 维护对应 part 的 output
  useEffect(() => {
    if (allReports.length === 0) return
    addToolResult({
      tool: 'ShowLatestReportUI',
      toolCallId: part.toolCallId,
      output: {
        nextCursor: nextCursor,
        reports: allReports,
        total: totalCount,
      },
    })
  }, [allReports, totalCount, nextCursor])

  const isPending = reportListPending
  if (isPending) {
    return <LoadingMessage />
  }

  if (isError) {
    return <ErrorMessage error={error} />
  }

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
    <div className="space-y-2">
      {/* 报告列表标题 */}
      <div className="flex items-center gap-2">
        <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
        <span className="text-foreground shrink-0 text-sm font-medium">
          最新报告
        </span>
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
              className="text-foreground h-auto flex-col items-start justify-start truncate p-3 text-xs"
              onClick={() => {
                handleReportClick(report)
              }}
            >
              <div
                className="flex w-full items-center gap-2"
                title={report.title || '未命名报告'}
              >
                <span className="text-muted-foreground">#{index + 1}</span>
                <span className="truncate">{report.title || '未命名报告'}</span>
              </div>
              <div className="mt-1 flex w-full items-center gap-2 text-xs">
                {report.task?.name && (
                  <Badge variant="default" className="text-xs">
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
      {hasNextPage && totalCount > allReports.length && (
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
