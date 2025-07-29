import type { UIMessage } from 'ai'
import { useCallback, useEffect, useRef } from 'react'
import { cn } from '@web/lib/utils'
import { RotateCcw, Send, X } from 'lucide-react'

import { Spinner } from './spinner'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

interface FormComponentProps {
  input: string
  placeholder?: string
  setInput: (input: string) => void
  handleSubmit: () => void
  messages?: Array<UIMessage>
  status?: 'submitted' | 'streaming' | 'ready' | 'error'
  clearMessages?: () => void
  className?: string
}

export const FormComponent: React.FC<FormComponentProps> = ({
  input,
  status,
  setInput,
  handleSubmit,
  placeholder,
  clearMessages,
  messages,
  className,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const resizeTextarea = useCallback(() => {
    const target = inputRef.current
    if (!target) return

    target.style.height = 'auto'
    const scrollHeight = target.scrollHeight
    const maxHeight = 300

    target.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    target.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [])

  useEffect(() => {
    resizeTextarea()
  }, [input, resizeTextarea])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  // 清除消息按钮是否显示
  const showClearButton = clearMessages && messages?.length !== 0
  const clearButtonDisabled = status !== 'ready' && status !== 'error'
  return (
    <div
      className={cn(
        'bg-muted border-border focus-within:border-primary rounded-xl border transition-colors duration-200',
        className,
      )}
    >
      <Textarea
        ref={inputRef}
        placeholder={placeholder}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        className="dark:bg-input/30 text-foreground scrollbar-hide mx-auto flex touch-manipulation resize-none rounded-b-none border-none bg-transparent px-4 py-4 leading-relaxed shadow-none transition-[color,box-shadow] outline-none focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-base"
        rows={1}
      />
      <div className="flex items-center justify-end gap-2 p-2">
        {showClearButton && (
          <Button
            onClick={clearMessages}
            size="sm"
            disabled={clearButtonDisabled}
          >
            <X />
            <span>clean</span>
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          size="sm"
          className="h-7.5 w-auto"
          disabled={!input.trim() || (status !== 'ready' && status !== 'error')}
        >
          {status === 'error' && (
            <div className="flex items-center gap-2">
              <RotateCcw />
              <span>重试</span>
            </div>
          )}
          {status === 'ready' && (
            <div className="flex items-center gap-2">
              <Send />
              <span>Send</span>
            </div>
          )}
          {status === 'submitted' && (
            <>
              <Spinner />
            </>
          )}
          {status === 'streaming' && (
            <>
              <Spinner />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
