import type { AppToolUI, AppUIDataTypes } from '@core/shared'
import type { UIMessagePart } from 'ai'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Spinner } from '@web/components/spinner'
import { Badge } from '@web/components/ui/badge'
import { Button } from '@web/components/ui/button'
import { formatRelativeTime } from '@web/lib/format-relative-time'
import { trpc } from '@web/router'
import { ChevronDown, FileText, Hash } from 'lucide-react'

import { ErrorMessage } from './common'

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
