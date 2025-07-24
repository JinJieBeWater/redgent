import { createFileRoute } from '@tanstack/react-router'

// 定义搜索参数的类型
type SearchParams = {
  mode?: 'create-task' | 'general-chat'
  input?: string
}

export const Route = createFileRoute('/chat')({
  component: ChatPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      mode: (search.mode as SearchParams['mode']) || 'general-chat',
      input: (search.input as string) || '',
    }
  },
})

function ChatPage() {
  const { mode, input } = Route.useSearch()

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">聊天界面</h1>
      <div className="bg-muted mb-4 rounded-lg p-4">
        <p>
          <strong>模式:</strong> {mode}
        </p>
        {input && (
          <p>
            <strong>初始输入:</strong> {input}
          </p>
        )}
      </div>
      <div className="text-muted-foreground">
        {mode === 'create-task' ? '正在创建分析任务...' : '开始对话'}
      </div>
    </div>
  )
}
