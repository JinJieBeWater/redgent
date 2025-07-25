import type { UIMessage } from 'ai'

import { cn } from '@/lib/utils'

import { MarkdownRenderer } from './markdown'

interface MessagesListProps {
  messages: UIMessage[]
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
                <MarkdownRenderer key={index} content={part.text} />
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
