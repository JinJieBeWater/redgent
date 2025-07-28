import type { AppTools, AppToolUI } from '@core/shared'
import type { InferToolInput, ToolUIPart } from 'ai'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { trpc } from '@web/router'
import { FileText } from 'lucide-react'

import { MarkdownRenderer } from '../markdown'
import { Spinner } from '../spinner'
import { TaskMiniList } from '../task/task-list'

export const MessageShowAllTaskUI = ({
  part,
}: {
  part: ToolUIPart<AppToolUI>
}) => {
  const { input, type, state } = part
  if (type !== 'tool-ShowAllTaskUI') return null
  switch (state) {
    case 'input-streaming':
      return <Spinner />
    case 'input-available': {
      if (!input) return null

      return <ShowAllTaskUI input={input} />
    }
    case 'output-available':
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

export const ShowAllTaskUI = ({
  input,
}: {
  input: InferToolInput<AppTools['ShowAllTaskUI']>
}) => {
  const [take] = useState(10)
  const [skip] = useState(0)
  const { data, isPending, isError, error } = useQuery(
    trpc.task.paginate.queryOptions({
      take,
      skip,
      status: input.status,
    }),
  )

  if (isPending) {
    return <Spinner />
  }

  if (isError) {
    return <MarkdownRenderer content={`发生错误：${error.message}`} />
  }

  return <TaskMiniList tasks={data.tasks} />
}
