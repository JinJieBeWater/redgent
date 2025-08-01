import type { AppMessage, AppToolUI, AppUIDataTypes } from '@core/shared'
import type { UIMessagePart } from 'ai'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@web/components/ui/badge'
import { useChatContext } from '@web/contexts/chat-context'
import { formatRelativeTime } from '@web/lib/format-relative-time'
import { trpc } from '@web/router'
import { generateId } from 'ai'
import { Calendar, Clock, ExternalLink, FileText, List } from 'lucide-react'

import { ErrorMessage, LoadingMessage } from './common'

export const ReportUI = ({
  part,
}: {
  message: AppMessage
  part: UIMessagePart<AppUIDataTypes, AppToolUI>
}) => {
  if (part.type !== 'tool-ShowReportUI') return null

  const { input } = part
  if (!input?.id) return null

  const { data, isPending, isError, error } = useQuery(
    trpc.report.byId.queryOptions(
      { id: input.id },
      {
        staleTime: 1000,
        initialData: part.output?.report,
      },
    ),
  )

  if (isPending) {
    return <LoadingMessage />
  }

  if (isError) {
    return <ErrorMessage error={error} />
  }

  if (!data) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <FileText className="h-4 w-4" />
        <span>报告不存在</span>
      </div>
    )
  }

  const { content } = data
  const findings = content?.findings || []

  const { setMessages, messages } = useChatContext()

  return (
    <div className="space-y-4">
      {/* 报告标题和基本信息 */}
      <div className="space-y-3">
        <div className="flex-1 space-y-2">
          <h3 className="text-base font-medium leading-relaxed">
            {data.title || '未命名报告'}
          </h3>

          {/* 报告元信息 */}
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            {data.task?.name && (
              <Badge
                variant="secondary"
                className="cursor-pointer text-xs"
                onClick={() => {
                  setMessages([
                    ...messages,
                    {
                      id: generateId(),
                      role: 'user',
                      parts: [
                        {
                          type: 'text',
                          text: `查看任务 "${data.task.name}"`,
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
                            taskId: data.taskId,
                          },
                        },
                      ],
                    },
                  ])
                }}
              >
                {data.task.name}
              </Badge>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>创建时间：{formatRelativeTime(data.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                执行时间：{(data.executionDuration / 1000).toFixed(1)}s
              </span>
            </div>
          </div>

          {/* 发现数量统计 */}
          <div className="flex items-center gap-2">
            <List className="text-muted-foreground h-3 w-3" />
            <span className="text-sm font-medium">分析发现</span>
            <Badge variant="outline" className="text-xs">
              {findings.length} 项
            </Badge>
          </div>
        </div>
      </div>

      {/* 分析发现列表 */}
      {findings.length > 0 ? (
        <div className="-ml-8 space-y-3">
          {findings.map((finding, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-start gap-3">
                <Badge
                  variant="secondary"
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 text-xs font-medium"
                >
                  {index + 1}
                </Badge>
                <div className="flex-1">
                  <p className="text-foreground text-sm leading-relaxed">
                    {finding.elaboration}
                  </p>
                  {/* 相关链接 */}
                  {finding.supportingLinkIds &&
                    finding.supportingLinkIds.length > 0 && (
                      <div className="mt-1">
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                          <span className="shrink-0">相关链接</span>
                          {finding.supportingLinkIds.map((id, index) => (
                            <Badge variant="outline" key={index}>
                              <a
                                href={`https://www.reddit.com/comments/${id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs hover:underline"
                              >
                                {`${id}`}
                                <ExternalLink className="h-3 w-3" />
                                <span className="sr-only">打开链接</span>
                              </a>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground flex flex-col items-center gap-2 text-center">
          <p className="text-sm">此报告无任何发现</p>
        </div>
      )}
    </div>
  )
}
