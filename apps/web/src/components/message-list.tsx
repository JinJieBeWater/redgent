import type { UIDataTypes, UIMessage } from 'ai'

import type { APPUITools } from '@redgent/types'

import { cn } from '@/lib/utils'

import { MessageAssistant } from './message-assistant'

interface MessagesListProps {
  messages: UIMessage<unknown, UIDataTypes, APPUITools>[]
  className?: string
  status?: 'submitted' | 'streaming' | 'ready' | 'error'
}

export function MessagesList({
  messages,
  status,
  className,
}: MessagesListProps) {
  return (
    <div className={cn('grid w-full grid-cols-1', className)}>
      {messages.map(message => (
        <div
          key={message.id}
          className={cn(
            'rounded-lg px-4 py-2 text-sm',
            message.role === 'assistant'
              ? 'justify-self-start'
              : 'bg-primary-foreground justify-self-end outline',
          )}
        >
          {message.parts.map((part, index) =>
            part.type === 'text' ? (
              message.role === 'assistant' ? (
                <MessageAssistant key={index} message={message} />
              ) : (
                <p>{part.text}</p>
              )
            ) : null,
          )}
        </div>
      ))}
      <MessageStatus status={status} />
    </div>
  )
}

export function MessageStatus({
  status,
}: {
  status?: 'submitted' | 'streaming' | 'ready' | 'error'
}) {
  switch (status) {
    case 'ready':
      return null
    case 'streaming':
      return null
    case 'submitted':
      // 添加适当的loading 效果
      return <p className="mr-8 px-4">正在处理请求...</p>
    case 'error':
      return <p className="mr-8 px-4">发生错误，请重试！</p>
  }
  return null
}
