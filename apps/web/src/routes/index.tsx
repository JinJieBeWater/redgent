import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { toast } from 'sonner'

import { FormComponent } from '@/components/form-component'
import { MessagesList } from '@/components/message-list'
import { useOptimizedScroll } from '@/hooks/use-optimized-scroll'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/task-agent',
    }),
    onError: () => {
      toast.error('发生错误，请重试！')
    },
  })

  useEffect(() => {
    if (status === 'error') {
      // 取出最后一条消息 如果是用户的输入 则重新赋值到 input 中 然后弹出这条消息
      const lastMessage = messages[messages.length - 1]
      if (
        lastMessage?.role === 'user' &&
        lastMessage?.parts[0]?.type === 'text'
      ) {
        setInput(lastMessage?.parts[0]?.text || '')
        // 清理掉导致错误的上一条消息
        setMessages(messages.slice(0, -1))
      }
    }
  }, [status, messages, setMessages])

  const handleSubmit = () => {
    if (input.trim() && (status == 'ready' || status == 'error')) {
      sendMessage({
        text: input.trim(),
      })
      setInput('')
    }
  }

  const clearMessages = () => {
    setMessages([])
  }

  const bottomRef = useRef<HTMLDivElement>(null)

  const { isAtBottom, scrollToElement, hasManuallyScrolled } =
    useOptimizedScroll(bottomRef, {
      enabled: true,
      threshold: 100,
      behavior: 'smooth',
      debounceMs: 100,
    })

  useEffect(() => {
    if (status === 'streaming' && (isAtBottom || !hasManuallyScrolled)) {
      scrollToElement()
    } else if (messages.length > 0 && (isAtBottom || !hasManuallyScrolled)) {
      scrollToElement()
    }
  }, [
    messages.length,
    status,
    isAtBottom,
    hasManuallyScrolled,
    scrollToElement,
  ])
  return (
    <div
      className={cn(
        'container mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl flex-col items-center justify-center px-4',
        messages.length > 0 && 'justify-start pb-64 pt-4',
      )}
    >
      {/* 消息列表 */}
      {messages.length > 0 && (
        <>
          <MessagesList messages={messages} />{' '}
          <div ref={bottomRef} className="h-64"></div>
        </>
      )}

      {/* 输入框容器 */}
      <div
        className={cn(
          'my-4 grid w-full gap-6',
          messages.length > 0 && 'fixed bottom-2 z-50 max-w-2xl px-4',
        )}
      >
        {/* Logo */}
        {messages.length === 0 && (
          <div className="text-center">
            <h1 className="text-foreground text-4xl">Redgent</h1>
          </div>
        )}
        {/* 输入框 */}

        <FormComponent
          input={input}
          placeholder="添加一个定时分析任务..."
          setInput={setInput}
          handleSubmit={handleSubmit}
          messages={messages}
          status={status}
          clearMessages={clearMessages}
        />
      </div>

      {/* 最新分析报告 - 简化显示 */}
      {/* <div className="space-y-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-foreground text-sm font-medium">最新分析报告</h2>

          <Button variant={'ghost'} size={'sm'} className="w-auto">
            查看全部
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {latestReports.map(report => (
            <div
              key={report.id}
              className="bg-card hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-lg border p-4 transition-all duration-150 active:scale-[0.98]"
              onClick={() => {
                console.log(`Navigate to report detail: ${report.id}`)
              }}
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex min-w-0 flex-1 items-start space-x-2">
                  <FileText className="text-muted-foreground mt-0.5 h-4 w-4 flex-shrink-0" />
                  <h3 className="text-foreground text-sm leading-tight font-medium">
                    {report.content.title}
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
                      }}
                    >
                      <Eye className="mr-2 h-3 w-3" />
                      查看详情
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="text-muted-foreground mb-3 line-clamp-2 text-xs leading-relaxed">
                {report.content.summary}
              </p>

              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <div className="flex items-center">
                  <Clock className="mr-1 h-3 w-3" />
                  <span>{formatRelativeTime(report.createdAt)}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {report.task.name}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div> */}
    </div>
  )
}
