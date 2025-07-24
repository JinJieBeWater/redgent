import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')

  const handleSubmit = () => {
    if (input.trim()) {
      // 导航到聊天页面，携带输入参数
      navigate({
        to: '/chat',
        search: {
          mode: 'create-task',
          input: input.trim(),
        },
      })
    }
  }

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
    <div className="container mx-auto -mt-6 flex min-h-[calc(100vh-3rem)] max-w-2xl items-center justify-center p-4">
      <div className="w-full">
        {/* Logo */}
        <div className="mb-6 text-center">
          <h1 className="text-foreground text-4xl">Redgent</h1>
        </div>

        {/* 输入框 */}
        <div className="relative mb-6">
          <div className="bg-muted border-border focus-within:border-ring rounded-xl border transition-colors duration-200">
            <Textarea
              ref={inputRef}
              placeholder="添加一个定时分析任务"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              className="dark:bg-input/30 text-foreground scrollbar-hide flex touch-manipulation resize-none rounded-xl rounded-b-none border-none bg-transparent px-4 py-4 leading-relaxed shadow-none transition-[color,box-shadow] outline-none focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-lg"
              rows={1}
            />
            <div className="flex items-center justify-end p-2">
              <Button
                onClick={handleSubmit}
                size="sm"
                className="h-7.5 w-7.5 cursor-pointer"
                disabled={!input.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
