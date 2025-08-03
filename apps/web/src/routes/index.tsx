import type { AppMessage, AppToolUI, AppUIDataTypes } from '@core/shared'
import type { UIMessagePart } from 'ai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useChat } from '@ai-sdk/react'
import { FormComponent } from '@web/components/form-component'
import { PreviewMessages } from '@web/components/message/preview-messages'
import { Button } from '@web/components/ui/button'
import { useOptimizedScroll } from '@web/hooks/use-optimized-scroll'
import { cn } from '@web/lib/utils'
import { queryClient, trpc } from '@web/router'
import { DefaultChatTransport, generateId } from 'ai'
import { FileText, List, Plus } from 'lucide-react'
import { toast } from 'sonner'

type AppUIMessagePart = UIMessagePart<AppUIDataTypes, AppToolUI>

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const [input, setInput] = useState('')
  const isSendAutomatically = useRef(false)
  const {
    messages,
    sendMessage: rawSendMessage,
    status,
    setMessages: rawSetMessages,
    regenerate,
    addToolResult,
  } = useChat<AppMessage>({
    transport: new DefaultChatTransport({
      api: '/api/task-agent',
    }),
    onError: err => {
      toast.error(`发生错误，请重试！${err.message ? err.message : ''}`)
    },
    sendAutomaticallyWhen: () => {
      return isSendAutomatically.current
    },
    onFinish: async ({ message }) => {
      // 根据修改实时更新其他查询
      // ! 由于当前版本的 @trpc/tanstack-react-query 查询过滤器的predicate函数类型不安全，使用重新查询的方式
      // 后续类型安全后手动更新缓存即可避免额外请求
      const parts = message.parts
      let createTaskPart: Extract<
        AppUIMessagePart,
        { type: 'tool-CreateTask'; state: 'output-available' }
      > | null = null
      let updateTaskPart: Extract<
        AppUIMessagePart,
        { type: 'tool-UpdateTask'; state: 'output-available' }
      > | null = null
      let deleteTaskPart: Extract<
        AppUIMessagePart,
        { type: 'tool-DeleteTask'; state: 'output-available' }
      > | null = null
      for (const part of parts) {
        if (
          part.type === 'tool-CreateTask' &&
          part.state === 'output-available'
        ) {
          createTaskPart = part
        }
        if (
          part.type === 'tool-UpdateTask' &&
          part.state === 'output-available'
        ) {
          updateTaskPart = part
        }
        if (
          part.type === 'tool-DeleteTask' &&
          part.state === 'output-available'
        ) {
          deleteTaskPart = part
        }
      }
      if (createTaskPart) {
        queryClient.invalidateQueries(
          trpc.task.paginate.infiniteQueryFilter(
            {},
            {
              exact: false,
            },
          ),
        )
      }
      if (updateTaskPart) {
        queryClient.invalidateQueries(
          trpc.task.paginate.infiniteQueryFilter(
            {},
            {
              exact: false,
            },
          ),
        )
        queryClient.invalidateQueries(
          trpc.task.detail.queryFilter(
            {
              id: updateTaskPart.input.taskId,
            },
            {
              exact: false,
            },
          ),
        )
      }
      if (deleteTaskPart) {
        queryClient.invalidateQueries(
          trpc.task.paginate.infiniteQueryFilter(
            {},
            {
              exact: false,
            },
          ),
        )
        queryClient.invalidateQueries(
          trpc.task.detail.queryFilter(
            {
              id: deleteTaskPart.input.taskId,
            },
            {
              exact: false,
            },
          ),
        )
        queryClient.invalidateQueries(
          trpc.report.paginate.infiniteQueryFilter(
            {},
            {
              exact: false,
            },
          ),
        )
      }
    },
  })

  const isPending = useMemo(() => {
    return status === 'streaming' || status === 'submitted'
  }, [status])
  const sendMessage = useCallback<typeof rawSendMessage>(
    async (input, options) => {
      if (isPending) {
        toast.info('请等待当前对话完成')
      } else {
        rawSendMessage(input, options)
      }
    },
    [isPending, rawSendMessage],
  )

  const setMessages = useCallback(
    (input: Parameters<typeof rawSetMessages>[0]) => {
      if (isPending) {
        toast.info('请等待当前对话完成')
      } else {
        rawSetMessages(input)
      }
    },
    [isPending, rawSetMessages],
  )

  /** 最后一条消息 */
  const lastMessage = useMemo(() => {
    return messages[messages.length - 1]
  }, [messages])
  /** 最后一Part */
  const lastPart = useMemo(() => {
    return lastMessage?.parts[lastMessage.parts.length - 1]
  }, [lastMessage])

  /** 出现错误时重新提交 */
  const handleErrorSubmit = useCallback(() => {
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
    } else {
      regenerate()
    }
  }, [input, sendMessage, lastMessage, regenerate, messages, setMessages])

  /** 处理提交按钮点击事件 */
  const handleCommonSubmit = useCallback(() => {
    if (input.trim()) {
      sendMessage({
        text: input.trim(),
      })
      setInput('')
    }
  }, [input, sendMessage])

  const handleSubmit = useCallback(() => {
    if (status === 'error') {
      handleErrorSubmit()
    } else if (status == 'ready') {
      handleCommonSubmit()
    }
  }, [handleCommonSubmit, handleErrorSubmit, status])

  /** 清空消息列表 */
  const clearMessages = useCallback(() => {
    setMessages([])
    setInput('')
  }, [setMessages, setInput])

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

  /** 是否为用户同意请求状态 */
  const isConsentRequest = useMemo(
    () =>
      lastMessage?.role === 'assistant' &&
      lastPart?.type === 'tool-RequestUserConsent' &&
      lastPart?.input?.message &&
      lastPart?.state === 'input-available',
    [lastMessage?.role, lastPart],
  )

  /** 处理用户同意/拒绝按钮点击 */
  const handleConsentButtonClick = useCallback(
    (consent: 'accept' | 'reject') => {
      if (!isConsentRequest || lastPart.type !== 'tool-RequestUserConsent') {
        toast.error('无效的同意请求状态')
        return
      }

      addToolResult({
        tool: 'RequestUserConsent',
        toolCallId: lastPart.toolCallId,
        output: {
          consent,
        },
      })
      // 发送用户文本响应
      sendMessage({
        text: consent === 'accept' ? '接受' : '拒绝',
      })
    },
    [isConsentRequest, lastPart, sendMessage, addToolResult],
  )

  return (
    <div
      className={cn(
        'container mx-auto flex min-h-[calc(100vh-3rem)] max-w-2xl flex-col items-center justify-center px-4',
        messages.length > 0 && 'justify-start pt-4',
      )}
    >
      {/* 消息列表 */}
      {messages.length > 0 && (
        <>
          <PreviewMessages
            messages={messages}
            status={status}
            setMessages={setMessages}
            sendMessage={sendMessage}
            addToolResult={addToolResult}
          />
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
          {
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
                    ...messages,
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
                    ...messages,
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
          }
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
  )
}
