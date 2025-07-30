import type { ComponentProps } from 'react'
import { memo } from 'react'
import { formatRelativeTime } from '@web/lib/format-relative-time'
import {
  Ban,
  Calendar,
  Clock,
  Eye,
  FileText,
  Pause,
  Play,
  Zap,
} from 'lucide-react'

import type { Task } from '@redgent/db'

import { MarkdownRenderer } from '../markdown'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

// Mini 组件只需要的字段
type TaskMini = Pick<Task, 'id' | 'name' | 'status'>

// 根据任务状态确定状态信息
export const getStatusInfo = (
  status: string,
): {
  variant: 'default' | 'secondary' | 'outline' | 'destructive'
  icon: React.ComponentType<React.SVGAttributes<SVGElement>>
  label: string
} => {
  switch (status) {
    case 'active':
      return { variant: 'default', icon: Pause, label: '活跃' }
    case 'paused':
      return { variant: 'secondary', icon: Play, label: '暂停' }
    case 'running':
      return { variant: 'outline', icon: Zap, label: '运行中' }
    default:
      return { variant: 'destructive', icon: Ban, label: '未知' }
  }
}

export const TaskMini = memo(
  ({ task, ...props }: ComponentProps<'button'> & { task: TaskMini }) => {
    const statusInfo = getStatusInfo(task.status || 'active')
    const StatusIcon = statusInfo.icon

    return (
      <Button
        variant={'outline'}
        className="w-full items-center px-2 transition-all duration-150 active:scale-[0.98]"
        {...props}
      >
        <div className="flex min-w-0 flex-1 items-center space-x-2">
          <Eye className="text-muted-foreground h-4 w-4 flex-shrink-0" />
          <h3
            className="text-foreground line-clamp-1 text-sm font-medium"
            title={task.name}
          >
            {task.name || '未命名任务'}
          </h3>
        </div>
        <Badge
          variant={statusInfo.variant}
          className="ml-2 flex flex-shrink-0 items-center gap-1 text-xs"
        >
          <StatusIcon className="h-3 w-3" />
          {statusInfo.label}
        </Badge>
      </Button>
    )
  },
)

export const TaskCard = memo(({ task }: { task: Task }) => {
  const statusInfo = getStatusInfo(task.status || 'active')
  const StatusIcon = statusInfo.icon

  return (
    <div
      key={task.id}
      className="bg-card hover:bg-accent hover:text-accent-foreground flex min-h-[120px] cursor-pointer flex-col justify-between rounded-lg border p-5 transition-all duration-150 active:scale-[0.98]"
    >
      {/* 头部 - 任务名称 */}
      <div className="mb-4 flex items-start space-x-3">
        <Eye className="text-muted-foreground mt-1 h-5 w-5 flex-shrink-0" />
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
          <div className="flex align-middle">
            <Calendar className="mr-1.5 h-4 w-4" />
            <span className="capitalize leading-4">{task.scheduleType}</span>
          </div>
          <div className="flex align-middle">
            <Clock className="mr-1.5 h-4 w-4" />
            {task.lastExecutedAt ? (
              <span className="leading-4">
                最后执行: {formatRelativeTime(task.lastExecutedAt)}
              </span>
            ) : (
              <span className="leading-4">
                创建: {formatRelativeTime(task.createdAt)}
              </span>
            )}
          </div>
        </div>
        <Badge
          variant={statusInfo.variant}
          className="flex items-center gap-1 text-xs"
        >
          <StatusIcon className="h-3 w-3" />
          {statusInfo.label}
        </Badge>
      </div>
    </div>
  )
})

export const TaskCardList = ({ tasks }: { tasks: Task[] }) => {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="py-12 text-center">
        <FileText className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <MarkdownRenderer content="暂无任务，请创建任务后再查看" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  )
}
