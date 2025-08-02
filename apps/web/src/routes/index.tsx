import type { AppMessage } from '@core/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useChat } from '@ai-sdk/react'
import { FormComponent } from '@web/components/form-component'
import { PreviewMessages } from '@web/components/message/preview-messages'
import { Button } from '@web/components/ui/button'
import { ChatContextProvider } from '@web/contexts/chat-context'
import { useOptimizedScroll } from '@web/hooks/use-optimized-scroll'
import { cn } from '@web/lib/utils'
import { DefaultChatTransport, generateId } from 'ai'
import { FileText, List, Plus } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const [input, setInput] = useState('')
  const isSendAutomatically = useRef(false)
  const context = useChat<AppMessage>({
    transport: new DefaultChatTransport({
      api: '/api/task-agent',
    }),
    onError: err => {
      toast.error(`发生错误，请重试！${err.message ? err.message : ''}`)
    },
    sendAutomaticallyWhen: () => {
      return isSendAutomatically.current
    },
  })
  const { messages, sendMessage, status, setMessages: rawSetMessages } = context
  const setMessages = useCallback(
    (input: Parameters<typeof rawSetMessages>[0]) => {
      if (status !== 'ready') {
        toast.info('请等待当前对话完成')
      } else {
        rawSetMessages(input)
      }
    },
    [status, rawSetMessages],
  )

  /** 出现错误时重新提交 */
  const handleErrorSubmit = () => {
    const lastMessage = messages[messages.length - 1]
    if (
      lastMessage?.role === 'user' &&
      lastMessage?.parts[0]?.type === 'text'
    ) {
      // 如果用户有新的输入 则使用新的输入
      if (input.trim()) {
        sendMessage({
          text: input.trim(),
        })
      } else {
        // 使用上一条消息的输入 重新发送
        setMessages(messages.slice(0, -1))
        sendMessage({
          text: lastMessage?.parts[0]?.text.trim(),
        })
      }
    }
  }

  /** 处理提交按钮点击事件 */
  const handleSubmit = () => {
    if (input.trim() && (status == 'ready' || status == 'error')) {
      sendMessage({
        text: input.trim(),
      })
      setInput('')
    }
  }

  /** 清空消息列表 */
  const clearMessages = () => {
    setMessages([])
    setInput('')
  }

  /** 最后一条消息 */
  const lastMessage = messages[messages.length - 1]
  /** 最后一Part */
  const lastPart = lastMessage?.parts[lastMessage.parts.length - 1]

  /** 处理消息列表滚动 */
  const bottomRef = useRef<HTMLDivElement>(null)

  const { isAtBottom, scrollToElement, hasManuallyScrolled } =
    useOptimizedScroll(bottomRef, {
      enabled: true,
      threshold: 100,
      behavior: 'smooth',
      debounceMs: 100,
    })

  /** 处理消息列表滚动 */
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

  /** 处理点击客户端工具滚动 */
  useEffect(() => {
    if (!lastPart?.type) return
    if (
      lastPart.type === 'tool-ShowAllTaskUI' ||
      lastPart.type === 'tool-ShowTaskDetailUI' ||
      lastPart.type === 'tool-RequestUserConsent' ||
      lastPart.type.startsWith('tool-Show')
    ) {
      scrollToElement()
    }
  }, [scrollToElement, messages.length, lastPart?.type])

  /** 处理操作按钮 */
  const handleConsentButtonClick = useCallback(
    (consent: 'accept' | 'reject') => {
      if (
        lastMessage?.role === 'assistant' &&
        lastPart?.type === 'tool-RequestUserConsent' &&
        lastPart?.input?.message
      ) {
        setMessages([
          ...messages.slice(0, -1),
          {
            ...lastMessage,
            parts: [
              ...lastMessage.parts,
              {
                type: 'tool-RequestUserConsent',
                toolCallId: lastPart.toolCallId,
                state: 'output-available',
                input: {
                  message: lastPart.input.message,
                },
                output: {
                  consent,
                },
              },
            ],
          },
        ])
        sendMessage({
          text: consent === 'accept' ? '接受' : '拒绝',
        })
      }
    },
    [messages, lastMessage, lastPart, sendMessage, setMessages],
  )

  return (
    <ChatContextProvider
      value={{
        ...context,
        setMessages,
      }}
    >
      <div
        className={cn(
          'container mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl flex-col items-center justify-center px-4',
          messages.length > 0 && 'justify-start pt-4',
        )}
      >
        {/* 消息列表 */}
        {messages.length > 0 && (
          <>
            <PreviewMessages messages={messages} status={status} />
            {/* 滚动锚点 */}
            <div ref={bottomRef} className="h-48"></div>
          </>
        )}

        {/* 输入框容器 */}
        <div
          className={cn(
            'my-4 w-full',
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
            className="mt-6"
            input={input}
            placeholder="添加一个任务..."
            setInput={setInput}
            handleSubmit={() => {
              if (status === 'error') {
                handleErrorSubmit()
              } else {
                handleSubmit()
              }
            }}
            messages={messages}
            status={status}
            clearMessages={clearMessages}
          >
            {/* 建议输入 */}
            {messages.length <= 0 && (
              <div className="flex items-center gap-2">
                {[['创建任务']].map(([prompt], index) => {
                  return (
                    <Button
                      key={index}
                      variant={'outline'}
                      onClick={() =>
                        sendMessage({
                          text: prompt.trim(),
                        })
                      }
                      className="h-max gap-1 px-2 py-1 text-xs font-medium"
                      title={prompt}
                    >
                      <Plus className="h-3 w-3" />
                      <span className="hidden sm:block">{prompt}</span>
                    </Button>
                  )
                })}

                <Button
                  variant={'outline'}
                  onClick={() => {
                    setMessages([
                      {
                        id: generateId(),
                        role: 'user',
                        parts: [
                          {
                            type: 'text',
                            text: '查看任务',
                          },
                        ],
                      },
                      {
                        id: generateId(),
                        role: 'assistant',
                        parts: [
                          {
                            type: 'tool-ShowAllTaskUI',
                            toolCallId: generateId(),
                            state: 'input-available',
                            input: {},
                          },
                        ],
                      },
                    ])
                  }}
                  className="h-max gap-1 px-2 py-1 text-xs font-medium"
                  title="查看任务"
                >
                  <List className="h-3 w-3" />
                  <span className="hidden sm:block">查看任务</span>
                </Button>

                <Button
                  variant={'outline'}
                  onClick={() => {
                    setMessages([
                      {
                        id: generateId(),
                        role: 'user',
                        parts: [
                          {
                            type: 'text',
                            text: '最新报告',
                          },
                        ],
                      },
                      {
                        id: generateId(),
                        role: 'assistant',
                        parts: [
                          {
                            type: 'tool-ShowLatestReportUI',
                            toolCallId: generateId(),
                            state: 'input-available',
                            input: {},
                          },
                        ],
                      },
                    ])
                  }}
                  className="h-max gap-1 px-2 py-1 text-xs font-medium"
                  title="最新报告"
                >
                  <FileText className="h-3 w-3" />
                  <span className="hidden sm:block">最新报告</span>
                </Button>
              </div>
            )}
          </FormComponent>

          {/* 请求用户同意 */}
          {lastMessage?.role === 'assistant' &&
            lastPart?.type === 'tool-RequestUserConsent' &&
            lastPart.state === 'input-available' && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => {
                    handleConsentButtonClick('accept')
                  }}
                >
                  接受
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    handleConsentButtonClick('reject')
                  }}
                >
                  拒绝
                </Button>
              </div>
            )}
        </div>
      </div>
    </ChatContextProvider>
  )
}
