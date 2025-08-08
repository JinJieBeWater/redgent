import type { ComponentProps } from 'react'
import { memo } from 'react'
import { Ban, Eye, Pause, Play } from 'lucide-react'

import type { TaskModel, TaskStatus } from '@redgent/db'

import { Badge } from './ui/badge'
import { Button } from './ui/button'

// Mini 组件只需要的字段
type TaskMini = Pick<TaskModel, 'id' | 'name' | 'status'>

// 根据任务状态确定状态信息
export const getStatusInfo = (
  status: TaskStatus,
): {
  variant: 'default' | 'secondary' | 'outline' | 'destructive'
  icon: React.ComponentType<React.SVGAttributes<SVGElement>>
  label: string
} => {
  switch (status) {
    case 'active':
      return { variant: 'default', icon: Pause, label: '激活中' }
    case 'paused':
      return { variant: 'secondary', icon: Play, label: '暂停中' }
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
        className="w-full items-center transition-all duration-150 active:scale-[0.98]"
        {...props}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Eye className="text-muted-foreground h-4 w-4 flex-shrink-0" />
          <h3
            className="text-foreground truncate text-sm font-medium"
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
