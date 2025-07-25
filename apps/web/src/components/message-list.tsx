import type { UIDataTypes, UIMessage } from 'ai'

import type { APPUITools } from '@redgent/types'

import { cn } from '@/lib/utils'

import { MarkdownRenderer } from './markdown'
import { MessageAssistant } from './message-assistant'

interface MessagesListProps {
  messages: UIMessage<unknown, UIDataTypes, APPUITools>[]
  className?: string
}

export function MessagesList({ messages, className }: MessagesListProps) {
  return (
    <div className={cn('grid w-full grid-cols-1 space-y-4', className)}>
      {messages.map(message => (
        <div
          key={message.id}
          className={cn(
            'rounded-lg px-4 text-sm',
            message.role === 'user'
              ? 'bg-primary-foreground ml-8 justify-self-end outline'
              : 'mr-8 justify-self-start',
          )}
        >
          {message.parts.map((part, index) =>
            part.type === 'text' ? (
              message.role === 'assistant' ? (
                <MessageAssistant key={index} message={message} />
              ) : (
                <MarkdownRenderer key={index} content={part.text} />
              )
            ) : null,
          )}
        </div>
      ))}
    </div>
  )
}
