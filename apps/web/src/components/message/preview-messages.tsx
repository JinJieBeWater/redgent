import type { AppMessage } from '@core/shared'
import { cn } from '@web/lib/utils'
import { AlertCircle, Sparkles } from 'lucide-react'

import { Spinner } from '../spinner'
import { MessageAssistant } from './assistant-message'

interface PureMessagesProps {
  messages: AppMessage[]
  className?: string
  status?: 'submitted' | 'streaming' | 'ready' | 'error'
}

export function PureMessages({
  messages,
  status,
  className,
}: PureMessagesProps) {
  return (
    <div className={cn('grid w-full grid-cols-1', className)}>
      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          message={message}
          isLoading={status === 'streaming' && messages.length - 1 === index}
          isError={status === 'error' && messages.length - 1 === index}
        />
      ))}
    </div>
  )
}

export const PreviewMessage = ({
  message,
}: {
  message: AppMessage
  isLoading: boolean
  isError: boolean
}) => {
  return (
    <div
      key={message.id}
      className={cn(
        'flex gap-4 rounded-lg px-4 py-2 text-sm',
        message.role === 'assistant'
          ? 'justify-self-start'
          : 'bg-primary-foreground justify-self-end outline',
      )}
    >
      {message.role === 'assistant' && (
        <div className="ring-border bg-background my-1 flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
          <div className="translate-y-px">
            <Sparkles className="text-foreground h-4 w-4" />
          </div>
        </div>
      )}

      <div>
        {message.role === 'assistant' ? (
          <MessageAssistant message={message} />
        ) : (
          <p>{message.parts[0].type === 'text' ? message.parts[0].text : ''}</p>
        )}
      </div>
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
    case 'submitted':
      // 添加适当的loading 效果
      return (
        <div className="flex items-center gap-2">
          <Spinner />
          <p>已提交，开始处理...</p>
        </div>
      )
    case 'streaming':
      return (
        <div className="flex items-center gap-2">
          <Spinner />
          <p>处理中...</p>
        </div>
      )
    case 'error':
      return (
        <div className="flex items-center gap-2">
          <AlertCircle className="text-destructive h-4 w-4" />
          <p>处理请求时发生错误，请重试</p>
        </div>
      )
  }
  return null
}
