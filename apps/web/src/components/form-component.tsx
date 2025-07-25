import type { UIMessage } from 'ai'
import { useCallback, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'

import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

interface FormComponentProps {
  input: string
  placeholder?: string
  setInput: (input: string) => void
  handleSubmit: () => void
  messages?: Array<UIMessage>
  status?: 'submitted' | 'streaming' | 'ready' | 'error'
}

export const FormComponent: React.FC<FormComponentProps> = ({
  input,
  status,
  setInput,
  handleSubmit,
  placeholder,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const resizeTextarea = useCallback(() => {
    if (!inputRef.current) return

    const target = inputRef.current

    target.style.height = 'auto'

    const scrollHeight = target.scrollHeight
    const maxHeight = 300

    if (scrollHeight > maxHeight) {
      target.style.height = `${maxHeight}px`
      target.style.overflowY = 'auto'
    } else {
      target.style.height = `${scrollHeight}px`
      target.style.overflowY = 'hidden'
    }
  }, [inputRef])

  useEffect(() => {
    resizeTextarea()
  }, [input])
  return (
    <div className="bg-muted border-border focus-within:border-primary rounded-xl border transition-colors duration-200">
      <Textarea
        ref={inputRef}
        placeholder={placeholder}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
          }
        }}
        className="dark:bg-input/30 text-foreground scrollbar-hide flex touch-manipulation resize-none rounded-xl rounded-b-none border-none bg-transparent px-4 py-4 leading-relaxed shadow-none transition-[color,box-shadow] outline-none focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-base"
        rows={1}
      />
      <div className="flex items-center justify-end p-2">
        <Button
          onClick={handleSubmit}
          size="sm"
          className="h-7.5 w-7.5 cursor-pointer"
          disabled={!input.trim() || status !== 'ready'}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
