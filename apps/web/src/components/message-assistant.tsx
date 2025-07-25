import type {
  ToolUIPart,
  UIDataTypes,
  UIMessage,
  UIMessagePart,
  UITools,
} from 'ai'
import { Clock, Eye, FileText, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'

import type { APPUITools, APPUIToolType } from '@redgent/types'

import { formatRelativeTime } from '@/lib/format-relative-time'

import { MarkdownRenderer } from './markdown'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

export const MessageToolCall = ({ part }: { part: ToolUIPart<APPUITools> }) => {
  if (!part.type.startsWith('tool')) return null
  // 去除前缀
  const toolName = part.type.slice(5) as APPUIToolType

  switch (toolName) {
    case 'listAllTasks':
      return <MessageListAllTasks part={part} />
    case 'createTask':
      return <MessageCreateTask part={part} />
    case 'updateTask':
      return <MessageUpdateTask part={part} />
    case 'validateTaskConfig':
      return null
    default:
      return toast.error(`未知的工具: ${toolName}`)
  }
}

const MessageListAllTasks = ({ part }: { part: ToolUIPart<APPUITools> }) => {
  const { output, type } = part
  if (type !== 'tool-listAllTasks' || !output) return null
  const { data } = output
  function handleTaskAction() {
    throw new Error('Function not implemented.')
  }

  return (
    <>
      {data?.map(task => (
        <div
          key={task.id}
          className="bg-card hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-lg border p-4 transition-all duration-150 active:scale-[0.98]"
          onClick={() => {
            console.log(`Navigate to report detail: ${task.id}`)
          }}
        >
          {/* 顶部：图标 + 标题 + 操作菜单 */}
          <div className="mb-3 flex items-start justify-between">
            <div className="flex min-w-0 flex-1 items-start space-x-2">
              <FileText className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
              <h3 className="text-foreground text-sm leading-tight font-medium">
                {task.name}
              </h3>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 h-6 w-6 flex-shrink-0"
                  onClick={e => {
                    e.stopPropagation()
                  }}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation()
                    handleTaskAction()
                  }}
                >
                  <Eye className="mr-2 h-3 w-3" />
                  查看详情
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 报告摘要 */}
          {/* <p className="text-muted-foreground mb-3 line-clamp-2 text-xs leading-relaxed">
            {task.content.summary}
          </p> */}

          {/* 底部：创建时间 + 所属任务 */}
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <div className="flex items-center">
              <Clock className="mr-1 h-3 w-3" />
              <span>{formatRelativeTime(task.createdAt)}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {task.name}
            </Badge>
          </div>
        </div>
      ))}
      {data?.length === 0 && (
        <MarkdownRenderer content="暂无任务，请创建任务后再查看" />
      )}
    </>
  )
}

const MessageCreateTask = ({
  part,
}: {
  part: UIMessagePart<UIDataTypes, UITools>
}) => {
  return <div>CreateTaskMessage: {JSON.stringify(part)}</div>
}

const MessageUpdateTask = ({
  part,
}: {
  part: UIMessagePart<UIDataTypes, UITools>
}) => {
  return <div>UpdateTaskMessage: {JSON.stringify(part)}</div>
}

export const MessageAssistant = ({
  message,
}: {
  message: UIMessage<unknown, UIDataTypes, APPUITools>
}) => {
  if (message.role !== 'assistant') {
    return null
  }

  const { parts } = message

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <MarkdownRenderer key={index} content={part.text} />
        } else if (part.type.startsWith('tool')) {
          // @ts-ignore
          return <MessageToolCall key={index} part={part} />
        } else if (part.type === 'step-start') {
          return null
        } else {
          return (
            <MarkdownRenderer
              key={index}
              content={'未知的消息类型: ' + part.type}
            />
          )
        }
      })}
    </>
  )
}
