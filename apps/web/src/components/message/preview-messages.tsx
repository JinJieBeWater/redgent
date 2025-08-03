import type { UseChatHelpers } from '@ai-sdk/react'
import type { AppMessage } from '@core/shared'
import { memo } from 'react'
import { cn } from '@web/lib/utils'
import { AlertCircle, Loader2, Sparkles } from 'lucide-react'

import { AssistantMessage } from './assistant-message'

interface PreviewMessagesProps {
  className?: string
  messages: AppMessage[]
  status?: UseChatHelpers<AppMessage>['status']
  setMessages: UseChatHelpers<AppMessage>['setMessages']
  sendMessage: UseChatHelpers<AppMessage>['sendMessage']
  addToolResult: UseChatHelpers<AppMessage>['addToolResult']
}

function ImplPreviewMessages({
  className,
  messages,
  status,
  setMessages,
  sendMessage,
  addToolResult,
}: PreviewMessagesProps) {
  return (
    <div className={cn('grid w-full grid-cols-1 gap-4', className)}>
      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          isLoading={status === 'streaming' && messages.length - 1 === index}
          isError={status === 'error' && messages.length - 1 === index}
          message={message}
          setMessages={setMessages}
          sendMessage={sendMessage}
          addToolResult={addToolResult}
        />
      ))}
    </div>
  )
}

export const PreviewMessages = memo(ImplPreviewMessages)

export const ImplPreviewMessage = ({
  message,
  isLoading,
  isError,
  setMessages,
  sendMessage,
  addToolResult,
}: {
  message: AppMessage
  isLoading: boolean
  isError: boolean
  setMessages: UseChatHelpers<AppMessage>['setMessages']
  sendMessage: UseChatHelpers<AppMessage>['sendMessage']
  addToolResult: UseChatHelpers<AppMessage>['addToolResult']
}) => {
  return (
    <div
      key={message.id}
      className={cn(
        'flex gap-4 rounded-lg py-2 text-sm',
        message.role === 'assistant'
          ? 'mr-4 justify-self-start'
          : 'bg-primary-foreground ml-12 justify-self-end px-2 outline',
      )}
    >
      {message.role === 'assistant' && (
        <div
          className={cn(
            'ring-border bg-background my-1 flex size-8 shrink-0 items-center justify-center rounded-full ring-1 transition-all duration-300',
            isLoading && 'ring-primary/50 bg-primary/10 animate-pulse',
            isError && 'ring-destructive/50 bg-destructive/10',
          )}
        >
          <div className="translate-y-px">
            {isLoading ? (
              <Loader2 className="text-primary h-4 w-4 animate-spin" />
            ) : isError ? (
              <AlertCircle className="text-destructive h-4 w-4" />
            ) : (
              <Sparkles className="text-foreground h-4 w-4" />
            )}
          </div>
        </div>
      )}

      <div>
        {message.role === 'assistant' ? (
          <AssistantMessage
            message={message}
            setMessages={setMessages}
            sendMessage={sendMessage}
            addToolResult={addToolResult}
          />
        ) : (
          <p>{message.parts[0].type === 'text' ? message.parts[0].text : ''}</p>
        )}
      </div>
    </div>
  )
}

const PreviewMessage = memo(ImplPreviewMessage)
