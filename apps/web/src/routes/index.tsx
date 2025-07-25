import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'

import { FormComponent } from '@/components/form-component'
import { MessagesList } from '@/components/message-list'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/task-agent',
    }),
    onError: error => {
      console.log(error)
    },
  })

  const handleSubmit = () => {
    if (input.trim() && status == 'ready') {
      sendMessage({
        text: input.trim(),
      })
    }
  }

  return (
    <div
      className={cn(
        'container mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl items-center justify-center px-4',
        messages.length > 0 && 'items-start',
      )}
    >
      {/* 消息列表 */}
      {messages.length > 0 && (
        <div className="w-full py-4">
          <MessagesList messages={messages} />
        </div>
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
