import type { UIMessage } from 'ai'
import { useCallback, useEffect, useRef } from 'react'
import { Loader2, RotateCcw, Send, X } from 'lucide-react'

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
}

export const FormComponent: React.FC<FormComponentProps> = ({
  input,
  status,
  setInput,
  handleSubmit,
  placeholder,
  clearMessages,
  messages,
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
    <div className="bg-muted border-border focus-within:border-primary rounded-xl border transition-colors duration-200">
      <Textarea
        ref={inputRef}
        placeholder={placeholder}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        className="dark:bg-input/30 text-foreground scrollbar-hide mx-auto flex touch-manipulation resize-none rounded-xl rounded-b-none border-none bg-transparent px-4 py-4 leading-relaxed shadow-none outline-none transition-[color,box-shadow] focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-base"
        rows={1}
      />
      <div className="flex items-center justify-end gap-2 p-2">
        {showClearButton && (
          <Button
            onClick={clearMessages}
            size="sm"
            className="h-7.5"
            disabled={clearButtonDisabled}
          >
            <X className="h-3.5 w-3.5" />
            <span>clean messages</span>
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          size="sm"
          className="h-7.5 w-auto"
          disabled={!input.trim() || (status !== 'ready' && status !== 'error')}
        >
          {status === 'error' && (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="ml-1">重试</span>
            </>
          )}
          {status === 'ready' && (
            <>
              <Send className="h-3.5 w-3.5" />
              <span className="ml-1">发送</span>
            </>
          )}
          {status === 'submitted' && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="ml-1">提交中...</span>
            </>
          )}
          {status === 'streaming' && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="ml-1">生成中...</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
