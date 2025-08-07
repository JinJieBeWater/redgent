import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useSubscription } from '@trpc/tanstack-react-query'
import { queryClient, trpc } from '@web/router'
import { Activity, AlertCircle, Sparkle } from 'lucide-react'
import z from 'zod'

import type { ExecuteSubscribeOutputSchema } from '@redgent/shared'

import { ModeToggle } from './mode-toggle'
import { Button } from './ui/button'

function hasDataProperty(
  obj: unknown,
): obj is { data: z.infer<typeof ExecuteSubscribeOutputSchema> } {
  return typeof obj === 'object' && obj !== null && 'data' in obj
}

export default function Header() {
  const [message, setMessage] = useState('')
  const { data, error, status } = useSubscription(
    trpc.task.execute.subscribe.subscriptionOptions({}),
  )

  useEffect(() => {
    if (status === 'error') {
      setMessage(`网络波动，请尝试刷新页面`)
    } else if (status === 'idle') {
      setMessage('空闲')
    } else if (status === 'pending') {
      if (data && hasDataProperty(data)) {
        const res = data.data
        setMessage(`${res.name} ${res.progress.message}`)
        if (res.progress.status === 'TASK_COMPLETE') {
          const { taskId } = res
          queryClient.invalidateQueries(
            trpc.report.paginateByTaskId.infiniteQueryFilter({
              taskId: taskId,
              limit: 4,
            }),
          )
          queryClient.invalidateQueries(
            trpc.report.paginate.infiniteQueryFilter(),
          )
        }
      }
    }
  }, [status, data, error])
  return (
    <header className="flex max-w-screen items-center justify-between px-4 py-2">
      {/* 新对话 */}
      <nav className="shrink-0 grow-0">
        <Button variant="ghost" className="h-8 w-8" asChild>
          <Link to="/" aria-label="首页">
            <Sparkle className="h-4 w-4" />
          </Link>
        </Button>
      </nav>
      {/* 中间显示激活任务数量 */}
      <nav className="flex grow-1 items-center justify-center">
        <Button variant="ghost" asChild>
          <Link to="/" className="mx-4 flex animate-pulse items-center gap-2">
            {status === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
            {message && (
              <p className="line-clamp-1 max-w-[50vw] truncate">{message}</p>
            )}
          </Link>
        </Button>
      </nav>
      <nav className="shrink-0 grow-0">
        <ModeToggle />
      </nav>
    </header>
  )
}
