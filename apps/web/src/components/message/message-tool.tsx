import type { AppToolUI } from '@core/shared'
import type { ToolUIPart } from 'ai'
import { FileText, Loader2 } from 'lucide-react'

import { MarkdownRenderer } from '../markdown'
import { TaskMiniList } from '../task/task-list'

export const MessageShowAllTasks = ({
  part,
}: {
  part: ToolUIPart<AppToolUI>
}) => {
  const { output, type, state } = part
  if (type !== 'tool-ShowAllTaskUI') return null

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

      return <TaskMiniList tasks={data || []} />
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
