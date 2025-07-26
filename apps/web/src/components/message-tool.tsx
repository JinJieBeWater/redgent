import type { ToolUIPart, UIDataTypes, UIMessagePart, UITools } from 'ai'
import { memo, useMemo } from 'react'
import {
  Calendar,
  Clock,
  FileText,
  Loader2,
  Pause,
  Play,
  Zap,
} from 'lucide-react'

import type { Task } from '@redgent/db'
import type { APPUITools } from '@redgent/types'

import { formatRelativeTime } from '@/lib/format-relative-time'

import { MarkdownRenderer } from './markdown'
import { Badge } from './ui/badge'

export const TaskCard = memo(({ task }: { task: Task }) => {
  // 根据任务状态确定状态信息
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return { variant: 'default', icon: Play, label: '活跃' }
      case 'paused':
        return { variant: 'secondary', icon: Pause, label: '暂停' }
      case 'running':
        return { variant: 'outline', icon: Zap, label: '运行中' }
      default:
        return { variant: 'default', icon: Play, label: '活跃' }
    }
  }

  const statusInfo = getStatusInfo(task.status || 'active')
  const StatusIcon = statusInfo.icon

  return (
    <div
      key={task.id}
      className="bg-card hover:bg-accent hover:text-accent-foreground flex min-h-[120px] cursor-pointer flex-col justify-between rounded-lg border p-5 transition-all duration-150 active:scale-[0.98]"
    >
      {/* 头部 - 任务名称 */}
      <div className="mb-4 flex items-start space-x-3">
        <FileText className="text-muted-foreground mt-1 h-5 w-5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h3
            className="text-foreground mb-1 line-clamp-1 text-base font-semibold leading-tight"
            title={task.name}
          >
            {task.name || '未命名任务'}
          </h3>
          <p
            className="text-muted-foreground line-clamp-2 text-sm leading-relaxed"
            title={task.prompt}
          >
            {task.prompt || '暂无描述'}
          </p>
        </div>
      </div>

      {/* 底部 - 调度信息和状态 */}
      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Calendar className="mr-1.5 h-4 w-4" />
            <span className="capitalize">{task.scheduleType}</span>
          </div>
          <div className="flex items-center">
            <Clock className="mr-1.5 h-4 w-4" />
            <span>{formatRelativeTime(task.createdAt)}</span>
          </div>
          {task.lastExecutedAt && (
            <div className="text-xs">
              最后执行: {formatRelativeTime(task.lastExecutedAt)}
            </div>
          )}
        </div>
        <Badge
          variant={statusInfo.variant as any}
          className="flex items-center gap-1 text-xs"
        >
          <StatusIcon className="h-3 w-3" />
          {statusInfo.label}
        </Badge>
      </div>
    </div>
  )
})

export const MessageListAllTasks = ({
  part,
}: {
  part: ToolUIPart<APPUITools>
}) => {
  const { output, type, state } = part
  if (type !== 'tool-listAllTasks') return null

  switch (state) {
    case 'input-streaming':
    case 'input-available': {
      // 加载中
      return (
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-sm">加载中...</span>
        </div>
      )
    }
    case 'output-available': {
      if (!output) return null

      const { data } = output

      const emptyState = useMemo(() => {
        if (data?.length === 0) {
          return (
            <>
              <FileText className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <MarkdownRenderer content="暂无任务，请创建任务后再查看" />
            </>
          )
        }
        return null
      }, [data?.length])

      return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {state === 'output-available'}
          {data?.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
          {emptyState}
        </div>
      )
    }
    case 'output-error':
      return (
        <div className="flex items-center justify-center">
          <FileText className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <MarkdownRenderer content="发生错误，请重试！" />
        </div>
      )
    default:
      return null
  }
}

export const MessageCreateTask = ({
  part,
}: {
  part: UIMessagePart<UIDataTypes, UITools>
}) => {
  return <div>CreateTaskMessage: {JSON.stringify(part)}</div>
}

export const MessageUpdateTask = ({
  part,
}: {
  part: UIMessagePart<UIDataTypes, UITools>
}) => {
  return <div>UpdateTaskMessage: {JSON.stringify(part)}</div>
}
