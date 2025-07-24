import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'

import { MarkdownRenderer } from '@/components/markdown'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/task-agent',
    }),
  })
  const [input, setInput] = useState('')

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <div className="mb-6 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`rounded-lg p-4 ${
              message.role === 'user'
                ? 'bg-primary/10 ml-8'
                : 'bg-muted/50 mr-8'
            }`}
          >
            <div className="text-muted-foreground mb-2 text-sm font-semibold">
              {message.role === 'user' ? '用户' : 'AI 助手'}
            </div>
            <div className="prose prose-sm max-w-none">
              {message.parts.map((part, index) =>
                part.type === 'text' ? (
                  message.role === 'assistant' ? (
                    <MarkdownRenderer key={index} content={part.text} />
                  ) : (
                    <div key={index} className="whitespace-pre-wrap">
                      {part.text}
                    </div>
                  )
                ) : null,
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={e => {
          e.preventDefault()
          if (input.trim()) {
            sendMessage({ text: input })
            setInput('')
          }
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={status !== 'ready'}
          placeholder="输入您的问题..."
          className="border-border focus:ring-primary/50 flex-1 rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
        />
        <button
          type="submit"
          disabled={status !== 'ready'}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'ready' ? '发送' : '发送中...'}
        </button>
      </form>
    </div>
  )
}
