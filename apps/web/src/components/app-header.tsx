import type z from 'zod'
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useSubscription } from '@trpc/tanstack-react-query'
import { trpc } from '@web/router'
import { Activity, Sparkle } from 'lucide-react'

import type { ExecuteSubscribeOutputSchema } from '@redgent/shared'

import { ModeToggle } from './mode-toggle'
import { Spinner } from './spinner'
import { Button } from './ui/button'

export default function Header() {
  const [message, setMessage] = useState('')
  const { data, error, status } = useSubscription(
    trpc.task.execute.subscribe.subscriptionOptions({}),
  )

  useEffect(() => {
    if (status === 'error') {
      setMessage(error.message)
    } else if (status === 'connecting') {
      setMessage('连接中...')
    } else if (status === 'idle') {
      setMessage('空闲')
    } else if (status === 'pending') {
      if (data && (data as any).data) {
        const res = (data as any)?.data as z.infer<
          typeof ExecuteSubscribeOutputSchema
        >
        setMessage(`${res.name} ${res.progress.message}`)
      } else {
        setMessage('监听中...')
      }
    }
  }, [status, data])
  return (
    <header className="max-w-screen flex items-center justify-between px-4 py-2">
      {/* 新对话 */}
      <nav>
        <Button variant="ghost" className="h-8 w-8" asChild>
          <Link to="/" aria-label="首页">
            <Sparkle className="h-4 w-4" />
          </Link>
        </Button>
      </nav>
      {/* 中间显示激活任务数量 */}
      <nav>
        <Button variant="ghost" asChild className="max-w-80 md:max-w-none">
          <Link to="/" className="flex animate-pulse items-center gap-2">
            {status === 'connecting' ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
            <span className="truncate">{`${message}`}</span>
          </Link>
        </Button>
      </nav>
      <ModeToggle />
    </header>
  )
}
